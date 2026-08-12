/*
# Build the core data model for Zad Alhalaqat

1. New Tables
- `profiles`: authenticated user profile, role, approval status, and display information.
- `books`: reusable learning content containers.
- `book_units`: flexible hierarchical units for hadith, surah, lesson, page, text, media, or questions.
- `programs`: the method and rules for using one or more books.
- `program_books`: many-to-many relationship between programs and books.
- `groups`: learning circles connected to programs.
- `group_members`: historical membership of students and supervisors in circles.
- `enrollments`: a student's independent participation in each program.
- `plans` and `daily_plans`: immutable plan definition plus student-specific daily targets.
- `listening_records`: deduplicated recitation and review records.
- `tests` and `test_results`: program tests and student outcomes.
- `notifications`: user-scoped in-app notifications.
- `activity_logs`: auditable administrative actions.

2. Security
- Row level security is enabled on every table.
- Students can only read and update their own profile, enrollments, plans, records, and results.
- Supervisors can access students in their assigned groups.
- Managers can manage the institutional catalog and operational records.
- Published books and programs are readable by authenticated users.
- A secure role helper uses the profile role without exposing unrestricted profile access.

3. Important Notes
- Books are content; programs are reusable rules; enrollments connect users to programs.
- Records are archived through status values rather than destructive deletes.
- All timestamps use UTC and all operational rows carry audit fields.
*/

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('student', 'supervisor', 'manager');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('pending', 'approved', 'suspended', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.record_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'student',
  status public.account_status not null default 'pending',
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  category text,
  language text not null default 'ar',
  cover_url text,
  content_type text not null default 'text',
  is_public boolean not null default false,
  status public.record_status not null default 'active',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_units (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  parent_id uuid references public.book_units(id) on delete set null,
  title text not null,
  unit_type text not null default 'unit',
  unit_order integer not null default 0,
  content text,
  media_url text,
  metadata jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'active',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  program_type text not null default 'course',
  start_date date,
  end_date date,
  rules jsonb not null default '{"daily_units": 2, "passing_score": 70, "allow_adaptive_plan": true}'::jsonb,
  published boolean not null default false,
  status public.record_status not null default 'active',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_books (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(program_id, book_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  name text not null,
  description text,
  status public.record_status not null default 'active',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role public.app_role not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  status public.record_status not null default 'active',
  unique(group_id, user_id, member_role)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  group_id uuid references public.groups(id) on delete set null,
  supervisor_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending',
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  points integer not null default 0 check (points >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, program_id)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(id) on delete cascade,
  total_days integer not null default 1 check (total_days > 0),
  adaptive_enabled boolean not null default true,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  planned_date date,
  unit_ids uuid[] not null default '{}',
  completed_units integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, day_number)
);

create table if not exists public.listening_records (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  unit_id uuid not null references public.book_units(id) on delete restrict,
  supervisor_id uuid references public.profiles(id) on delete set null,
  operation_type text not null default 'new_memorization',
  attempt_number integer not null default 1 check (attempt_number > 0),
  score numeric(5,2) check (score >= 0 and score <= 100),
  errors jsonb not null default '[]'::jsonb,
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(enrollment_id, unit_id, operation_type, attempt_number)
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  title text not null,
  description text,
  passing_score numeric(5,2) not null default 70 check (passing_score >= 0 and passing_score <= 100),
  scheduled_at timestamptz,
  status public.record_status not null default 'active',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  passed boolean not null,
  errors jsonb not null default '[]'::jsonb,
  notes text,
  tested_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(test_id, enrollment_id, tested_at)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'system',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null default auth.uid() references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager' and status = 'approved') $$;

create or replace function public.is_supervisor_for(target_student uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.enrollments e
  join public.group_members gm on gm.group_id = e.group_id and gm.user_id = auth.uid() and gm.member_role = 'supervisor' and gm.status = 'active'
  where e.student_id = target_student and e.status not in ('suspended', 'completed')
) $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create index if not exists idx_books_status_public on public.books(status, is_public);
create index if not exists idx_programs_status_published on public.programs(status, published);
create index if not exists idx_enrollments_student_status on public.enrollments(student_id, status);
create index if not exists idx_enrollments_supervisor_status on public.enrollments(supervisor_id, status);
create index if not exists idx_listening_student_recorded on public.listening_records(student_id, recorded_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_units enable row level security;
alter table public.programs enable row level security;
alter table public.program_books enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.enrollments enable row level security;
alter table public.plans enable row level security;
alter table public.daily_plans enable row level security;
alter table public.listening_records enable row level security;
alter table public.tests enable row level security;
alter table public.test_results enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

revoke execute on function public.is_manager() from public, anon;
revoke execute on function public.is_supervisor_for(uuid) from public, anon;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_supervisor_for(uuid) to authenticated;

DROP POLICY IF EXISTS "profiles_select_self_or_manager" ON public.profiles;
CREATE POLICY "profiles_select_self_or_manager" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_manager() OR public.is_supervisor_for(id));
DROP POLICY IF EXISTS "profiles_update_self_or_manager" ON public.profiles;
CREATE POLICY "profiles_update_self_or_manager" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_manager()) WITH CHECK (id = auth.uid() OR public.is_manager());

DROP POLICY IF EXISTS "books_select_catalog" ON public.books;
CREATE POLICY "books_select_catalog" ON public.books FOR SELECT TO authenticated USING ((is_public = true AND status = 'active') OR public.is_manager() OR exists (select 1 from public.program_books pb join public.enrollments e on e.program_id = pb.program_id where pb.book_id = books.id and e.student_id = auth.uid()));
DROP POLICY IF EXISTS "books_insert_manager" ON public.books;
CREATE POLICY "books_insert_manager" ON public.books FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "books_update_manager" ON public.books;
CREATE POLICY "books_update_manager" ON public.books FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "books_delete_manager" ON public.books;
CREATE POLICY "books_delete_manager" ON public.books FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "book_units_select_access" ON public.book_units;
CREATE POLICY "book_units_select_access" ON public.book_units FOR SELECT TO authenticated USING (public.is_manager() OR exists (select 1 from public.books b where b.id = book_units.book_id and b.is_public = true and b.status = 'active') OR exists (select 1 from public.program_books pb join public.enrollments e on e.program_id = pb.program_id where pb.book_id = book_units.book_id and e.student_id = auth.uid()));
DROP POLICY IF EXISTS "book_units_insert_manager" ON public.book_units;
CREATE POLICY "book_units_insert_manager" ON public.book_units FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "book_units_update_manager" ON public.book_units;
CREATE POLICY "book_units_update_manager" ON public.book_units FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "book_units_delete_manager" ON public.book_units;
CREATE POLICY "book_units_delete_manager" ON public.book_units FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "programs_select_access" ON public.programs;
CREATE POLICY "programs_select_access" ON public.programs FOR SELECT TO authenticated USING ((published = true AND status = 'active') OR public.is_manager() OR exists (select 1 from public.enrollments e where e.program_id = programs.id and e.student_id = auth.uid()));
DROP POLICY IF EXISTS "programs_insert_manager" ON public.programs;
CREATE POLICY "programs_insert_manager" ON public.programs FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "programs_update_manager" ON public.programs;
CREATE POLICY "programs_update_manager" ON public.programs FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "programs_delete_manager" ON public.programs;
CREATE POLICY "programs_delete_manager" ON public.programs FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "program_books_select_access" ON public.program_books;
CREATE POLICY "program_books_select_access" ON public.program_books FOR SELECT TO authenticated USING (public.is_manager() OR exists (select 1 from public.enrollments e where e.program_id = program_books.program_id and e.student_id = auth.uid()));
DROP POLICY IF EXISTS "program_books_manager_write" ON public.program_books;
CREATE POLICY "program_books_manager_write" ON public.program_books FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "program_books_manager_delete" ON public.program_books;
CREATE POLICY "program_books_manager_delete" ON public.program_books FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "groups_select_access" ON public.groups;
CREATE POLICY "groups_select_access" ON public.groups FOR SELECT TO authenticated USING (public.is_manager() OR exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.status = 'active') OR exists (select 1 from public.enrollments e where e.group_id = groups.id and e.student_id = auth.uid()));
DROP POLICY IF EXISTS "groups_manager_write" ON public.groups;
CREATE POLICY "groups_manager_write" ON public.groups FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "groups_manager_update" ON public.groups;
CREATE POLICY "groups_manager_update" ON public.groups FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "groups_manager_delete" ON public.groups;
CREATE POLICY "groups_manager_delete" ON public.groups FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "group_members_select_access" ON public.group_members;
CREATE POLICY "group_members_select_access" ON public.group_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_manager() OR public.is_supervisor_for(user_id));
DROP POLICY IF EXISTS "group_members_manager_insert" ON public.group_members;
CREATE POLICY "group_members_manager_insert" ON public.group_members FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "group_members_manager_update" ON public.group_members;
CREATE POLICY "group_members_manager_update" ON public.group_members FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "group_members_manager_delete" ON public.group_members;
CREATE POLICY "group_members_manager_delete" ON public.group_members FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "enrollments_select_scope" ON public.enrollments;
CREATE POLICY "enrollments_select_scope" ON public.enrollments FOR SELECT TO authenticated USING (student_id = auth.uid() OR supervisor_id = auth.uid() OR public.is_manager() OR public.is_supervisor_for(student_id));
DROP POLICY IF EXISTS "enrollments_insert_manager" ON public.enrollments;
CREATE POLICY "enrollments_insert_manager" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "enrollments_update_scope" ON public.enrollments;
CREATE POLICY "enrollments_update_scope" ON public.enrollments FOR UPDATE TO authenticated USING (student_id = auth.uid() OR public.is_manager() OR public.is_supervisor_for(student_id)) WITH CHECK (student_id = auth.uid() OR public.is_manager() OR public.is_supervisor_for(student_id));
DROP POLICY IF EXISTS "enrollments_delete_manager" ON public.enrollments;
CREATE POLICY "enrollments_delete_manager" ON public.enrollments FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "plans_select_scope" ON public.plans;
CREATE POLICY "plans_select_scope" ON public.plans FOR SELECT TO authenticated USING (exists (select 1 from public.enrollments e where e.id = plans.enrollment_id and (e.student_id = auth.uid() or e.supervisor_id = auth.uid() or public.is_manager() or public.is_supervisor_for(e.student_id))));
DROP POLICY IF EXISTS "plans_manager_insert" ON public.plans;
CREATE POLICY "plans_manager_insert" ON public.plans FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "plans_scope_update" ON public.plans;
CREATE POLICY "plans_scope_update" ON public.plans FOR UPDATE TO authenticated USING (public.is_manager() OR exists (select 1 from public.enrollments e where e.id = plans.enrollment_id and (e.student_id = auth.uid() or public.is_supervisor_for(e.student_id)))) WITH CHECK (public.is_manager() OR exists (select 1 from public.enrollments e where e.id = plans.enrollment_id and (e.student_id = auth.uid() or public.is_supervisor_for(e.student_id))));

