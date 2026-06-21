create or replace function public.can_manage_workout_plans(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() = target_owner_id
    or exists (
      select 1
      from public.coach_relationships cr
      where cr.owner_id = target_owner_id
        and cr.coach_id = auth.uid()
        and cr.status = 'active'
        and cr.manage_plans = true
    );
$$;

revoke all on function public.can_manage_workout_plans(uuid) from public;
grant execute on function public.can_manage_workout_plans(uuid) to authenticated;

drop policy if exists "owners can read own workout plans" on public.workout_plans;
drop policy if exists "owners can insert own workout plans" on public.workout_plans;
drop policy if exists "owners can update unlocked workout plans" on public.workout_plans;
drop policy if exists "owners can delete unlocked workout plans" on public.workout_plans;
drop policy if exists "owners can read own planned exercises" on public.planned_exercises;
drop policy if exists "owners can insert exercises into unlocked plans" on public.planned_exercises;
drop policy if exists "owners can update exercises in unlocked plans" on public.planned_exercises;
drop policy if exists "owners can delete exercises from unlocked plans" on public.planned_exercises;
drop policy if exists "owners can read own planned sets" on public.planned_sets;
drop policy if exists "owners can insert sets into unlocked plans" on public.planned_sets;
drop policy if exists "owners can update sets in unlocked plans" on public.planned_sets;
drop policy if exists "owners can delete sets from unlocked plans" on public.planned_sets;

create policy "authorized users can read workout plans"
on public.workout_plans for select
to authenticated
using (public.can_manage_workout_plans(owner_id));

create policy "authorized users can insert workout plans"
on public.workout_plans for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_manage_workout_plans(owner_id)
);

create policy "authorized users can update unlocked workout plans"
on public.workout_plans for update
to authenticated
using (
  public.can_manage_workout_plans(owner_id)
  and status = 'planned'
  and locked_at is null
)
with check (public.can_manage_workout_plans(owner_id));

create policy "authorized users can delete unlocked workout plans"
on public.workout_plans for delete
to authenticated
using (
  public.can_manage_workout_plans(owner_id)
  and status = 'planned'
  and locked_at is null
);

create policy "authorized users can read planned exercises"
on public.planned_exercises for select
to authenticated
using (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and public.can_manage_workout_plans(wp.owner_id)
  )
);

create policy "authorized users can insert planned exercises"
on public.planned_exercises for insert
to authenticated
with check (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and public.can_manage_workout_plans(wp.owner_id)
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "authorized users can update planned exercises"
on public.planned_exercises for update
to authenticated
using (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and public.can_manage_workout_plans(wp.owner_id)
      and wp.status = 'planned'
      and wp.locked_at is null
  )
)
with check (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and public.can_manage_workout_plans(wp.owner_id)
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "authorized users can delete planned exercises"
on public.planned_exercises for delete
to authenticated
using (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and public.can_manage_workout_plans(wp.owner_id)
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "authorized users can read planned sets"
on public.planned_sets for select
to authenticated
using (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and public.can_manage_workout_plans(wp.owner_id)
  )
);

create policy "authorized users can insert planned sets"
on public.planned_sets for insert
to authenticated
with check (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and public.can_manage_workout_plans(wp.owner_id)
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "authorized users can update planned sets"
on public.planned_sets for update
to authenticated
using (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and public.can_manage_workout_plans(wp.owner_id)
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
      and public.can_manage_workout_plans(wp.owner_id)
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "authorized users can delete planned sets"
on public.planned_sets for delete
to authenticated
using (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and public.can_manage_workout_plans(wp.owner_id)
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);
