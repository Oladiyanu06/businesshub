# Deployment (Vercel)

The Next.js application is deployed on Vercel. Supabase remains the database/auth
provider, so tenant data lives in the cloud and the app stays reachable even when
the local PC is off.

## Current production

| Item | Value |
| --- | --- |
| Vercel project | `wnh/businesshub` |
| Production URL | https://businesshub-pi.vercel.app |
| Supabase project | your-project-ref |
| Runtime | Next.js 16.4.5 (App Router, `src/proxy.ts`) |

Only the production alias is public. Per-deployment URLs
(`businesshub-<hash>-wnh.vercel.app`) keep Vercel Authentication protection; that
is intentional and does not affect the production alias.

## Environment variables

Set in Vercel for **Production**, **Preview** and **Development**:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret key for admin operations |
| `NEXT_PUBLIC_APP_URL` | Public base URL used for absolute links |

The service role/secret key must never be exposed to the browser. It is only
imported through `src/lib/env.ts`, which is marked `server-only`.

## Deploying

```powershell
cd C:\Users\HomePC\Desktop\businesshub
vercel.cmd                       # preview deployment (optional)
vercel.cmd deploy --prod --yes   # production
```

The CLI uploads the working tree (no Git required). `.vercelignore` keeps
`node_modules`, `.next`, SQL migrations, docs, tests and env files out of the
upload.

> Careful: entries in `.vercelignore` follow gitignore matching. A bare
> `supabase` also excludes `src/lib/supabase/**` and breaks the build with
> `Module not found: Can't resolve '@/lib/supabase/server'`. Keep root folders
> anchored, e.g. `/supabase`.

## Supabase Auth configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

- **Site URL**: `https://businesshub-pi.vercel.app`
- **Redirect URLs**:
  - `https://businesshub-pi.vercel.app/auth/confirm`
  - `http://localhost:3000/auth/confirm` (local development)

Password sign-in works without this, but email confirmation, invite and recovery
links are only accepted when the redirect target is allow-listed.

## Post-deploy smoke test

```powershell
$base = 'https://businesshub-pi.vercel.app'
curl.exe -s -o NUL -w "%{http_code}`n" "$base/login"          # 200
curl.exe -s -o NUL -w "%{http_code}`n" "$base/app"            # 307 -> /login?next=%2Fapp
curl.exe -s -o NUL -w "%{http_code}`n" "$base/manifest.webmanifest" # 200
curl.exe -s -o NUL -w "%{http_code}`n" "$base/sw.js"          # 200, Service-Worker-Allowed: /
```

Then sign in as the platform administrator, open `/platform`, provision a test
business, and sign in as that business's administrator to confirm tenant
isolation. Delete the test business afterwards.

## Operations

- Build/runtime logs: `vercel.cmd inspect <deployment-url> --logs` or the Vercel dashboard.
- Environment values are stored encrypted by Vercel; `vercel.cmd env ls` shows names only.
- Rollback: promote an earlier deployment from the Vercel dashboard
  (Deployments -> ... -> Promote to Production).
- There is no Git remote connected, so deploys happen from this machine with the CLI.

## Custom domain

1. Add the domain in Vercel: `vercel.cmd domains add <domain>`.
2. Point DNS at Vercel (`A 76.76.21.21` or the `CNAME` Vercel shows).
3. Update `NEXT_PUBLIC_APP_URL` and the Supabase Auth URLs to the new domain, then redeploy.
