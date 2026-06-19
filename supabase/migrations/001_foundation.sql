create table if not exists public.app_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Owner',
  created_at timestamptz not null default now()
);

create table if not exists public.coach_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(user_id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  manage_plans boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (owner_id, coach_id)
);

create table if not exists public.coach_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(user_id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table public.app_owners enable row level security;
alter table public.coach_relationships enable row level security;
alter table public.coach_feedback enable row level security;

create policy "owners can read self"
on public.app_owners for select
to authenticated
using (user_id = auth.uid());

create policy "owners can insert self"
on public.app_owners for insert
to authenticated
with check (user_id = auth.uid());

create policy "owners can read own coach relationships"
on public.coach_relationships for select
to authenticated
using (owner_id = auth.uid() or coach_id = auth.uid());

create policy "owners can manage own coach relationships"
on public.coach_relationships for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners and active coaches can read feedback"
on public.coach_feedback for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.coach_relationships cr
    where cr.owner_id = coach_feedback.owner_id
      and cr.coach_id = auth.uid()
      and cr.status = 'active'
  )
);

create policy "active coaches can create feedback"
on public.coach_feedback for insert
to authenticated
with check (
  coach_id = auth.uid()
  and exists (
    select 1
    from public.coach_relationships cr
    where cr.owner_id = coach_feedback.owner_id
      and cr.coach_id = auth.uid()
      and cr.status = 'active'
  )
);

insert into storage.buckets (id, name, public)
values ('wellness-private', 'wellness-private', false)
on conflict (id) do update set public = false;

create policy "owners can read own private files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'wellness-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners can upload own private files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'wellness-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners can delete own private files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'wellness-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);
