# Wellness Journal TODO

## Sprint 1: Foundation

- [x] Initialize Next.js App Router frontend with TypeScript strict mode.
- [x] Add Tailwind CSS, minimal shadcn-style primitives, and warm mobile-first design tokens.
- [x] Build `/login`, `/today`, `/settings/access`, `/auth/callback`, and `/` redirect behavior.
- [x] Add Supabase browser/server clients using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [x] Add Google OAuth and Email Magic Link sign-in actions.
- [x] Add auth refresh/protected-route proxy.
- [x] Add owner/coach foundation tables with RLS.
- [x] Add private storage bucket migration notes and policies.
- [x] Add root npm scripts so `npm run dev` works from the repo root.
- [x] Verify `npm run lint`, `npm run typecheck`, and `npm run build`.
- [x] Remove hard-coded owner name from the UI and support a local display-name setting.
- [ ] Persist display name in Supabase owner profile after real login is enabled.

## Setup / Deployment

- [x] Create Supabase project.
- [x] Apply `supabase/migrations/001_foundation.sql`.
- [x] Configure Supabase Auth redirect URLs for localhost.
- [ ] Configure Supabase Auth redirect URLs for production.
- [ ] Configure Google OAuth in Google Cloud and Supabase.
- [x] Fill `frontend/.env.local` for real local login.
- [ ] Push repository to GitHub.
- [ ] Create Vercel project from the GitHub repository.
- [ ] Add Vercel environment variables.
- [ ] Confirm production login and `/today` redirect.
- [ ] Test on iPhone Safari and iPhone Add to Home Screen.

## Sprint 2: Body Metrics

- [x] Body metric CRUD.
- [x] Body metric create form.
- [x] Body metric edit form.
- [x] Body metric recent-record list.
- [x] Body metric delete action.
- [x] Weight, waist, and BMI.
- [x] Seven-day average.
- [ ] Apply `supabase/migrations/002_body_metrics.sql`.
- [ ] Apply `supabase/migrations/003_body_metrics_inbody.sql`.
- [x] InBody record form for occasional measurements.
- [x] InBody values included in create and edit flow.
- [x] Latest InBody values shown in body summary.
- [x] InBody fields: body_fat_percent, skeletal_muscle_mass_kg, body_fat_mass_kg, waist_hip_ratio, visceral_fat_level, basal_metabolic_rate_kcal.
- [x] Optional InBody JPG attachment for reference only; manual values remain the source of truth.
- [ ] Mobile-safe trend charts.
- [ ] Gentle empty/error states.

## Sprint 3: Meals

- [x] Meal CRUD with photo upload.
- [x] Meal create form.
- [x] Meal edit form.
- [x] Meal recent-record list.
- [x] Meal delete action.
- [x] Client-side WebP compression.
- [x] Compress meal photos to max 1280px wide and 500KB.
- [x] Private storage path and signed URL display.
- [ ] Apply `supabase/migrations/004_meal_entries.sql`.
- [ ] Copy previous meal.
- [ ] Delete orphaned display/thumbnail files.

## Sprint 4: Manual Workouts

- [x] Shared workout model for planned and completed sessions.
- [x] Workout session CRUD.
- [x] Dynamic exercises and generated sets.
- [x] Strength, cardio, Pilates, running, tennis, and custom workout fields.
- [x] Weight, set count, reps, duration, and intensity tracking.
- [x] Session-level and exercise-level pain notes.
- [ ] Apply `supabase/migrations/005_workout_sessions.sql`.
- [ ] Per-set inline editing/check flow.

## Sprint 5: Workout Planning

- [ ] Workout plan, planned exercises, and planned sets schema.
- [ ] Week navigator and iPhone day chips.
- [ ] Four-step plan creation wizard.
- [ ] Clone plan, clone previous week, reschedule, skip, and cancel.
- [ ] Coach `manage_plans` permission.

## Sprint 6: Check-Based Workout Execution

- [ ] `start_workout_plan` transaction.
- [ ] Lock planned snapshot and create one actual session.
- [ ] One-tap set completion with undo.
- [ ] Inline actual value editing without changing planned values.
- [ ] Per-set and per-exercise notes for pain, old injuries, fatigue, and equipment constraints.
- [ ] Allow post-workout editing of RPE, pain score, time, and notes so logging does not interrupt training.
- [ ] Autosave, pause/resume, partial completion, and summary.

## Sprint 7: Coach

- [ ] Coach relationship lifecycle.
- [ ] Coach read access and feedback.
- [ ] Weekly goals.
- [ ] Plan adherence summary and attention list.
- [ ] Access revocation.

## Sprint 8: Photo Storage Optimization

- [ ] Adaptive WebP compression.
- [ ] Display target 80-180KB, hard limit 500KB.
- [ ] Thumbnail target 15-40KB.
- [ ] HEIC/HEIF iPhone validation.
- [ ] Storage usage estimate and orphan cleanup.

## Sprint 9: Polish

- [ ] PWA metadata and install behavior.
- [ ] Loading skeletons and error boundaries.
- [ ] Accessibility pass, including VoiceOver basics.
- [ ] Export and backup flows.
- [ ] Deployment hardening.
