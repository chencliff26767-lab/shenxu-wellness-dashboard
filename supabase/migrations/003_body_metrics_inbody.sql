alter table public.body_metrics
  add column if not exists body_fat_percent numeric(5,2) check (body_fat_percent is null or (body_fat_percent >= 0 and body_fat_percent <= 80)),
  add column if not exists skeletal_muscle_mass_kg numeric(5,2) check (skeletal_muscle_mass_kg is null or (skeletal_muscle_mass_kg > 0 and skeletal_muscle_mass_kg < 200)),
  add column if not exists body_fat_mass_kg numeric(5,2) check (body_fat_mass_kg is null or (body_fat_mass_kg >= 0 and body_fat_mass_kg < 300)),
  add column if not exists waist_hip_ratio numeric(4,2) check (waist_hip_ratio is null or (waist_hip_ratio > 0 and waist_hip_ratio < 3)),
  add column if not exists visceral_fat_level numeric(4,1) check (visceral_fat_level is null or (visceral_fat_level >= 0 and visceral_fat_level <= 50)),
  add column if not exists basal_metabolic_rate_kcal integer check (basal_metabolic_rate_kcal is null or (basal_metabolic_rate_kcal > 0 and basal_metabolic_rate_kcal < 10000)),
  add column if not exists inbody_report_path text;
