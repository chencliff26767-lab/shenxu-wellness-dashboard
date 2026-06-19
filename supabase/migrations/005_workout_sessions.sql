create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  scheduled_at timestamp without time zone not null,
  status text not null check (status in ('planned', 'completed', 'skipped', 'draft')),
  title text not null check (length(trim(title)) > 0),
  session_type text not null check (session_type in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other')),
  note text,
  pain_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  position integer not null check (position > 0),
  exercise_type text not null check (exercise_type in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other')),
  name text not null check (length(trim(name)) > 0),
  note text,
  pain_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  position integer not null check (position > 0),
  planned_weight_kg numeric(6,2) check (planned_weight_kg is null or planned_weight_kg >= 0),
  actual_weight_kg numeric(6,2) check (actual_weight_kg is null or actual_weight_kg >= 0),
  planned_reps integer check (planned_reps is null or planned_reps >= 0),
  actual_reps integer check (actual_reps is null or actual_reps >= 0),
  planned_duration_min integer check (planned_duration_min is null or planned_duration_min >= 0),
  actual_duration_min integer check (actual_duration_min is null or actual_duration_min >= 0),
  planned_intensity numeric(4,1) check (planned_intensity is null or (planned_intensity >= 0 and planned_intensity <= 10)),
  actual_intensity numeric(4,1) check (actual_intensity is null or (actual_intensity >= 0 and actual_intensity <= 10)),
  note text,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

create index if not exists workout_sessions_owner_scheduled_at_idx
on public.workout_sessions (owner_id, scheduled_at desc);

create index if not exists workout_exercises_session_position_idx
on public.workout_exercises (session_id, position);

create index if not exists workout_sets_exercise_position_idx
on public.workout_sets (exercise_id, position);

create policy "owners can read own workout sessions"
on public.workout_sessions for select
to authenticated
using (owner_id = auth.uid());

create policy "owners can insert own workout sessions"
on public.workout_sessions for insert
to authenticated
with check (owner_id = auth.uid());

create policy "owners can update own workout sessions"
on public.workout_sessions for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners can delete own workout sessions"
on public.workout_sessions for delete
to authenticated
using (owner_id = auth.uid());

create policy "owners can read own workout exercises"
on public.workout_exercises for select
to authenticated
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_exercises.session_id
      and ws.owner_id = auth.uid()
  )
);

create policy "owners can insert own workout exercises"
on public.workout_exercises for insert
to authenticated
with check (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_exercises.session_id
      and ws.owner_id = auth.uid()
  )
);

create policy "owners can update own workout exercises"
on public.workout_exercises for update
to authenticated
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_exercises.session_id
      and ws.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_exercises.session_id
      and ws.owner_id = auth.uid()
  )
);

create policy "owners can delete own workout exercises"
on public.workout_exercises for delete
to authenticated
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_exercises.session_id
      and ws.owner_id = auth.uid()
  )
);

create policy "owners can read own workout sets"
on public.workout_sets for select
to authenticated
using (
  exists (
    select 1
    from public.workout_exercises we
    join public.workout_sessions ws on ws.id = we.session_id
    where we.id = workout_sets.exercise_id
      and ws.owner_id = auth.uid()
  )
);

create policy "owners can insert own workout sets"
on public.workout_sets for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_exercises we
    join public.workout_sessions ws on ws.id = we.session_id
    where we.id = workout_sets.exercise_id
      and ws.owner_id = auth.uid()
  )
);

create policy "owners can update own workout sets"
on public.workout_sets for update
to authenticated
using (
  exists (
    select 1
    from public.workout_exercises we
    join public.workout_sessions ws on ws.id = we.session_id
    where we.id = workout_sets.exercise_id
      and ws.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_exercises we
    join public.workout_sessions ws on ws.id = we.session_id
    where we.id = workout_sets.exercise_id
      and ws.owner_id = auth.uid()
  )
);

create policy "owners can delete own workout sets"
on public.workout_sets for delete
to authenticated
using (
  exists (
    select 1
    from public.workout_exercises we
    join public.workout_sessions ws on ws.id = we.session_id
    where we.id = workout_sets.exercise_id
      and ws.owner_id = auth.uid()
  )
);
