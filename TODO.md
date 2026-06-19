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

- [ ] Create Supabase project.
- [ ] Apply `supabase/migrations/001_foundation.sql`.
- [ ] Configure Supabase Auth redirect URLs for localhost and production.
- [ ] Configure Google OAuth in Google Cloud and Supabase.
- [ ] Fill `frontend/.env.local` for real local login.
- [ ] Push repository to GitHub.
- [ ] Create Vercel project from the GitHub repository.
- [ ] Add Vercel environment variables.
- [ ] Confirm production login and `/today` redirect.
- [ ] Test on iPhone Safari and iPhone Add to Home Screen.

## Sprint 2: Body Metrics

- [ ] Body metric CRUD.
- [ ] Weight, waist, BMI, and seven-day average.
- [ ] InBody record form for occasional measurements.
- [ ] InBody fields: measured_at, body_weight_kg, body_fat_percent, skeletal_muscle_mass_kg, body_fat_mass_kg, visceral_fat_level, inbody_score, basal_metabolic_rate_kcal, note.
- [ ] Optional InBody photo attachment for reference only; manual values remain the source of truth.
- [ ] Mobile-safe trend charts.
- [ ] Gentle empty/error states.

## Sprint 3: Meals

- [ ] Meal CRUD with photo upload.
- [ ] Client-side WebP compression.
- [ ] Private storage and signed URLs.
- [ ] Copy previous meal.
- [ ] Delete orphaned display/thumbnail files.

## Sprint 4: Manual Workouts

- [ ] Workout session CRUD.
- [ ] Dynamic exercises and sets.
- [ ] Strength, cardio, Pilates, running, tennis, and custom workout fields.
- [ ] Volume, RPE, and pain tracking.

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
- [ ] Display target 80-180KB, hard limit 250KB.
- [ ] Thumbnail target 15-40KB.
- [ ] HEIC/HEIF iPhone validation.
- [ ] Storage usage estimate and orphan cleanup.

## Sprint 9: Polish

- [ ] PWA metadata and install behavior.
- [ ] Loading skeletons and error boundaries.
- [ ] Accessibility pass, including VoiceOver basics.
- [ ] Export and backup flows.
- [ ] Deployment hardening.
