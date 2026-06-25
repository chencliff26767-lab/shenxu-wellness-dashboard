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
  synced_completed_at timestamptz;
begin
  select session.*
  into target_session
  from public.workout_sets ws
  join public.workout_exercises exercise on exercise.id = ws.exercise_id
  join public.workout_sessions session on session.id = exercise.session_id
  where ws.id = target_set_id
  for update of session;

  if not found or target_session.owner_id <> auth.uid() then
    raise exception 'Workout set not found' using errcode = '42501';
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
    when completed_sets > 0 then 'partial'
    else 'in_progress'
  end;
  synced_completed_at := case
    when synced_status = 'completed' then coalesce(target_session.completed_at, clock_timestamp())
    else null
  end;

  update public.workout_sessions
  set
    status = synced_status,
    completed_at = synced_completed_at,
    paused_at = null,
    updated_at = clock_timestamp()
  where id = target_session.id;

  if target_session.workout_plan_id is not null then
    update public.workout_plans
    set
      status = synced_status,
      completed_at = synced_completed_at,
      updated_at = clock_timestamp()
    where id = target_session.workout_plan_id;
  end if;
end;
$$;

revoke all on function public.sync_workout_progress(uuid) from public;
grant execute on function public.sync_workout_progress(uuid) to authenticated;

with progress as (
  select
    we.session_id,
    count(ws.id) as total_sets,
    count(ws.id) filter (where ws.completed_at is not null) as completed_sets,
    max(ws.completed_at) as latest_completed_at
  from public.workout_exercises we
  join public.workout_sets ws on ws.exercise_id = we.id
  group by we.session_id
)
update public.workout_sessions session
set
  status = case
    when progress.completed_sets = progress.total_sets then 'completed'
    when progress.completed_sets > 0 then 'partial'
    else 'in_progress'
  end,
  completed_at = case
    when progress.completed_sets = progress.total_sets
      then coalesce(session.completed_at, progress.latest_completed_at, clock_timestamp())
    else null
  end,
  paused_at = null,
  updated_at = clock_timestamp()
from progress
where session.id = progress.session_id;

update public.workout_plans plan
set
  status = session.status,
  completed_at = session.completed_at,
  updated_at = clock_timestamp()
from public.workout_sessions session
where session.workout_plan_id = plan.id;
