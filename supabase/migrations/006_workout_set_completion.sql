alter table public.workout_sets
add column if not exists completed_at timestamptz;
