alter table public.coach_relationships
alter column coach_id drop not null;

alter table public.coach_relationships
add column if not exists invited_email text,
add column if not exists invite_token uuid unique,
add column if not exists accepted_at timestamptz,
add column if not exists updated_at timestamptz not null default now();

alter table public.coach_relationships
drop constraint if exists coach_relationships_status_check;

alter table public.coach_relationships
add constraint coach_relationships_status_check
check (status in ('pending', 'active', 'revoked'));

alter table public.coach_feedback
add column if not exists target_type text check (target_type is null or target_type in ('general', 'plan', 'workout', 'meal', 'body')),
add column if not exists target_id uuid;

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  week_start date not null,
  title text not null check (length(trim(title)) > 0),
  note text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weekly_goals enable row level security;

create index if not exists weekly_goals_owner_week_idx
on public.weekly_goals (owner_id, week_start desc);

create or replace function public.can_view_owner_data(target_owner_id uuid)
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
    );
$$;

create or replace function public.accept_coach_invitation(target_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_relationship public.coach_relationships%rowtype;
  existing_relationship_id uuid;
  signed_in_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into target_relationship
  from public.coach_relationships
  where invite_token = target_token
  for update;

  if not found or target_relationship.status <> 'pending' then
    raise exception 'Invitation is invalid or no longer pending' using errcode = 'P0001';
  end if;

  signed_in_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if target_relationship.invited_email is not null
    and lower(target_relationship.invited_email) <> signed_in_email then
    raise exception 'Sign in with the invited email address' using errcode = '42501';
  end if;

  select id into existing_relationship_id
  from public.coach_relationships
  where owner_id = target_relationship.owner_id
    and coach_id = auth.uid()
    and id <> target_relationship.id
  limit 1;

  if existing_relationship_id is not null then
    update public.coach_relationships
    set
      status = 'active',
      manage_plans = target_relationship.manage_plans,
      revoked_at = null,
      accepted_at = clock_timestamp(),
      updated_at = clock_timestamp()
    where id = existing_relationship_id;
    delete from public.coach_relationships where id = target_relationship.id;
    return existing_relationship_id;
  end if;

  update public.coach_relationships
  set coach_id = auth.uid(), status = 'active', accepted_at = clock_timestamp(), updated_at = clock_timestamp()
  where id = target_relationship.id;
  return target_relationship.id;
end;
$$;

revoke all on function public.can_view_owner_data(uuid) from public;
revoke all on function public.accept_coach_invitation(uuid) from public;
grant execute on function public.can_view_owner_data(uuid) to authenticated;
grant execute on function public.accept_coach_invitation(uuid) to authenticated;

drop policy if exists "owners can read own coach relationships" on public.coach_relationships;
drop policy if exists "owners can manage own coach relationships" on public.coach_relationships;

create policy "relationship participants can read"
on public.coach_relationships for select
to authenticated
using (owner_id = auth.uid() or coach_id = auth.uid());

create policy "owners can create coach invitations"
on public.coach_relationships for insert
to authenticated
with check (owner_id = auth.uid() and coach_id is null and status = 'pending');

create policy "owners can update coach relationships"
on public.coach_relationships for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners can delete coach relationships"
on public.coach_relationships for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "owners can read self" on public.app_owners;
create policy "owners and active coaches can read owner profile"
on public.app_owners for select
to authenticated
using (public.can_view_owner_data(user_id));

drop policy if exists "owners can read own body metrics" on public.body_metrics;
create policy "owners and coaches can read body metrics"
on public.body_metrics for select
to authenticated
using (public.can_view_owner_data(owner_id));

drop policy if exists "owners can read own meal entries" on public.meal_entries;
create policy "owners and coaches can read meal entries"
on public.meal_entries for select
to authenticated
using (public.can_view_owner_data(owner_id));

drop policy if exists "owners can read own workout sessions" on public.workout_sessions;
create policy "owners and coaches can read workout sessions"
on public.workout_sessions for select
to authenticated
using (public.can_view_owner_data(owner_id));

drop policy if exists "owners can read own workout exercises" on public.workout_exercises;
create policy "owners and coaches can read workout exercises"
on public.workout_exercises for select
to authenticated
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_exercises.session_id
      and public.can_view_owner_data(ws.owner_id)
  )
);

drop policy if exists "owners can read own workout sets" on public.workout_sets;
create policy "owners and coaches can read workout sets"
on public.workout_sets for select
to authenticated
using (
  exists (
    select 1
    from public.workout_exercises we
    join public.workout_sessions ws on ws.id = we.session_id
    where we.id = workout_sets.exercise_id
      and public.can_view_owner_data(ws.owner_id)
  )
);

drop policy if exists "authorized users can read workout plans" on public.workout_plans;
create policy "owners and coaches can read workout plans"
on public.workout_plans for select
to authenticated
using (public.can_view_owner_data(owner_id));

drop policy if exists "authorized users can read planned exercises" on public.planned_exercises;
create policy "owners and coaches can read planned exercises"
on public.planned_exercises for select
to authenticated
using (
  exists (
    select 1 from public.workout_plans wp
    where wp.id = planned_exercises.workout_plan_id
      and public.can_view_owner_data(wp.owner_id)
  )
);

drop policy if exists "authorized users can read planned sets" on public.planned_sets;
create policy "owners and coaches can read planned sets"
on public.planned_sets for select
to authenticated
using (
  exists (
    select 1
    from public.planned_exercises pe
    join public.workout_plans wp on wp.id = pe.workout_plan_id
    where pe.id = planned_sets.planned_exercise_id
      and public.can_view_owner_data(wp.owner_id)
  )
);

create policy "owners and coaches can read weekly goals"
on public.weekly_goals for select
to authenticated
using (public.can_view_owner_data(owner_id));

create policy "owners and coaches can create weekly goals"
on public.weekly_goals for insert
to authenticated
with check (created_by = auth.uid() and public.can_view_owner_data(owner_id));

create policy "owners and coaches can update weekly goals"
on public.weekly_goals for update
to authenticated
using (public.can_view_owner_data(owner_id))
with check (public.can_view_owner_data(owner_id));

create policy "owners and coaches can delete weekly goals"
on public.weekly_goals for delete
to authenticated
using (public.can_view_owner_data(owner_id));
