# The Cravings Cafe deployment guide

This guide prepares the existing React/Vite and FastAPI application for Vercel
and Render. It does not create a Vercel or Render account, provision a
database, configure DNS, or make the site live.

## Current status

- The Vercel SPA rewrite is configured in `frontend/vercel.json`, so routes
  such as `/menu`, `/admin/dashboard`, and `/reset-password` can be opened
  directly.
- `frontend/.env.production` currently points `VITE_API_URL` at
  `https://the-cravings-cafe-api.onrender.com`. That URL is existing
  configuration, not proof of a working deployment. The hosted health check
  could not be confirmed during this preparation.
- The local backend health endpoint returned `200` with a connected database
  at `http://127.0.0.1:8000/health`.
- No production frontend domain has been selected or verified. Do not add a
  guessed domain to DNS, CORS, reset links, canonical metadata, or a sitemap.

## Before deploying

1. Choose the canonical public frontend domain (or use the Vercel-provided
   domain initially).
2. Decide whether to keep using the existing PostgreSQL database or migrate
   its data to a newly provisioned managed PostgreSQL database.
3. Back up the current database before changing database providers or
   connection settings. Never point production at a new empty database if it
   is meant to contain existing cafe records.
4. Select service/database regions and plans deliberately. Render's `free`
   web-service plan is configured in `render.yaml`; it may sleep when idle
   and introduce a cold start. Managed PostgreSQL pricing and availability
   are separate—this file does not provision a database.

The backend uses PostgreSQL (`DATABASE_URL`), not the ignored
`backend/app/cafe.db` file. Startup applies idempotent `CREATE TABLE IF NOT
EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements. These
create missing tables and add the existing optional email columns without
dropping or recreating existing cafe tables or rows. The deployment service
must use the intended PostgreSQL database and a role with the required
schema/table permissions.

## 1. Configure and deploy the backend on Render

Because production requires a verified `FRONTEND_URL`, first create the
Vercel project and its initial deployment (or assign its domain) so you know
the exact HTTPS origin. The static frontend can be deployed before the API,
but API-powered sections will show connection errors until the backend is
available.

1. Push this repository to the Git provider connected to Render.
2. In Render, create a **Blueprint** from the repository and review
   `render.yaml` before applying it. The web service root is `backend`; its
   build command installs the pinned requirements and its start command
   binds Uvicorn to Render's `$PORT`. If a service already exists at the
   configured Render URL, update that service or deliberately choose a new
   service URL rather than creating a duplicate.
3. Provision or select a managed PostgreSQL database in a compatible region.
   If the API and database are both on Render, use the database's internal
   connection URL when available. Otherwise use the provider's external
   PostgreSQL URL.
4. Set the following backend environment variables in the Render dashboard.
   Do not put secret values in Git, Vercel, or frontend environment files.

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` (set by the Blueprint) |
| `DATABASE_URL` | The intended PostgreSQL connection URL; never commit it |
| `DB_SSLMODE` | `require` (set by the Blueprint; change only if the provider requires it) |
| `SECRET_KEY` | A unique random secret of at least 32 characters |
| `ADMIN_EMAIL` | The admin email address used for login and password reset |
| `ADMIN_USERNAME` | The admin username used for login |
| `ADMIN_PASSWORD_HASH` | A PBKDF2 hash, not the plaintext admin password |
| `FRONTEND_URL` | The exact deployed frontend origin, e.g. `https://your-verified-domain.example` |
| `CORS_ORIGINS` | Comma-separated exact frontend origins; include apex and `www` only if configured |

Generate a signing secret locally and enter its output directly into Render's
secret field:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Generate the initial admin password hash from `backend` with the existing
interactive helper. It prompts for the password without echoing it:

```powershell
cd D:\Projects\the-cravings-cafe\backend
.\.venv\Scripts\python.exe make_admin_hash.py
```

Copy only the printed `ADMIN_PASSWORD_HASH=...` value into Render. Do not
store or share the password itself. After the first successful password
reset, the backend stores the new hash in `admin_auth_state`; that database
hash takes precedence over `ADMIN_PASSWORD_HASH`.

The production CORS middleware allows only the configured exact origins and
rejects wildcard origins. `FRONTEND_URL` must be an origin, with no path,
query, or trailing route. If the frontend uses both apex and `www` domains,
set both in `CORS_ORIGINS`; use the primary origin in `FRONTEND_URL`.

### Password-reset email

Production reset links are emailed only when SMTP is configured. Add these
variables to the **backend service** in Render; never add them to Vercel:

| Variable | Example / purpose |
| --- | --- |
| `SMTP_HOST` | SMTP provider hostname |
| `SMTP_PORT` | Usually `587` for STARTTLS or `465` for implicit TLS |
| `SMTP_USER` | Provider-issued SMTP username, if required |
| `SMTP_PASSWORD` | Provider-issued SMTP password/API credential |
| `SMTP_FROM` | Verified sender address |
| `SMTP_USE_SSL` | `false` for port 587; `true` for port 465 |

Without SMTP, production still returns a generic response and does not reveal
or return a reset URL. The reset URL is returned only when `APP_ENV` is
development.

