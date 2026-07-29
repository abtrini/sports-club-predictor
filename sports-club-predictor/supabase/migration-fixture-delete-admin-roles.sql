-- Fixture deletion and participant administrator-role management.
-- Run once in the Supabase SQL Editor after the existing schema and player-management migration.

begin;

create or replace function public.admin_delete_fixture(
  target_fixture_id uuid,
  confirmation_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fixture_home_team text;
  fixture_away_team text;
  fixture_source text;
  prediction_count integer := 0;
  score_event_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  if trim(coalesce(confirmation_text, '')) <> 'DELETE' then
    raise exception 'Type DELETE exactly to confirm fixture deletion.';
  end if;

  select home_team, away_team, data_source
    into fixture_home_team, fixture_away_team, fixture_source
  from public.fixtures
  where id = target_fixture_id
  for update;

  if not found then
    raise exception 'Fixture not found.';
  end if;

  select count(*)
    into prediction_count
  from public.predictions
  where fixture_id = target_fixture_id;

  select count(*)
    into score_event_count
  from public.score_events
  where fixture_id = target_fixture_id;

  -- score_events.fixture_id uses ON DELETE SET NULL in the original schema.
  -- Delete attached records first so removed fixtures cannot leave points behind.
  delete from public.score_events
  where fixture_id = target_fixture_id;

  -- Predictions are removed automatically through ON DELETE CASCADE.
  delete from public.fixtures
  where id = target_fixture_id;

  return jsonb_build_object(
    'home_team', fixture_home_team,
    'away_team', fixture_away_team,
    'data_source', fixture_source,
    'predictions_deleted', prediction_count,
    'score_events_deleted', score_event_count
  );
end;
$$;

create or replace function public.admin_set_participant_role(
  target_participant_id uuid,
  new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_name text;
  linked_user_id uuid;
  previous_role text;
  administrator_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  if new_role not in ('member', 'admin') then
    raise exception 'Role must be member or admin.';
  end if;

  select name, user_id
    into participant_name, linked_user_id
  from public.participants
  where id = target_participant_id
  for update;

  if not found then
    raise exception 'Participant not found.';
  end if;

  if linked_user_id is null then
    raise exception 'This player must register before administrator rights can be assigned.';
  end if;

  select role
    into previous_role
  from public.profiles
  where id = linked_user_id
  for update;

  if not found then
    raise exception 'The linked player profile was not found.';
  end if;

  if previous_role = 'admin' and new_role = 'member' then
    if linked_user_id = auth.uid() then
      raise exception 'You cannot remove your own administrator access.';
    end if;

    select count(*)
      into administrator_count
    from public.profiles
    where role = 'admin';

    if administrator_count <= 1 then
      raise exception 'The final administrator account cannot be removed.';
    end if;
  end if;

  update public.profiles
  set role = new_role
  where id = linked_user_id;

  return jsonb_build_object(
    'name', participant_name,
    'user_id', linked_user_id,
    'previous_role', previous_role,
    'new_role', new_role
  );
end;
$$;

-- Enforce the "admins cannot delete admins" rule at database level, even if
-- a delete is attempted outside the supplied server action.
create or replace function public.prevent_admin_participant_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is not null and exists (
    select 1
    from public.profiles
    where id = old.user_id
      and role = 'admin'
  ) then
    raise exception 'Administrators cannot be deleted while admin rights are active.';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_admin_participant_deletion
on public.participants;

create trigger protect_admin_participant_deletion
before delete on public.participants
for each row
execute function public.prevent_admin_participant_deletion();

-- Replace the existing player-deletion helper so it also performs an explicit
-- role check and returns a clear error before attempting the delete.
create or replace function public.admin_delete_participant(
  target_id uuid,
  confirmation_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_name text;
  linked_user_id uuid;
  prediction_count integer;
  score_event_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  if trim(coalesce(confirmation_text, '')) <> 'DELETE' then
    raise exception 'Type DELETE exactly to confirm permanent deletion.';
  end if;

  select name, user_id
    into participant_name, linked_user_id
  from public.participants
  where id = target_id
  for update;

  if not found then
    raise exception 'Participant not found.';
  end if;

  if linked_user_id is not null and exists (
    select 1
    from public.profiles
    where id = linked_user_id
      and role = 'admin'
  ) then
    raise exception 'Administrators cannot be deleted while admin rights are active.';
  end if;

  select count(*) into prediction_count
  from public.predictions
  where participant_id = target_id;

  select count(*) into score_event_count
  from public.score_events
  where participant_id = target_id;

  delete from public.participants
  where id = target_id;

  return jsonb_build_object(
    'name', participant_name,
    'predictions_deleted', prediction_count,
    'score_events_deleted', score_event_count
  );
end;
$$;

revoke all on function public.admin_delete_fixture(uuid, text) from public;
revoke all on function public.admin_set_participant_role(uuid, text) from public;
revoke all on function public.prevent_admin_participant_deletion() from public;
revoke all on function public.admin_delete_participant(uuid, text) from public;

grant execute on function public.admin_delete_fixture(uuid, text) to authenticated;
grant execute on function public.admin_set_participant_role(uuid, text) to authenticated;
grant execute on function public.admin_delete_participant(uuid, text) to authenticated;

commit;

-- Verification
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'admin_delete_fixture',
    'admin_set_participant_role',
    'prevent_admin_participant_deletion',
    'admin_delete_participant'
  )
order by routine_name;
