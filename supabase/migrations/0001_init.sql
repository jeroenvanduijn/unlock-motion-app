-- Unlock Motion V1 schema.
-- Modellen: profiles, exercises (master library), homework_assignments + items,
-- exercise_completions, checkins, evaluation_slots/bookings/evaluations/media,
-- push_subscriptions, audit_log.

set search_path = public;

-- ============================================================
-- Enums
-- ============================================================
create type unlock_role        as enum ('coach', 'member');
create type unlock_protocol    as enum ('frontline', 'backline', 'rotation', 'lateral', 'recovery');
create type checkin_cadence    as enum ('daily', 'weekly');

-- ============================================================
-- profiles — 1-1 met auth.users
-- ============================================================
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  unlock_role not null default 'member',
  full_name             text,
  phone                 text,
  checkin_cadence       checkin_cadence not null default 'weekly',
  program_start_date    date,
  program_end_date      date,
  sportbit_member_id    text unique,
  created_at            timestamptz not null default now()
);

create or replace function is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'coach')
$$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role) values (new.id, 'member')
  on conflict (id) do nothing;
  return new;
end$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- exercises — master library; coach beheert
-- ============================================================
create table exercises (
  id                    uuid primary key default gen_random_uuid(),
  protocol              unlock_protocol not null,
  hierarchy_level       int not null check (hierarchy_level between 1 and 20),
  title                 text not null,
  description           text,
  bunny_video_id        text,
  test_instructions     text,
  created_by            uuid references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index exercises_protocol_idx on exercises(protocol, hierarchy_level);

-- ============================================================
-- homework_assignments — coach geeft lid een lijst oefeningen.
-- 1 actieve per lid via partial unique index.
-- ============================================================
create table homework_assignments (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references profiles(id) on delete cascade,
  assigned_by           uuid references profiles(id),
  notes                 text,
  is_active             boolean not null default true,
  assigned_at           timestamptz not null default now()
);
create unique index homework_one_active_per_member
  on homework_assignments(member_id) where is_active;

create table homework_exercises (
  assignment_id         uuid not null references homework_assignments(id) on delete cascade,
  exercise_id           uuid not null references exercises(id) on delete restrict,
  position              int not null default 0,
  coach_notes           text,
  primary key (assignment_id, exercise_id)
);

-- ============================================================
-- exercise_completions — lid vinkt oefening af (gewoon log)
-- ============================================================
create table exercise_completions (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references profiles(id) on delete cascade,
  exercise_id           uuid not null references exercises(id) on delete cascade,
  completed_at          timestamptz not null default now()
);
create index completions_member_day_idx
  on exercise_completions(member_id, (completed_at::date));

-- ============================================================
-- checkins — NRS 1-10 + note, één per dag per lid
-- ============================================================
create table checkins (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references profiles(id) on delete cascade,
  for_date              date not null,
  complaint_severity    int check (complaint_severity between 1 and 10),
  energy                int check (energy between 1 and 10),
  soreness              int check (soreness between 1 and 10),
  fatigue               int check (fatigue between 1 and 10),
  note                  text,
  created_at            timestamptz not null default now(),
  unique (member_id, for_date)
);
create index checkins_member_date_idx on checkins(member_id, for_date desc);

-- ============================================================
-- evaluation_slots — coach publiceert vensters
-- ============================================================
create table evaluation_slots (
  id                    uuid primary key default gen_random_uuid(),
  coach_id              uuid not null references profiles(id),
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  is_published          boolean not null default true,
  created_at            timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index slots_starts_idx on evaluation_slots(starts_at) where is_published;

create table evaluation_bookings (
  id                    uuid primary key default gen_random_uuid(),
  slot_id               uuid not null references evaluation_slots(id) on delete cascade unique,
  member_id             uuid not null references profiles(id) on delete cascade,
  booked_at             timestamptz not null default now()
);

create table evaluations (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references profiles(id) on delete cascade,
  coach_id              uuid not null references profiles(id),
  booking_id            uuid references evaluation_bookings(id) on delete set null,
  conducted_at          timestamptz,
  report_text           text,
  published_at          timestamptz,
  created_at            timestamptz not null default now()
);
create index evaluations_member_idx on evaluations(member_id, created_at desc);

create table evaluation_media (
  id                    uuid primary key default gen_random_uuid(),
  evaluation_id         uuid not null references evaluations(id) on delete cascade,
  storage_path          text not null,
  kind                  text not null check (kind in ('photo', 'video')),
  uploaded_at           timestamptz not null default now()
);

-- ============================================================
-- push_subscriptions — web-push endpoints per member-device
-- ============================================================
create table push_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references profiles(id) on delete cascade,
  endpoint              text not null unique,
  p256dh                text not null,
  auth                  text not null,
  user_agent            text,
  created_at            timestamptz not null default now()
);

-- ============================================================
-- audit_log — append-only
-- ============================================================
create table audit_log (
  id                    bigserial primary key,
  actor_id              uuid,
  action                text not null,
  target                text,
  meta                  jsonb,
  at                    timestamptz not null default now()
);

-- ============================================================
-- updated_at trigger op exercises
-- ============================================================
create or replace function tg_touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end$$;
create trigger exercises_touch before update on exercises
  for each row execute function tg_touch_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles              enable row level security;
alter table exercises             enable row level security;
alter table homework_assignments  enable row level security;
alter table homework_exercises    enable row level security;
alter table exercise_completions  enable row level security;
alter table checkins              enable row level security;
alter table evaluation_slots      enable row level security;
alter table evaluation_bookings   enable row level security;
alter table evaluations           enable row level security;
alter table evaluation_media      enable row level security;
alter table push_subscriptions    enable row level security;
alter table audit_log             enable row level security;

-- profiles
create policy "self read profile" on profiles for select
  using (id = auth.uid() or is_coach());
create policy "self update profile" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "coach manage profiles" on profiles for all
  using (is_coach()) with check (is_coach());

-- exercises — leesbaar door alle ingelogde users (library); coach schrijft
create policy "anyone read exercises" on exercises for select
  using (auth.role() = 'authenticated');
create policy "coach manage exercises" on exercises for all
  using (is_coach()) with check (is_coach());

-- homework_assignments — lid ziet eigen actieve toewijzing; coach beheert
create policy "own homework" on homework_assignments for select
  using (member_id = auth.uid() or is_coach());
create policy "coach manage homework" on homework_assignments for all
  using (is_coach()) with check (is_coach());

-- homework_exercises — volgt parent assignment
create policy "read homework items" on homework_exercises for select
  using (
    is_coach()
    or exists (
      select 1 from homework_assignments ha
      where ha.id = homework_exercises.assignment_id and ha.member_id = auth.uid()
    )
  );
create policy "coach manage homework items" on homework_exercises for all
  using (is_coach()) with check (is_coach());

-- exercise_completions — lid logt eigen completions; coach mag lezen
create policy "own completions" on exercise_completions for all
  using (member_id = auth.uid() or is_coach())
  with check (member_id = auth.uid() or is_coach());

-- checkins — lid eigen + coach
create policy "own checkins" on checkins for all
  using (member_id = auth.uid() or is_coach())
  with check (member_id = auth.uid() or is_coach());

-- evaluation_slots — leden zien gepubliceerd; coach beheert
create policy "read published slots" on evaluation_slots for select
  using (is_published or is_coach());
create policy "coach manage slots" on evaluation_slots for all
  using (is_coach()) with check (is_coach());

-- evaluation_bookings — lid boekt eigen; coach ziet/manage alles
create policy "own bookings" on evaluation_bookings for all
  using (member_id = auth.uid() or is_coach())
  with check (member_id = auth.uid() or is_coach());

-- evaluations — lid ziet eigen ALLEEN als published; coach altijd
create policy "member sees published eval" on evaluations for select
  using ((member_id = auth.uid() and published_at is not null) or is_coach());
create policy "coach writes eval" on evaluations for all
  using (is_coach()) with check (is_coach());

-- evaluation_media — volgt evaluation
create policy "media follows eval" on evaluation_media for select
  using (
    is_coach()
    or exists (
      select 1 from evaluations e
      where e.id = evaluation_media.evaluation_id
        and e.member_id = auth.uid()
        and e.published_at is not null
    )
  );
create policy "coach manage media" on evaluation_media for all
  using (is_coach()) with check (is_coach());

-- push_subscriptions — lid beheert eigen; coach geen toegang nodig
create policy "own push subs" on push_subscriptions for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- audit_log — alleen service-role schrijft; coach kan lezen
create policy "coach read audit" on audit_log for select using (is_coach());

-- ============================================================
-- Supabase Storage bucket voor evaluation media
-- Voer dit één keer handmatig uit in Supabase Studio of via API:
--   insert into storage.buckets (id, name, public) values ('evaluation-media', 'evaluation-media', false);
-- en zet RLS-policies daar op zodat alleen eigenaar + coach toegang heeft.
-- ============================================================
