-- BayitBeSeder (בית בסדר) - Phase 3 Migration
-- Simplified schema: profiles, categories, tasks, task_completions

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================
-- 1. Profiles (extends auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  points integer not null default 0,
  streak integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. Categories
-- ============================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  color text
);

-- ============================================
-- 3. Tasks
-- ============================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  due_date date,
  points integer not null default 10,
  recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- 4. Task Completions
-- ============================================
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  photo_url text,
  notes text
);

-- ============================================
-- Indexes
-- ============================================
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_category on public.tasks(category_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_completions_task on public.task_completions(task_id);
create index if not exists idx_completions_user on public.task_completions(user_id);
create index if not exists idx_completions_date on public.task_completions(completed_at);

-- ============================================
-- Row Level Security
-- ============================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

-- Profiles: users can read all profiles, update their own
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Categories: anyone can read, authenticated can manage
create policy "Anyone can view categories"
  on public.categories for select
  using (true);

create policy "Authenticated users can insert categories"
  on public.categories for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update categories"
  on public.categories for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete categories"
  on public.categories for delete
  using (auth.role() = 'authenticated');

-- Tasks: authenticated users can CRUD
create policy "Anyone can view tasks"
  on public.tasks for select
  using (true);

create policy "Authenticated users can insert tasks"
  on public.tasks for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update tasks"
  on public.tasks for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete tasks"
  on public.tasks for delete
  using (auth.role() = 'authenticated');

-- Task Completions: users can read all, insert/update their own
create policy "Anyone can view completions"
  on public.task_completions for select
  using (true);

create policy "Users can insert own completions"
  on public.task_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own completions"
  on public.task_completions for update
  using (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.task_completions for delete
  using (auth.uid() = user_id);

-- ============================================
-- Seed Categories (Hebrew)
-- ============================================
insert into public.categories (name, icon, color) values
  ('מטבח', 'ChefHat', '#EF4444'),
  ('אמבטיה', 'Bath', '#3B82F6'),
  ('סלון', 'Sofa', '#8B5CF6'),
  ('חדר שינה', 'Bed', '#EC4899'),
  ('כביסה', 'Shirt', '#F59E0B'),
  ('חוץ', 'TreePine', '#22C55E'),
  ('חיות מחמד', 'Cat', '#F97316'),
  ('כללי', 'Home', '#6B7280')
on conflict do nothing;

-- ============================================
-- Auto-create profile on signup (trigger)
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
