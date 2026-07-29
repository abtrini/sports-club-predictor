-- Automatic result syncing and points calculation
-- Run once in Supabase SQL Editor after the earlier schema/migrations.

begin;

alter table public.fixtures
  add column if not exists result_basis text,
  add column if not exists result_synced_at timestamptz,
  add column if not exists points_calculated_at timestamptz;

-- A zero-point event is stored for wrong predictions so the public standings can
-- count games played without exposing private prediction scores.
alter table public.score_events
  drop constraint if exists score_events_event_type_check;

alter table public.score_events
  add constraint score_events_event_type_check
  check (event_type in (
    'exact_score',
    'correct_outcome',
    'winner_only',
    'no_points',
    'manual_adjustment'
  ));

-- Keep one automatic scoring event per player/fixture. Multiple general manual
-- adjustments are still allowed because PostgreSQL treats NULL fixture ids as distinct.
drop index if exists public.one_score_per_participant_fixture_idx;
drop index if exists public.one_scoring_event_per_participant_fixture_idx;

-- Remove accidental duplicate automatic entries before creating the new index.
with ranked as (
  select
    id,
    row_number() over (
      partition by participant_id, fixture_id
      order by created_at desc, id desc
    ) as row_number
  from public.score_events
  where fixture_id is not null
    and event_type <> 'manual_adjustment'
)
delete from public.score_events event
using ranked
where event.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists one_scoring_event_per_participant_fixture_idx
  on public.score_events(participant_id, fixture_id)
  where fixture_id is not null and event_type <> 'manual_adjustment';

create or replace function public.calculate_fixture_points(target_fixture_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  fixture_result public.fixtures%rowtype;
  scoring_rules public.rules%rowtype;
  inserted_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  select *
  into fixture_result
  from public.fixtures
  where id = target_fixture_id;

  if not found then
    raise exception 'Fixture not found.';
  end if;

  if fixture_result.status <> 'completed'
     or fixture_result.home_score is null
     or fixture_result.away_score is null then
    raise exception 'The fixture must be completed with both scores before points are calculated.';
  end if;

  select *
  into scoring_rules
  from public.rules
  where id = 1;

  -- Recalculation is idempotent: remove old automatic scoring entries first.
  delete from public.score_events
  where fixture_id = target_fixture_id
    and event_type <> 'manual_adjustment';

  insert into public.score_events (
    participant_id,
    fixture_id,
    event_type,
    points,
    reason
  )
  select
    prediction.participant_id,
    target_fixture_id,
    case
      when prediction.predicted_home_score = fixture_result.home_score
       and prediction.predicted_away_score = fixture_result.away_score
        then 'exact_score'
      when sign(prediction.predicted_home_score - prediction.predicted_away_score)
         = sign(fixture_result.home_score - fixture_result.away_score)
        then 'correct_outcome'
      else 'no_points'
    end,
    case
      when prediction.predicted_home_score = fixture_result.home_score
       and prediction.predicted_away_score = fixture_result.away_score
        then scoring_rules.exact_score_points
      when sign(prediction.predicted_home_score - prediction.predicted_away_score)
         = sign(fixture_result.home_score - fixture_result.away_score)
        then scoring_rules.correct_outcome_points
      else 0
    end,
    case
      when prediction.predicted_home_score = fixture_result.home_score
       and prediction.predicted_away_score = fixture_result.away_score
        then format(
          'Automatic exact score: predicted %s-%s, result %s-%s',
          prediction.predicted_home_score,
          prediction.predicted_away_score,
          fixture_result.home_score,
          fixture_result.away_score
        )
      when sign(prediction.predicted_home_score - prediction.predicted_away_score)
         = sign(fixture_result.home_score - fixture_result.away_score)
        then format(
          'Automatic correct outcome: predicted %s-%s, result %s-%s',
          prediction.predicted_home_score,
          prediction.predicted_away_score,
          fixture_result.home_score,
          fixture_result.away_score
        )
      else format(
        'Automatic no points: predicted %s-%s, result %s-%s',
        prediction.predicted_home_score,
        prediction.predicted_away_score,
        fixture_result.home_score,
        fixture_result.away_score
      )
    end
  from public.predictions prediction
  where prediction.fixture_id = target_fixture_id;

  get diagnostics inserted_count = row_count;

  update public.fixtures
  set points_calculated_at = now()
  where id = target_fixture_id;

  return inserted_count;
end;
$$;

create or replace function public.clear_fixture_points(target_fixture_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  delete from public.score_events
  where fixture_id = target_fixture_id
    and event_type <> 'manual_adjustment';

  update public.fixtures
  set points_calculated_at = null
  where id = target_fixture_id;
end;
$$;

create or replace function public.recalculate_all_completed_fixtures()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  fixture_record record;
  fixture_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  for fixture_record in
    select id
    from public.fixtures
    where status = 'completed'
      and home_score is not null
      and away_score is not null
  loop
    perform public.calculate_fixture_points(fixture_record.id);
    fixture_count := fixture_count + 1;
  end loop;

  return fixture_count;
end;
$$;

revoke all on function public.calculate_fixture_points(uuid) from public;
revoke all on function public.clear_fixture_points(uuid) from public;
revoke all on function public.recalculate_all_completed_fixtures() from public;

grant execute on function public.calculate_fixture_points(uuid) to authenticated, service_role;
grant execute on function public.clear_fixture_points(uuid) to authenticated, service_role;
grant execute on function public.recalculate_all_completed_fixtures() to authenticated, service_role;

commit;

-- Verification
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'fixtures'
  and column_name in ('result_basis', 'result_synced_at', 'points_calculated_at')
order by column_name;
