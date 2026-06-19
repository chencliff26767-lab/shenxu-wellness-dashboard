create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  eaten_on date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  title text not null check (length(trim(title)) > 0),
  note text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meal_entries enable row level security;

create index if not exists meal_entries_owner_eaten_on_idx
on public.meal_entries (owner_id, eaten_on desc, created_at desc);

create policy "owners can read own meal entries"
on public.meal_entries for select
to authenticated
using (owner_id = auth.uid());

create policy "owners can insert own meal entries"
on public.meal_entries for insert
to authenticated
with check (owner_id = auth.uid());

create policy "owners can update own meal entries"
on public.meal_entries for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners can delete own meal entries"
on public.meal_entries for delete
to authenticated
using (owner_id = auth.uid());
