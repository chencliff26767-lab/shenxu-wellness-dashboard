alter table public.workout_sessions
add column if not exists workout_plan_id uuid references public.workout_plans(id) on delete restrict;

alter table public.workout_exercises
add column if not exists planned_exercise_id uuid references public.planned_exercises(id) on delete restrict;

alter table public.workout_sets
add column if not exists planned_set_id uuid references public.planned_sets(id) on delete restrict,
add column if not exists planned_duration_seconds integer check (planned_duration_seconds is null or planned_duration_seconds >= 0),
add column if not exists actual_duration_seconds integer check (actual_duration_seconds is null or actual_duration_seconds >= 0),
add column if not exists planned_distance_m numeric(10,2) check (planned_distance_m is null or planned_distance_m >= 0),
add column if not exists actual_distance_m numeric(10,2) check (actual_distance_m is null or actual_distance_m >= 0),
add column if not exists planned_rpe smallint check (planned_rpe is null or planned_rpe between 1 and 10),
add column if not exists actual_rpe smallint check (actual_rpe is null or actual_rpe between 1 and 10),
add column if not exists planned_rir smallint check (planned_rir is null or planned_rir between 0 and 10),
add column if not exists actual_rir smallint check (actual_rir is null or actual_rir between 0 and 10),
add column if not exists planned_rest_seconds integer check (planned_rest_seconds is null or planned_rest_seconds >= 0);

create unique index if not exists workout_sessions_plan_unique_idx
on public.workout_sessions (workout_plan_id)
where workout_plan_id is not null;

create unique index if not exists workout_exercises_planned_unique_idx
on public.workout_exercises (planned_exercise_id)
where planned_exercise_id is not null;

create unique index if not exists workout_sets_planned_unique_idx
on public.workout_sets (planned_set_id)
where planned_set_id is not null;

alter table public.workout_sessions
drop constraint if exists workout_sessions_status_check;

alter table public.workout_sessions
add constraint workout_sessions_status_check
check (status in ('planned', 'in_progress', 'completed', 'partial', 'skipped', 'draft'));

create or replace function public.start_workout_plan(target_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plan public.workout_plans%rowtype;
  planned_exercise record;
  actual_session_id uuid;
  actual_exercise_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into target_plan
  from public.workout_plans
  where id = target_plan_id
  for update;

  if not found then
    raise exception 'Workout plan not found' using errcode = 'P0002';
  end if;

  if target_plan.owner_id <> auth.uid() then
    raise exception 'Only the owner can start this workout' using errcode = '42501';
  end if;

  select id
  into actual_session_id
  from public.workout_sessions
  where workout_plan_id = target_plan_id;

  if actual_session_id is not null then
    return actual_session_id;
  end if;

  if target_plan.status <> 'planned' or target_plan.locked_at is not null then
    raise exception 'Workout plan has already started or cannot be started' using errcode = 'P0001';
  end if;

  insert into public.workout_sessions (
    owner_id,
    workout_plan_id,
    scheduled_at,
    status,
    title,
    session_type,
    note
  )
  values (
    target_plan.owner_id,
    target_plan.id,
    timezone('Asia/Taipei', clock_timestamp()),
    'in_progress',
    target_plan.title,
    target_plan.workout_type,
    target_plan.preparation_notes
  )
  returning id into actual_session_id;

  for planned_exercise in
    select *
    from public.planned_exercises
    where workout_plan_id = target_plan.id
    order by position
  loop
    insert into public.workout_exercises (
      session_id,
      planned_exercise_id,
      position,
      exercise_type,
      name,
      note
    )
    values (
      actual_session_id,
      planned_exercise.id,
      planned_exercise.position,
      planned_exercise.exercise_type,
      case
        when planned_exercise.variation is null then planned_exercise.name
        else planned_exercise.name || ' · ' || planned_exercise.variation
      end,
      planned_exercise.note
    )
    returning id into actual_exercise_id;

    insert into public.workout_sets (
      exercise_id,
      planned_set_id,
      position,
      planned_weight_kg,
      planned_reps,
      planned_duration_min,
      planned_duration_seconds,
      planned_distance_m,
      planned_intensity,
      planned_rpe,
      planned_rir,
      planned_rest_seconds,
      note
    )
    select
      actual_exercise_id,
      ps.id,
      ps.position,
      ps.target_weight_kg,
      ps.target_reps,
      case
        when ps.target_duration_seconds is null then null
        else ceil(ps.target_duration_seconds / 60.0)::integer
      end,
      ps.target_duration_seconds,
      ps.target_distance_m,
      ps.target_rpe,
      ps.target_rpe,
      ps.target_rir,
      ps.rest_seconds,
      ps.note
    from public.planned_sets ps
    where ps.planned_exercise_id = planned_exercise.id
    order by ps.position;
  end loop;

  update public.workout_plans
  set
    status = 'in_progress',
    locked_at = clock_timestamp(),
    started_at = clock_timestamp(),
    updated_at = clock_timestamp()
  where id = target_plan.id;

  return actual_session_id;
end;
$$;

revoke all on function public.start_workout_plan(uuid) from public;
grant execute on function public.start_workout_plan(uuid) to authenticated;
