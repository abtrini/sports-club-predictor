-- Upgrade an existing Sports Club Predictor database.
-- Run once in the Supabase SQL Editor if the original schema was already installed.

alter table public.participants
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  predicted_home_score integer not null check (predicted_home_score between 0 and 30),
  predicted_away_score integer not null check (predicted_away_score between 0 and 30),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, fixture_id)
);

create index if not exists participants_user_id_idx on public.participants(user_id);
create index if not exists predictions_participant_id_idx on public.predictions(participant_id);
create index if not exists predictions_fixture_id_idx on public.predictions(fixture_id);

create or replace function public.current_participant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.participants
  where user_id = (select auth.uid()) and active = true
  limit 1;
$$;

create or replace function public.set_fixture_entry_deadline()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.entry_deadline := new.kickoff - interval '15 minutes';
  return new;
end;
$$;

drop trigger if exists set_fixture_entry_deadline_trigger on public.fixtures;
create trigger set_fixture_entry_deadline_trigger
before insert or update of kickoff on public.fixtures
for each row execute function public.set_fixture_entry_deadline();

update public.fixtures
set entry_deadline = kickoff - interval '15 minutes';

create or replace function public.can_submit_prediction(target_fixture_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fixtures
    where id = target_fixture_id
      and status in ('scheduled', 'open')
      and now() < entry_deadline
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  register_as_player boolean;
begin
  display_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if display_name = '' then
    display_name := split_part(coalesce(new.email, 'Club member'), '@', 1);
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, display_name, 'member')
  on conflict (id) do update set full_name = excluded.full_name;

  register_as_player := coalesce((new.raw_user_meta_data ->> 'register_as_player')::boolean, false);

  if register_as_player then
    update public.participants
      set user_id = new.id
      where user_id is null and lower(name) = lower(display_name);

    if not found then
      if (select count(*) from public.participants where active = true) >= 20 then
        raise exception 'The prediction league already has 20 active participants.';
      end if;

      insert into public.participants (user_id, name, short_name)
      values (
        new.id,
        display_name,
        upper(left(regexp_replace(display_name, '[^A-Za-z0-9]', '', 'g'), 4))
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke all on function public.current_participant_id() from public;
revoke all on function public.can_submit_prediction(uuid) from public;
grant execute on function public.current_participant_id() to authenticated;
grant execute on function public.can_submit_prediction(uuid) to authenticated;

revoke all on public.participants from anon, authenticated;
grant select (id, name, short_name, active, created_at) on public.participants to anon, authenticated;
grant insert, update, delete on public.participants to authenticated;

grant select, insert, update, delete on public.predictions to authenticated;
alter table public.predictions enable row level security;

drop policy if exists "Players view own predictions" on public.predictions;
drop policy if exists "Players insert predictions before cutoff" on public.predictions;
drop policy if exists "Players update predictions before cutoff" on public.predictions;
drop policy if exists "Players delete predictions before cutoff" on public.predictions;

create policy "Players view own predictions" on public.predictions for select to authenticated
using (participant_id = (select public.current_participant_id()) or (select public.is_admin()));

create policy "Players insert predictions before cutoff" on public.predictions for insert to authenticated
with check (
  (participant_id = (select public.current_participant_id()) and (select public.can_submit_prediction(fixture_id)))
  or (select public.is_admin())
);

create policy "Players update predictions before cutoff" on public.predictions for update to authenticated
using (
  (participant_id = (select public.current_participant_id()) and (select public.can_submit_prediction(fixture_id)))
  or (select public.is_admin())
)
with check (
  (participant_id = (select public.current_participant_id()) and (select public.can_submit_prediction(fixture_id)))
  or (select public.is_admin())
);

create policy "Players delete predictions before cutoff" on public.predictions for delete to authenticated
using (
  (participant_id = (select public.current_participant_id()) and (select public.can_submit_prediction(fixture_id)))
  or (select public.is_admin())
);

update public.rules
set entry_notes = 'Predictions may be entered or changed until 15 minutes before kickoff. The database locks entries automatically at the cutoff.',
    updated_at = now()
where id = 1;
