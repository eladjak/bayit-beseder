-- BayitBeSeder (בית בסדר) - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  push_subscription jsonb,
  notification_preferences jsonb default '{"morning": true, "midday": true, "evening": true, "partner_activity": true}',
  household_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Households
create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  golden_rule_target smallint default 80,
  emergency_mode boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add FK from profiles to households
alter table public.profiles
  add constraint profiles_household_id_fkey
  foreign key (household_id) references public.households(id);

-- 3. Household Members
create table public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  unique(household_id, user_id)
);

-- 4. Task Templates
create table public.task_templates (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('kitchen', 'bathroom', 'living', 'bedroom', 'laundry', 'outdoor', 'pets', 'general')),
  zone text,
  estimated_minutes smallint not null default 10,
  default_assignee uuid references public.profiles(id),
  tips text[] default '{}',
  is_emergency boolean default false,
  recurrence_type text not null check (recurrence_type in ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  recurrence_day smallint,
  sort_order smallint default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- 5. Task Instances
create table public.task_instances (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  rating smallint check (rating between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

-- 6. Streaks
create table public.streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  streak_type text not null check (streak_type in ('daily', 'weekly')),
  current_count integer default 0,
  best_count integer default 0,
  last_completed_at timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, household_id, streak_type)
);

-- 7. Achievements
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  title text not null,
  description text not null,
  icon text not null,
  threshold integer not null,
  category text not null check (category in ('streak', 'completion', 'special'))
);

-- 8. User Achievements
create table public.user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz default now(),
  unique(user_id, achievement_id)
);

-- 9. Weekly Syncs
create table public.weekly_syncs (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start date not null,
  notes text,
  focus_zones text[] default '{}',
  special_events text[] default '{}',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

-- 10. Coaching Messages
create table public.coaching_messages (
  id uuid primary key default uuid_generate_v4(),
  trigger_type text not null check (trigger_type in ('task_complete', 'streak', 'emergency', 'low_motivation', 'golden_rule_hit', 'all_daily_done', 'partner_complete')),
  message text not null,
  emoji text not null default '✨'
);

-- Indexes
create index idx_task_instances_household_date on public.task_instances(household_id, due_date);
create index idx_task_instances_assigned on public.task_instances(assigned_to, due_date) where status = 'pending';
create index idx_task_templates_household on public.task_templates(household_id) where active = true;
create index idx_household_members_user on public.household_members(user_id);
create index idx_streaks_user on public.streaks(user_id, household_id);

-- Enable Realtime
alter publication supabase_realtime add table public.task_instances;
alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.streaks;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.task_templates enable row level security;
alter table public.task_instances enable row level security;
alter table public.streaks enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.weekly_syncs enable row level security;
alter table public.coaching_messages enable row level security;

-- RLS Policies

-- Profiles: users can read/update their own + household members
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can view household members" on public.profiles
  for select using (
    household_id in (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Households: members can view/update their household
create policy "Members can view household" on public.households
  for select using (
    id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Owner can update household" on public.households
  for update using (
    id in (select household_id from public.household_members where user_id = auth.uid() and role = 'owner')
  );

create policy "Anyone can create household" on public.households
  for insert with check (true);

-- Household Members
create policy "Members can view members" on public.household_members
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Anyone can join" on public.household_members
  for insert with check (user_id = auth.uid());

-- Task Templates: household members
create policy "Members can view templates" on public.task_templates
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Members can manage templates" on public.task_templates
  for all using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- Task Instances: household members
create policy "Members can view instances" on public.task_instances
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Members can manage instances" on public.task_instances
  for all using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- Streaks: household members
create policy "Members can view streaks" on public.streaks
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Users can update own streaks" on public.streaks
  for all using (user_id = auth.uid());

-- Achievements: anyone can read
create policy "Anyone can view achievements" on public.achievements
  for select using (true);

-- User Achievements: own + household
create policy "Users can view own achievements" on public.user_achievements
  for select using (user_id = auth.uid());

create policy "Users can unlock achievements" on public.user_achievements
  for insert with check (user_id = auth.uid());

-- Weekly Syncs: household
create policy "Members can view syncs" on public.weekly_syncs
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Members can create syncs" on public.weekly_syncs
  for insert with check (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- Coaching Messages: anyone can read
create policy "Anyone can view coaching" on public.coaching_messages
  for select using (true);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger households_updated_at before update on public.households
  for each row execute function public.handle_updated_at();
create trigger streaks_updated_at before update on public.streaks
  for each row execute function public.handle_updated_at();
