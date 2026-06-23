# Wellness Journal

Private iPhone-first wellness dashboard for one owner and an authorized coach.

## What Works Now

- `npm run dev` starts the local Next.js app.
- Authentication, body metrics, meals, training plans/records, coach collaboration, photos, reports, and PWA flows are implemented.
- Local demo mode works without Supabase env.
- The login page can set a local display name. For example, setting `Cliff` displays `Cliff Wellness Journal`.
- Supabase Auth, PostgreSQL, Storage, and RLS migrations are included.

Real login, database writes, photo upload, and public phone testing require the documented Supabase and Vercel setup.

## Local Setup

```powershell
npm install
npm run dev
```

Open the printed local URL, usually:

```text
http://localhost:3000
```

The root npm scripts delegate to the Next.js app in `frontend/`.

## Git Account Switching On This Laptop

This laptop may use more than one GitHub account. Set Git identity per repository so commits from this project do not inherit the wrong global user.

1. Check the current repository settings:

```powershell
git remote -v
git config --local user.name
git config --local user.email
```

2. Set this repository to Cliff's GitHub identity:

```powershell
git config user.name "Cliffalaise.07"
git config user.email "chencliff26767@gmail.com"
```

3. Point `origin` to the correct GitHub repository. Use `set-url` if `origin` already exists:

```powershell
git remote set-url origin git@github.com:chencliff26767-lab/shenxu-wellness-dashboard.git
```

If `origin` does not exist yet:

```powershell
git remote add origin git@github.com:chencliff26767-lab/shenxu-wellness-dashboard.git
```

4. If this machine uses an SSH host alias for this account, use the alias in the remote URL:

```powershell
git remote set-url origin git@github.com-chencliff26767-lab:chencliff26767-lab/shenxu-wellness-dashboard.git
```

5. Test which SSH identity GitHub accepts:

```powershell
ssh -T git@github.com
ssh -T git@github.com-chencliff26767-lab
```

6. Confirm before pushing:

```powershell
git remote -v
git config --local --list
git status
```

Only use `--global` when changing the default identity for every repository on the laptop. For this project, prefer local config.

## Local Demo Mode

If Supabase env is empty, the login page shows a local demo button. This is only for UI testing. It does not save records.

Use the display-name field on the login page to personalize the title locally. The saved value stays in browser localStorage for demo mode. A real profile-backed display name should be implemented with the Supabase user profile work.

## Phone Testing Before Deployment

For quick iPhone testing on the same Wi-Fi:

1. Run `npm run dev`.
2. Copy the `Network` URL printed by Next.js, for example `http://172.20.10.2:3000`.
3. Open that URL in iPhone Safari.

This only works while your computer and phone are on the same network and the dev server is running. For stable phone testing anywhere, deploy to Vercel.

## Environment

Copy `frontend/.env.local.example` to `frontend/.env.local` and fill Supabase values when you are ready to test real login.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Wellness Journal
```

Do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend env.

## Supabase Setup

Use Supabase for Auth, PostgreSQL, Storage, and RLS.

1. Create a Supabase project.
2. In Supabase, copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key -> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Wellness Journal
```

4. Apply every file in `supabase/migrations/` in numeric order.
5. In Supabase Auth URL settings, add local redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/**
```

6. Restart the dev server:

```powershell
Ctrl+C
npm run dev
```

Supabase docs:
- https://supabase.com/docs/guides/auth/quickstarts/nextjs
- https://supabase.com/docs/guides/auth/social-login/auth-google

## Google Login Setup

For Google login:

1. Create a Google Cloud project.
2. Configure OAuth consent screen.
3. Create OAuth Client ID for a Web application.
4. Add the redirect URI shown in Supabase Auth / Providers / Google to Google Cloud.
5. Copy Google Client ID and Client Secret into Supabase Auth / Providers / Google.
6. Keep `http://localhost:3000/auth/callback` in the Supabase redirect allow list.

Magic Link can be used first if Google OAuth setup is not ready.

## Vercel Deployment

Use the complete [production deployment runbook](docs/DEPLOYMENT.md). The minimum setup is:

1. Push this repository to GitHub.
2. Create a Vercel project and import the GitHub repository.
3. Set Root Directory to `frontend`.
4. Add Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=https://your-vercel-project.vercel.app
NEXT_PUBLIC_APP_NAME=Wellness Journal
```

5. Deploy.
6. Add production redirect URLs in Supabase Auth URL settings:

```text
https://your-vercel-project.vercel.app/auth/callback
https://your-vercel-project.vercel.app/**
```

7. If Google Login is enabled, also add the production URL/origin in Google Cloud OAuth settings as needed.

Vercel docs:
- https://vercel.com/docs/frameworks/full-stack/nextjs

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
```

## Current Scope

Application sprints are implemented through production hardening. Remaining external deployment and device verification tasks are tracked in `TODO.md`.