After deployment, check the provider's service logs for startup/database
errors, then verify `https://<actual-render-service-host>/health` returns
HTTP 200 and `{"status":"healthy","database":"connected"}`. Use the actual
host shown by Render; do not assume the existing configured URL is healthy.

## 2. Deploy the frontend on Vercel

1. Import the same Git repository in Vercel.
2. Set the project **Root Directory** to `frontend`. Vercel detects Vite;
   the build command is `npm run build` and the output directory is `dist`.
3. In Vercel's environment-variable settings, add:

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | The confirmed public Render API origin, e.g. `https://<actual-render-service-host>` |

   `VITE_API_URL` is public frontend configuration, not a secret. The
   frontend has no production localhost fallback. A missing value causes API
   requests to show an error rather than silently contacting localhost.
4. Deploy or redeploy after setting the variable; Vite embeds it at build
   time. Update the checked-in `frontend/.env.production` value if the
   confirmed API host differs from the existing one.
5. Verify the Vercel deployment and direct navigation to `/menu`,
   `/book-table`, `/cart`, `/forgot-password`, and `/admin/dashboard`.

## 3. Add a custom domain and HTTPS

1. Choose and register a domain; no domain is assumed by this repository.
2. Add it in Vercel's project domain settings and follow the exact DNS
   records Vercel displays at your DNS provider. Do not guess A, CNAME, or
   nameserver values.
3. Choose one canonical host in Vercel and configure any `www`/apex redirect
   there.
4. Wait for Vercel to verify DNS and issue HTTPS. Open the HTTPS URL and
   check the certificate before advertising it.
5. Update Render's `FRONTEND_URL` and `CORS_ORIGINS` to the verified HTTPS
   origin(s), then redeploy/restart the backend. Update Vercel's
   `VITE_API_URL` only if the backend host changed, and redeploy.

## SEO and social previews

The frontend has a descriptive page title/description, dynamic page
title/description updates, Open Graph title/description, a social-card type,
a favicon, and a `robots.txt` that excludes admin and password-reset routes
from indexing. A sitemap is intentionally not included until a canonical
domain is selected; add it using only verified public URLs and reference it
from `robots.txt` after that domain is confirmed.

## Local development commands

Keep any existing `backend/.env` safe; do not overwrite it. For a fresh
checkout, copy `backend/.env.example` to `backend/.env` and replace every
placeholder with local values. Generate a local signing key with
`python -c "import secrets; print(secrets.token_urlsafe(48))"` and generate
the admin hash using the helper above. Set `APP_ENV=development` and
`FRONTEND_URL=http://localhost:5173` to enable the local-only reset-link
response. SMTP is optional for this local flow.

Backend (PowerShell):

```powershell
cd D:\Projects\the-cravings-cafe\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend (a second PowerShell window):

```powershell
cd D:\Projects\the-cravings-cafe\frontend
npm install
npm run dev
```

The local URLs are:

- Customer site: `http://localhost:5173`
- Admin login: `http://localhost:5173/admin`
- Admin dashboard: `http://localhost:5173/admin/dashboard`
- Forgot password: `http://localhost:5173/forgot-password`
- Backend health: `http://127.0.0.1:8000/health`
- Backend API docs: `http://127.0.0.1:8000/docs`

For a local frontend `.env`, copy `frontend/.env.example` to
`frontend/.env.local` if the frontend must call a non-default local API.
Vite's development default is already `http://127.0.0.1:8000`.

## Post-deployment smoke checks

1. Open the public site's `/` and `/menu`, then confirm menu content loads.
2. Check the public API `/health` endpoint returns HTTP 200 and database
   connected status.
3. Submit a small test booking/order only after confirming the selected
   database and agreeing that these test records may be stored; remove test
   records through the application if desired.
4. Sign in to `/admin`, verify the dashboard and protected API data, then
   log out.
5. Verify `/book-table`, customer reviews, menu management, and manual sales
   using non-sensitive test data.
6. Use `/forgot-password` with the configured admin email. In production,
   verify delivery to the mailbox; in local development, open the returned
   reset URL. Set a new password and confirm login works only with it.
7. Confirm a direct refresh on `/admin/dashboard` works and does not return
   a Vercel 404.
8. Inspect browser console/network errors and Render logs. Do not paste
   reset URLs, credentials, JWTs, database URLs, or SMTP secrets into issue
   reports.

## Production readiness checklist

- [ ] Existing cafe data is backed up and the service points to the intended
  PostgreSQL database.
- [ ] Backend health is verified on its actual public Render URL.
- [ ] Render secrets and admin credentials are set only in the backend
  service environment.
- [ ] SMTP has been configured and verified if admins must reset passwords
  in production.
- [ ] The actual Vercel frontend origin is set for `FRONTEND_URL` and
  `CORS_ORIGINS`.
- [ ] Vercel `VITE_API_URL` points at the confirmed public backend.
- [ ] The intended domain and HTTPS have been verified before publication.
- [ ] Provider plan, database backups/retention, and cold-start/availability
  requirements have been reviewed.
- [ ] A sitemap is added only after the canonical public domain is known.
