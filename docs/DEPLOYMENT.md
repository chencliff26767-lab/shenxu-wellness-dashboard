# Production Deployment

## Prerequisites

- Apply `supabase/migrations/001_foundation.sql` through `012_photo_storage_optimization.sql` in numeric order.
- Confirm production Supabase Auth, database CRUD, RLS, and Storage policies work.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` locally.

## Vercel

1. Import the GitHub repository into Vercel.
2. Set Root Directory to `frontend`.
3. Configure these Production environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_APP_NAME=Wellness Journal
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend. Vercel builds fail when a required production value is absent or invalid.

4. Deploy and verify `https://your-domain.example/api/health` returns `status: ok`.

## Supabase Auth

Set the production Site URL and add these redirect URLs:

```text
https://your-domain.example/auth/callback
https://your-domain.example/**
```

If Google OAuth is enabled, also configure the callback URI shown by the Supabase Google provider in Google Cloud.

## Release Verification

- Sign in, OAuth callback, sign out, and protected-route redirects.
- Owner CRUD for body metrics, meals, workout plans, workout records, and photos.
- Coach invitation, access, edit, revoke, and post-revoke denial.
- Planned and same-day ad-hoc workouts appear together in the weekly view.
- Main/thumbnail photo upload, report export, and empty/error states.
- iPhone Safari PWA install, standalone launch, camera/photo upload, and HEIC handling.
- Security headers are present and `/api/health` exposes no secrets.

## Rollback

Rollback application code from the Vercel deployment history. Database migrations are forward-only: create a corrective migration instead of editing or reverting an applied migration. Rotate the Supabase publishable key if it is exposed.