DROP POLICY IF EXISTS "daily_plans_select_scope" ON public.daily_plans;
CREATE POLICY "daily_plans_select_scope" ON public.daily_plans FOR SELECT TO authenticated USING (exists (select 1 from public.plans p join public.enrollments e on e.id = p.enrollment_id where p.id = daily_plans.plan_id and (e.student_id = auth.uid() or e.supervisor_id = auth.uid() or public.is_manager() or public.is_supervisor_for(e.student_id))));
DROP POLICY IF EXISTS "daily_plans_scope_insert" ON public.daily_plans;
CREATE POLICY "daily_plans_scope_insert" ON public.daily_plans FOR INSERT TO authenticated WITH CHECK (public.is_manager() OR exists (select 1 from public.plans p join public.enrollments e on e.id = p.enrollment_id where p.id = daily_plans.plan_id and (e.student_id = auth.uid() or public.is_supervisor_for(e.student_id))));
DROP POLICY IF EXISTS "daily_plans_scope_update" ON public.daily_plans;
CREATE POLICY "daily_plans_scope_update" ON public.daily_plans FOR UPDATE TO authenticated USING (public.is_manager() OR exists (select 1 from public.plans p join public.enrollments e on e.id = p.enrollment_id where p.id = daily_plans.plan_id and (e.student_id = auth.uid() or public.is_supervisor_for(e.student_id)))) WITH CHECK (public.is_manager() OR exists (select 1 from public.plans p join public.enrollments e on e.id = p.enrollment_id where p.id = daily_plans.plan_id and (e.student_id = auth.uid() or public.is_supervisor_for(e.student_id))));

