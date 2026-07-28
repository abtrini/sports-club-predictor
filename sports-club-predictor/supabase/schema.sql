-- Sports Club Predictor database schema
-- Run this entire file in the Supabase SQL Editor for a new project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null unique,
  short_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  competition text not null,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  entry_deadline timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed', 'completed')),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  data_source text not null default 'manual',
  external_fixture_id text,
  competition_code text,
  home_team_crest text,
  away_team_crest text,
  external_status text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cutoff_before_kickoff check (entry_deadline < kickoff)
);

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

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete set null,
  event_type text not null check (event_type in ('exact_score', 'correct_outcome', 'winner_only', 'manual_adjustment')),
  points integer not null check (points between -10 and 10),
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.rules (
  id integer primary key default 1 check (id = 1),
  exact_score_points integer not null default 3,
  correct_outcome_points integer not null default 1,
  winner_only_points integer not null default 1,
  penalty_mode text not null default 'pending' check (penalty_mode in ('pending', 'ninety_minutes', 'after_extra_time', 'after_penalties')),
  entry_notes text not null default 'Predictions may be entered or changed until 15 minutes before kickoff. The database locks entries automatically at the cutoff.',
  updated_at timestamptz not null default now()
);

insert into public.rules (id) values (1) on conflict (id) do nothing;

create index if not exists participants_user_id_idx on public.participants(user_id);
create index if not exists predictions_participant_id_idx on public.predictions(participant_id);
create index if not exists predictions_fixture_id_idx on public.predictions(fixture_id);
create index if not exists score_events_participant_id_idx on public.score_events(participant_id);
create index if not exists score_events_fixture_id_idx on public.score_events(fixture_id);
create unique index if not exists one_score_per_participant_fixture_idx
  on public.score_events(participant_id, fixture_id)
  where fixture_id is not null and event_type <> 'manual_adjustment';
create index if not exists fixtures_kickoff_idx on public.fixtures(kickoff);
create unique index if not exists fixtures_data_source_external_id_unique
  on public.fixtures(data_source, external_fixture_id);
create index if not exists fixtures_competition_code_idx on public.fixtures(competition_code);

-- A security-definer helper avoids recursive RLS checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

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

-- The cutoff is always exactly 15 minutes before kickoff.
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

create or replace function public.can_submit_prediction(target_fixture_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.fixtures
    where id = target_fixture_id
      and status in ('scheduled', 'open')
      and now() < entry_deadline
  );
$$;

-- New player registrations create a profile and link to a pre-added participant
-- with the same name, or create a new participant if fewer than 20 are active.
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

revoke all on function public.is_admin() from public;
revoke all on function public.current_participant_id() from public;
revoke all on function public.can_submit_prediction(uuid) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_participant_id() to authenticated;
grant execute on function public.can_submit_prediction(uuid) to authenticated;

revoke all on public.participants from anon, authenticated;
grant select (id, name, short_name, active, created_at) on public.participants to anon, authenticated;
grant select on public.fixtures, public.score_events, public.rules to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.predictions to authenticated;
grant insert, update, delete on public.participants, public.fixtures, public.score_events to authenticated;
grant insert, update on public.rules to authenticated;

alter table public.profiles enable row level security;
alter table public.participants enable row level security;
alter table public.fixtures enable row level security;
alter table public.predictions enable row level security;
alter table public.score_events enable row level security;
alter table public.rules enable row level security;

-- Public read access for standings, fixtures and rules.
create policy "Public can view participants" on public.participants for select to anon, authenticated using (true);
create policy "Public can view fixtures" on public.fixtures for select to anon, authenticated using (true);
create policy "Public can view score events" on public.score_events for select to anon, authenticated using (true);
create policy "Public can view rules" on public.rules for select to anon, authenticated using (true);

-- Signed-in users can view their own profile; admins can view all profiles.
create policy "Users can view own profile" on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select public.is_admin()));

-- A player sees only their predictions. Admins can inspect all predictions.
create policy "Players view own predictions" on public.predictions for select to authenticated
using (participant_id = (select public.current_participant_id()) or (select public.is_admin()));

create policy "Players insert predictions before cutoff" on public.predictions for insert to authenticated
with check (
  (
    participant_id = (select public.current_participant_id())
    and (select public.can_submit_prediction(fixture_id))
  )
  or (select public.is_admin())
);

create policy "Players update predictions before cutoff" on public.predictions for update to authenticated
using (
  (
    participant_id = (select public.current_participant_id())
    and (select public.can_submit_prediction(fixture_id))
  )
  or (select public.is_admin())
)
with check (
  (
    participant_id = (select public.current_participant_id())
    and (select public.can_submit_prediction(fixture_id))
  )
  or (select public.is_admin())
);

create policy "Players delete predictions before cutoff" on public.predictions for delete to authenticated
using (
  (
    participant_id = (select public.current_participant_id())
    and (select public.can_submit_prediction(fixture_id))
  )
  or (select public.is_admin())
);

-- Admin-only management access.
create policy "Admins insert participants" on public.participants for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update participants" on public.participants for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete participants" on public.participants for delete to authenticated using ((select public.is_admin()));

create policy "Admins insert fixtures" on public.fixtures for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update fixtures" on public.fixtures for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete fixtures" on public.fixtures for delete to authenticated using ((select public.is_admin()));

create policy "Admins insert score events" on public.score_events for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update score events" on public.score_events for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete score events" on public.score_events for delete to authenticated using ((select public.is_admin()));

create policy "Admins update rules" on public.rules for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins insert rules" on public.rules for insert to authenticated with check ((select public.is_admin()));

-- Create the first administrator in Supabase Authentication without using
-- the public registration form. Then replace the UUID and run:
-- insert into public.profiles (id, full_name, role)
-- values ('YOUR-AUTH-USER-UUID', 'Club Administrator', 'admin')
-- on conflict (id) do update set full_name = excluded.full_name, role = 'admin';
