alter table public.workout_exercises
add column if not exists fatigue_note text,
add column if not exists equipment_note text;

alter table public.workout_sets
add column if not exists pain_note text,
add column if not exists fatigue_note text,
add column if not exists equipment_note text;

alter table public.workout_sessions
add column if not exists overall_rpe smallint check (overall_rpe is null or overall_rpe between 1 and 10),
add column if not exists pain_score smallint check (pain_score is null or pain_score between 0 and 10),
add column if not exists duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 1440),
add column if not exists paused_at timestamptz,
add column if not exists completed_at timestamptz;

alter table public.workout_sessions
drop constraint if exists workout_sessions_status_check;

alter table public.workout_sessions
add constraint workout_sessions_status_check
check (status in ('planned', 'in_progress', 'paused', 'completed', 'partial', 'skipped', 'draft'));

create or replace function public.finish_workout_session(target_session_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.workout_sessions%rowtype;
  total_sets integer;
  completed_sets integer;
  final_status text;
begin
  select *
  into target_session
  from public.workout_sessions
  where id = target_session_id
  for update;

  if not found then
    raise exception 'Workout session not found' using errcode = 'P0002';
  end if;

  if target_session.owner_id <> auth.uid() then
    raise exception 'Only the owner can finish this workout' using errcode = '42501';
  end if;

  select
    count(ws.id),
    count(ws.id) filter (where ws.completed_at is not null)
  into total_sets, completed_sets
  from public.workout_exercises we
  left join public.workout_sets ws on ws.exercise_id = we.id
  where we.session_id = target_session_id;

  final_status := case
    when total_sets > 0 and completed_sets = total_sets then 'completed'
    else 'partial'
  end;

  update public.workout_sessions
  set
    status = final_status,
    paused_at = null,
    completed_at = clock_timestamp(),
    updated_at = clock_timestamp()
  where id = target_session_id;

  if target_session.workout_plan_id is not null then
    update public.workout_plans
    set
      status = final_status,
      completed_at = clock_timestamp(),
      updated_at = clock_timestamp()
    where id = target_session.workout_plan_id;
  end if;

  return final_status;
end;
$$;

create or replace function public.sync_workout_progress(target_set_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.workout_sessions%rowtype;
  total_sets integer;
  completed_sets integer;
  synced_status text;
begin
  select session.*
  into target_session
  from public.workout_sets ws
  join public.workout_exercises exercise on exercise.id = ws.exercise_id
  join public.workout_sessions session on session.id = exercise.session_id
  where ws.id = target_set_id;

  if not found or target_session.owner_id <> auth.uid() then
    raise exception 'Workout set not found' using errcode = '42501';
  end if;

  if target_session.status not in ('completed', 'partial') then
    return;
  end if;

  select
    count(ws.id),
    count(ws.id) filter (where ws.completed_at is not null)
  into total_sets, completed_sets
  from public.workout_exercises we
  left join public.workout_sets ws on ws.exercise_id = we.id
  where we.session_id = target_session.id;

  synced_status := case
    when total_sets > 0 and completed_sets = total_sets then 'completed'
    else 'partial'
  end;

  update public.workout_sessions
  set status = synced_status, updated_at = clock_timestamp()
  where id = target_session.id;

  if target_session.workout_plan_id is not null then
    update public.workout_plans
    set status = synced_status, updated_at = clock_timestamp()
    where id = target_session.workout_plan_id;
  end if;
end;
$$;

revoke all on function public.finish_workout_session(uuid) from public;
revoke all on function public.sync_workout_progress(uuid) from public;
grant execute on function public.finish_workout_session(uuid) to authenticated;
grant execute on function public.sync_workout_progress(uuid) to authenticated;
