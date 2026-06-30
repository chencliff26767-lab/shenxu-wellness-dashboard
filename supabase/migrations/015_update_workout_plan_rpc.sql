create or replace function public.update_workout_plan(
  target_plan_id uuid,
  target_title text,
  target_workout_type text,
  target_scheduled_date date,
  target_scheduled_time time,
  target_duration_minutes integer,
  target_focus_text text,
  target_preparation_notes text,
  target_exercises jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plan public.workout_plans%rowtype;
  exercise_item jsonb;
  exercise_type text;
  exercise_name text;
  exercise_count integer;
  planned_exercise_id uuid;
  exercise_position integer := 0;
  set_position integer;
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

  if not public.can_manage_workout_plans(target_plan.owner_id) then
    raise exception 'Not allowed to update this workout plan' using errcode = '42501';
  end if;

  if target_plan.status <> 'planned' or target_plan.locked_at is not null then
    raise exception 'Workout plan has already started or cannot be edited' using errcode = 'P0001';
  end if;

  if length(trim(coalesce(target_title, ''))) = 0 then
    raise exception 'Workout plan title is required' using errcode = '23514';
  end if;

  if target_workout_type not in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other') then
    raise exception 'Invalid workout type' using errcode = '23514';
  end if;

  if target_exercises is null or jsonb_typeof(target_exercises) <> 'array' or jsonb_array_length(target_exercises) = 0 then
    raise exception 'At least one exercise is required' using errcode = '23514';
  end if;

  update public.workout_plans
  set
    title = trim(target_title),
    workout_type = target_workout_type,
    scheduled_date = target_scheduled_date,
    scheduled_time = target_scheduled_time,
    target_duration_minutes = target_duration_minutes,
    focus_text = nullif(trim(coalesce(target_focus_text, '')), ''),
    preparation_notes = nullif(trim(coalesce(target_preparation_notes, '')), ''),
    updated_at = clock_timestamp()
  where id = target_plan_id;

  delete from public.planned_exercises
  where workout_plan_id = target_plan_id;

  for exercise_item in
    select value
    from jsonb_array_elements(target_exercises)
  loop
    exercise_name := trim(coalesce(exercise_item->>'name', ''));
    exercise_type := exercise_item->>'type';
    exercise_count := greatest(1, least(20, coalesce(nullif(exercise_item->>'setCount', '')::integer, 1)));

    if length(exercise_name) = 0 then
      raise exception 'Exercise name is required' using errcode = '23514';
    end if;

    if exercise_type not in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other') then
      raise exception 'Invalid exercise type' using errcode = '23514';
    end if;

    exercise_position := exercise_position + 1;

    insert into public.planned_exercises (
      workout_plan_id,
      position,
      name,
      variation,
      exercise_type,
      equipment,
      is_required,
      note
    )
    values (
      target_plan_id,
      exercise_position,
      exercise_name,
      nullif(trim(coalesce(exercise_item->>'variation', '')), ''),
      exercise_type,
      nullif(trim(coalesce(exercise_item->>'equipment', '')), ''),
      coalesce((exercise_item->>'required')::boolean, true),
      nullif(trim(coalesce(exercise_item->>'note', '')), '')
    )
    returning id into planned_exercise_id;

    for set_position in 1..exercise_count loop
      insert into public.planned_sets (
        planned_exercise_id,
        position,
        target_weight_kg,
        target_reps,
        target_duration_seconds,
        target_distance_m,
        target_rpe,
        target_rir,
        rest_seconds
      )
      values (
        planned_exercise_id,
        set_position,
        nullif(exercise_item->>'weight', '')::numeric,
        nullif(exercise_item->>'reps', '')::integer,
        nullif(exercise_item->>'durationSeconds', '')::integer,
        nullif(exercise_item->>'distanceM', '')::numeric,
        nullif(exercise_item->>'rpe', '')::smallint,
        nullif(exercise_item->>'rir', '')::smallint,
        nullif(exercise_item->>'restSeconds', '')::integer
      );
    end loop;
  end loop;
end;
$$;

revoke all on function public.update_workout_plan(
  uuid,
  text,
  text,
  date,
  time,
  integer,
  text,
  text,
  jsonb
) from public;

grant execute on function public.update_workout_plan(
  uuid,
  text,
  text,
  date,
  time,
  integer,
  text,
  text,
  jsonb
) to authenticated;
