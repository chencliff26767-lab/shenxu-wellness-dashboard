create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  title text not null check (length(trim(title)) > 0),
  workout_type text not null check (workout_type in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other')),
  scheduled_date date not null,
  scheduled_time time,
  target_duration_minutes integer check (target_duration_minutes is null or target_duration_minutes between 0 and 1440),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'partial', 'skipped', 'cancelled')),
  focus_text text,
  preparation_notes text,
  skipped_reason text,
  reschedule_count integer not null default 0 check (reschedule_count >= 0),
  last_rescheduled_at timestamptz,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planned_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  position integer not null check (position > 0),
  name text not null check (length(trim(name)) > 0),
  variation text,
  exercise_type text not null check (exercise_type in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other')),
  equipment text,
  body_part text,
  laterality text,
  multiply_unilateral_volume_by_two boolean not null default false,
  spring_or_resistance text,
  is_required boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_plan_id, position)
);

create table if not exists public.planned_sets (
  id uuid primary key default gen_random_uuid(),
  planned_exercise_id uuid not null references public.planned_exercises(id) on delete cascade,
  position integer not null check (position > 0),
  target_weight_kg numeric(7,2) check (target_weight_kg is null or target_weight_kg >= 0),
  target_reps integer check (target_reps is null or target_reps >= 0),
  target_duration_seconds integer check (target_duration_seconds is null or target_duration_seconds >= 0),
  target_distance_m numeric(10,2) check (target_distance_m is null or target_distance_m >= 0),
  target_rpe smallint check (target_rpe is null or target_rpe between 1 and 10),
  target_rir smallint check (target_rir is null or target_rir between 0 and 10),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  side text,
  note text,
  created_at timestamptz not null default now(),
  unique (planned_exercise_id, position)
);

alter table public.workout_plans enable row level security;
alter table public.planned_exercises enable row level security;
alter table public.planned_sets enable row level security;

create index if not exists workout_plans_owner_schedule_idx
on public.workout_plans (owner_id, scheduled_date, scheduled_time);

create index if not exists workout_plans_owner_status_idx
on public.workout_plans (owner_id, status, scheduled_date);

create index if not exists planned_exercises_plan_position_idx
on public.planned_exercises (workout_plan_id, position);

create index if not exists planned_sets_exercise_position_idx
on public.planned_sets (planned_exercise_id, position);

create policy "owners can read own workout plans"
on public.workout_plans for select
to authenticated
using (owner_id = auth.uid());

create policy "owners can insert own workout plans"
on public.workout_plans for insert
to authenticated
with check (owner_id = auth.uid() and created_by = auth.uid());

create policy "owners can update unlocked workout plans"
on public.workout_plans for update
to authenticated
using (owner_id = auth.uid() and status = 'planned' and locked_at is null)
with check (owner_id = auth.uid() and created_by = auth.uid());

create policy "owners can delete unlocked workout plans"
on public.workout_plans for delete
to authenticated
using (owner_id = auth.uid() and status = 'planned' and locked_at is null);

create policy "owners can read own planned exercises"
on public.planned_exercises for select
to authenticated
using (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and wp.owner_id = auth.uid()
  )
);

create policy "owners can insert exercises into unlocked plans"
on public.planned_exercises for insert
to authenticated
with check (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "owners can update exercises in unlocked plans"
on public.planned_exercises for update
to authenticated
using (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
)
with check (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "owners can delete exercises from unlocked plans"
on public.planned_exercises for delete
to authenticated
using (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "owners can read own planned sets"
on public.planned_sets for select
to authenticated
using (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and wp.owner_id = auth.uid()
  )
);

create policy "owners can insert sets into unlocked plans"
on public.planned_sets for insert
to authenticated
with check (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "owners can update sets in unlocked plans"
on public.planned_sets for update
to authenticated
using (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
)
with check (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "owners can delete sets from unlocked plans"
on public.planned_sets for delete
to authenticated
using (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and wp.owner_id = auth.uid()
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);
