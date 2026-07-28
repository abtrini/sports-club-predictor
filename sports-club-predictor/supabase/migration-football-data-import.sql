-- Run this once in Supabase SQL Editor before deploying the fixture-import code.
-- It adds football-data.org identifiers and team crest fields to existing fixtures.

alter table public.fixtures
  add column if not exists data_source text not null default 'manual',
  add column if not exists external_fixture_id text,
  add column if not exists competition_code text,
  add column if not exists home_team_crest text,
  add column if not exists away_team_crest text,
  add column if not exists external_status text,
  add column if not exists source_updated_at timestamptz;

create unique index if not exists fixtures_data_source_external_id_unique
  on public.fixtures (data_source, external_fixture_id);

create index if not exists fixtures_competition_code_idx
  on public.fixtures (competition_code);

comment on column public.fixtures.data_source is
  'manual or football-data';

comment on column public.fixtures.external_fixture_id is
  'Provider match ID used to prevent duplicate imports';
