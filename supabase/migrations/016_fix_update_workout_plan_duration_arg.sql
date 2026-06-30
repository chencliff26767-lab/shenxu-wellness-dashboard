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
  v_target_plan public.workout_plans%rowtype;
  v_exercise_item jsonb;
  v_exercise_type text;
  v_exercise_name text;
  v_exercise_count integer;
  v_planned_exercise_id uuid;
  v_exercise_position integer := 0;
  v_set_position integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into v_target_plan
  from public.workout_plans
  where id = $1
  for update;

  if not found then
    raise exception 'Workout plan not found' using errcode = 'P0002';
  end if;

  if not public.can_manage_workout_plans(v_target_plan.owner_id) then
    raise exception 'Not allowed to update this workout plan' using errcode = '42501';
  end if;

  if v_target_plan.status <> 'planned' or v_target_plan.locked_at is not null then
    raise exception 'Workout plan has already started or cannot be edited' using errcode = 'P0001';
  end if;

  if length(trim(coalesce($2, ''))) = 0 then
    raise exception 'Workout plan title is required' using errcode = '23514';
  end if;

  if $3 not in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other') then
    raise exception 'Invalid workout type' using errcode = '23514';
  end if;

  if $9 is null or jsonb_typeof($9) <> 'array' or jsonb_array_length($9) = 0 then
    raise exception 'At least one exercise is required' using errcode = '23514';
  end if;

  update public.workout_plans
  set
    title = trim($2),
    workout_type = $3,
    scheduled_date = $4,
    scheduled_time = $5,
    target_duration_minutes = $6,
    focus_text = nullif(trim(coalesce($7, '')), ''),
    preparation_notes = nullif(trim(coalesce($8, '')), ''),
    updated_at = clock_timestamp()
  where id = $1;

  delete from public.planned_exercises
  where workout_plan_id = $1;

  for v_exercise_item in
    select value
    from jsonb_array_elements($9)
  loop
    v_exercise_name := trim(coalesce(v_exercise_item->>'name', ''));
    v_exercise_type := v_exercise_item->>'type';
    v_exercise_count := greatest(1, least(20, coalesce(nullif(v_exercise_item->>'setCount', '')::integer, 1)));

    if length(v_exercise_name) = 0 then
      raise exception 'Exercise name is required' using errcode = '23514';
    end if;

    if v_exercise_type not in ('strength', 'cardio', 'running', 'tennis', 'pilates', 'other') then
      raise exception 'Invalid exercise type' using errcode = '23514';
    end if;

    v_exercise_position := v_exercise_position + 1;

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
      $1,
      v_exercise_position,
      v_exercise_name,
      nullif(trim(coalesce(v_exercise_item->>'variation', '')), ''),
      v_exercise_type,
      nullif(trim(coalesce(v_exercise_item->>'equipment', '')), ''),
      coalesce((v_exercise_item->>'required')::boolean, true),
      nullif(trim(coalesce(v_exercise_item->>'note', '')), '')
    )
    returning id into v_planned_exercise_id;

    for v_set_position in 1..v_exercise_count loop
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
        v_planned_exercise_id,
        v_set_position,
        nullif(v_exercise_item->>'weight', '')::numeric,
        nullif(v_exercise_item->>'reps', '')::integer,
        nullif(v_exercise_item->>'durationSeconds', '')::integer,
        nullif(v_exercise_item->>'distanceM', '')::numeric,
        nullif(v_exercise_item->>'rpe', '')::smallint,
        nullif(v_exercise_item->>'rir', '')::smallint,
        nullif(v_exercise_item->>'restSeconds', '')::integer
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
