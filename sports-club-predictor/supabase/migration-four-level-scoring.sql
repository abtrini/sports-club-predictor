begin;

-- New configurable scoring values.
alter table public.rules
  add column if not exists correct_winner_points integer not null default 2,
  add column if not exists correct_draw_points integer not null default 1,
  add column if not exists one_team_score_points integer not null default 1;

update public.rules
set
  exact_score_points = 3,
  correct_winner_points = 2,
  correct_draw_points = 1,
  one_team_score_points = 1
where id = 1;

-- Permit the new scoring event types.
alter table public.score_events
  drop constraint if exists score_events_event_type_check;

alter table public.score_events
  add constraint score_events_event_type_check
  check (
    event_type in (
      'exact_score',
      'correct_winner',
      'correct_draw',
      'one_team_score',
      'correct_outcome',
      'winner_only',
      'no_points',
      'manual_adjustment'
    )
  );

-- Remove old orphan records left by previously deleted fixtures.
delete from public.score_events event
where event.fixture_id is not null
  and not exists (
    select 1
    from public.fixtures fixture
    where fixture.id = event.fixture_id
  );

delete from public.predictions prediction
where not exists (
  select 1
  from public.fixtures fixture
  where fixture.id = prediction.fixture_id
);

-- Deleting a fixture should also delete its predictions and automatic points.
alter table public.score_events
  drop constraint if exists score_events_fixture_id_fkey;

alter table public.score_events
  add constraint score_events_fixture_id_fkey
  foreign key (fixture_id)
  references public.fixtures(id)
  on delete cascade;

alter table public.predictions
  drop constraint if exists predictions_fixture_id_fkey;

alter table public.predictions
  add constraint predictions_fixture_id_fkey
  foreign key (fixture_id)
  references public.fixtures(id)
  on delete cascade;

create or replace function public.calculate_fixture_points(
  target_fixture_id uuid
)
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
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
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
    raise exception
      'The fixture must be completed with both scores before points are calculated.';
  end if;

  select *
  into scoring_rules
  from public.rules
  where id = 1;

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
      -- Exact score always receives the highest award.
      when prediction.predicted_home_score = fixture_result.home_score
       and prediction.predicted_away_score = fixture_result.away_score
        then 'exact_score'

      -- Correct winner, excluding draws.
      when fixture_result.home_score <> fixture_result.away_score
       and sign(
         prediction.predicted_home_score -
         prediction.predicted_away_score
       ) = sign(
         fixture_result.home_score -
         fixture_result.away_score
       )
        then 'correct_winner'

      -- Correctly predicted a draw, but not the exact draw score.
      when fixture_result.home_score = fixture_result.away_score
       and prediction.predicted_home_score =
           prediction.predicted_away_score
        then 'correct_draw'

      -- At least one team score was guessed exactly.
      when prediction.predicted_home_score = fixture_result.home_score
        or prediction.predicted_away_score = fixture_result.away_score
        then 'one_team_score'

      else 'no_points'
    end,

    case
      when prediction.predicted_home_score = fixture_result.home_score
       and prediction.predicted_away_score = fixture_result.away_score
        then scoring_rules.exact_score_points

      when fixture_result.home_score <> fixture_result.away_score
       and sign(
         prediction.predicted_home_score -
         prediction.predicted_away_score
       ) = sign(
         fixture_result.home_score -
         fixture_result.away_score
       )
        then scoring_rules.correct_winner_points

      when fixture_result.home_score = fixture_result.away_score
       and prediction.predicted_home_score =
           prediction.predicted_away_score
        then scoring_rules.correct_draw_points

      when prediction.predicted_home_score = fixture_result.home_score
        or prediction.predicted_away_score = fixture_result.away_score
        then scoring_rules.one_team_score_points

      else 0
    end,

    case
      when prediction.predicted_home_score = fixture_result.home_score
       and prediction.predicted_away_score = fixture_result.away_score
        then 'Exact score predicted'

      when fixture_result.home_score <> fixture_result.away_score
       and sign(
         prediction.predicted_home_score -
         prediction.predicted_away_score
       ) = sign(
         fixture_result.home_score -
         fixture_result.away_score
       )
        then 'Correct winning team predicted'

      when fixture_result.home_score = fixture_result.away_score
       and prediction.predicted_home_score =
           prediction.predicted_away_score
        then 'Correctly predicted a draw'

      when prediction.predicted_home_score = fixture_result.home_score
        or prediction.predicted_away_score = fixture_result.away_score
        then 'One team score predicted correctly'

      else 'Prediction did not match a scoring condition'
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
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
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

revoke all
on function public.calculate_fixture_points(uuid)
from public;

revoke all
on function public.recalculate_all_completed_fixtures()
from public;

grant execute
on function public.calculate_fixture_points(uuid)
to authenticated, service_role;

grant execute
on function public.recalculate_all_completed_fixtures()
to authenticated, service_role;

commit;