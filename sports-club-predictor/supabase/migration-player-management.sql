-- Player-management helpers for the Sports Club Predictor.
-- Run this once in Supabase SQL Editor after the existing schema.

begin;

create or replace function public.admin_update_participant(
  target_id uuid,
  new_name text,
  new_short_name text,
  new_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  normalized_short_name text;
  linked_user_id uuid;
  was_active boolean;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  normalized_name := regexp_replace(trim(coalesce(new_name, '')), '\s+', ' ', 'g');
  normalized_short_name := nullif(upper(trim(coalesce(new_short_name, ''))), '');

  if char_length(normalized_name) < 2 then
    raise exception 'Participant name must contain at least two characters.';
  end if;

  if normalized_short_name is not null and char_length(normalized_short_name) > 4 then
    raise exception 'Short name cannot contain more than four characters.';
  end if;

  select user_id, active
    into linked_user_id, was_active
  from public.participants
  where id = target_id
  for update;

  if not found then
    raise exception 'Participant not found.';
  end if;

  if new_active and not was_active then
    if (
      select count(*)
      from public.participants
      where active = true and id <> target_id
    ) >= 20 then
      raise exception 'The league already has 20 active participants.';
    end if;
  end if;

  update public.participants
  set
    name = normalized_name,
    short_name = normalized_short_name,
    active = new_active
  where id = target_id;

  -- Keep the name shown in the signed-in header consistent for linked users.
  if linked_user_id is not null then
    update public.profiles
    set full_name = normalized_name
    where id = linked_user_id;
  end if;
end;
$$;

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
  prediction_count integer;
  score_event_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  if trim(coalesce(confirmation_text, '')) <> 'DELETE' then
    raise exception 'Type DELETE exactly to confirm permanent deletion.';
  end if;

  select name
    into participant_name
  from public.participants
  where id = target_id
  for update;

  if not found then
    raise exception 'Participant not found.';
  end if;

  select count(*) into prediction_count
  from public.predictions
  where participant_id = target_id;

  select count(*) into score_event_count
  from public.score_events
  where participant_id = target_id;

  -- Foreign keys remove the participant's predictions and score events.
  -- The linked auth.users account is retained because participants.user_id
  -- uses ON DELETE SET NULL from auth.users, not the reverse relationship.
  delete from public.participants
  where id = target_id;

  return jsonb_build_object(
    'name', participant_name,
    'predictions_deleted', prediction_count,
    'score_events_deleted', score_event_count
  );
end;
$$;

revoke all on function public.admin_update_participant(uuid, text, text, boolean) from public;
revoke all on function public.admin_delete_participant(uuid, text) from public;

grant execute on function public.admin_update_participant(uuid, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_participant(uuid, text) to authenticated;

commit;
