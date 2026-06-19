create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  measured_on date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  waist_cm numeric(5,2) check (waist_cm is null or (waist_cm > 0 and waist_cm < 300)),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.body_metrics enable row level security;

create index if not exists body_metrics_owner_measured_on_idx
on public.body_metrics (owner_id, measured_on desc);

create policy "owners can read own body metrics"
on public.body_metrics for select
to authenticated
using (owner_id = auth.uid());

create policy "owners can insert own body metrics"
on public.body_metrics for insert
to authenticated
with check (owner_id = auth.uid());

create policy "owners can update own body metrics"
on public.body_metrics for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners can delete own body metrics"
on public.body_metrics for delete
to authenticated
using (owner_id = auth.uid());