DROP POLICY IF EXISTS "listening_select_scope" ON public.listening_records;
CREATE POLICY "listening_select_scope" ON public.listening_records FOR SELECT TO authenticated USING (student_id = auth.uid() OR supervisor_id = auth.uid() OR public.is_manager() OR public.is_supervisor_for(student_id));
DROP POLICY IF EXISTS "listening_insert_scope" ON public.listening_records;
CREATE POLICY "listening_insert_scope" ON public.listening_records FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR public.is_manager() OR public.is_supervisor_for(student_id));
DROP POLICY IF EXISTS "listening_update_scope" ON public.listening_records;
CREATE POLICY "listening_update_scope" ON public.listening_records FOR UPDATE TO authenticated USING (public.is_manager() OR supervisor_id = auth.uid() OR public.is_supervisor_for(student_id)) WITH CHECK (public.is_manager() OR supervisor_id = auth.uid() OR public.is_supervisor_for(student_id));

DROP POLICY IF EXISTS "tests_select_scope" ON public.tests;
CREATE POLICY "tests_select_scope" ON public.tests FOR SELECT TO authenticated USING (public.is_manager() OR exists (select 1 from public.enrollments e where e.program_id = tests.program_id and (e.student_id = auth.uid() or e.supervisor_id = auth.uid() or public.is_supervisor_for(e.student_id))));
DROP POLICY IF EXISTS "tests_manager_insert" ON public.tests;
CREATE POLICY "tests_manager_insert" ON public.tests FOR INSERT TO authenticated WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "tests_manager_update" ON public.tests;
CREATE POLICY "tests_manager_update" ON public.tests FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "tests_manager_delete" ON public.tests;
CREATE POLICY "tests_manager_delete" ON public.tests FOR DELETE TO authenticated USING (public.is_manager());

DROP POLICY IF EXISTS "test_results_select_scope" ON public.test_results;
CREATE POLICY "test_results_select_scope" ON public.test_results FOR SELECT TO authenticated USING (exists (select 1 from public.enrollments e where e.id = test_results.enrollment_id and (e.student_id = auth.uid() or e.supervisor_id = auth.uid() or public.is_manager() or public.is_supervisor_for(e.student_id))));
DROP POLICY IF EXISTS "test_results_insert_scope" ON public.test_results;
CREATE POLICY "test_results_insert_scope" ON public.test_results FOR INSERT TO authenticated WITH CHECK (public.is_manager() OR exists (select 1 from public.enrollments e where e.id = test_results.enrollment_id and public.is_supervisor_for(e.student_id)));
DROP POLICY IF EXISTS "test_results_update_manager" ON public.test_results;
CREATE POLICY "test_results_update_manager" ON public.test_results FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_manager());
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_manager_insert" ON public.notifications;
CREATE POLICY "notifications_manager_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "activity_logs_manager_select" ON public.activity_logs;
CREATE POLICY "activity_logs_manager_select" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_manager());
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_authenticated" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
