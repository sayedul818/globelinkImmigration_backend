# Globelink API

The backend is a modular Express API for Globelink Immigration. Phase 1 provides
the application foundation, environment validation, API versioning, health
checking, centralized errors, and automated tests. The Phase 2 authentication
slice adds persistent users, Argon2id password hashing, JWT access tokens,
httpOnly refresh cookies, RBAC middleware, and protected employee endpoints.

## Development

```sh
npm install
copy .env.example .env
npm run dev
```

The API is available at `http://localhost:4000`.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run seed
```

MongoDB configuration is validated at startup through `MONGODB_URI`. The
server connects to MongoDB before accepting requests. Create a local `.env`
from `.env.example` before starting the server.

## Authentication endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/employees` (CEO, managing director, or super admin)
- `POST /api/v1/auth/employees` (super admin)
- `PATCH /api/v1/auth/employees/:id` (super admin)
- `POST /api/v1/auth/employees/:id/deactivate` (super admin)

## CRM endpoints

- `GET /api/v1/crm/leads`
- `POST /api/v1/crm/leads`
- `PATCH /api/v1/crm/leads/:id`
- `POST /api/v1/crm/leads/:id/assign`
- `POST /api/v1/crm/leads/:id/convert`
- `GET /api/v1/crm/leads/:id/activities`
- `POST /api/v1/crm/leads/:id/consultations`
- `POST /api/v1/crm/leads/:id/follow-ups`

## Education endpoints

- `GET|POST /api/v1/education/countries`
- `PATCH /api/v1/education/countries/:id`
- `GET|POST /api/v1/education/universities`
- `PATCH /api/v1/education/universities/:id`
- `GET|POST /api/v1/education/programs`
- `GET|POST /api/v1/education/intakes`
- `GET|POST /api/v1/education/scholarships`
- `POST /api/v1/education/students`
- `GET|PATCH /api/v1/education/students/:id`
- `GET /api/v1/education/students/:id/scholarship-matches`

## Application and document endpoints

- `GET|POST /api/v1/applications`
- `PATCH /api/v1/applications/:id/status`
- `GET /api/v1/applications/:id/history`
- `GET /api/v1/applications/:id/deadline`
- `GET /api/v1/applications/documents?studentId=<id>`
- `POST /api/v1/applications/documents`
- `PATCH /api/v1/applications/documents/:id/review`

Document uploads currently store validated document metadata and a storage key.
The object-storage adapter will be added when storage credentials and provider
configuration are selected; the API does not claim to upload binary files yet.

## Visa endpoints

- `GET|POST /api/v1/visa/cases`
- `PATCH /api/v1/visa/cases/:id/assign`
- `PATCH /api/v1/visa/cases/:id/status`
- `GET /api/v1/visa/cases/:id/history`
- `GET|POST /api/v1/visa/requirements`
- `GET|POST /api/v1/visa/cases/:id/checklist`
- `GET|POST /api/v1/visa/cases/:id/appointments`

## Finance endpoints

- `GET|POST /api/v1/finance/invoices`
- `PATCH /api/v1/finance/invoices/:id/issue`
- `POST /api/v1/finance/payments`
- `GET /api/v1/finance/invoices/:id/payments`
- `POST /api/v1/finance/refunds`
- `PATCH /api/v1/finance/refunds/:id/approve`
- `PATCH /api/v1/finance/refunds/:id/process`
- `GET|POST /api/v1/finance/expenses`
- `POST /api/v1/finance/commissions`
- `PATCH /api/v1/finance/commissions/:id/approve`

All monetary amounts use integer minor units (for example, cents or paisa)
and must be paired with a three-letter currency code. This avoids
floating-point rounding errors in invoice and payment calculations.

## Student portal and communication endpoints

- `GET /api/v1/portal/me`
- `GET /api/v1/portal/dashboard`
- `GET /api/v1/portal/notifications`
- `PATCH /api/v1/portal/notifications/:id/read`
- `GET|POST /api/v1/portal/tickets`
- `POST /api/v1/portal/tickets/:id/messages`
- `GET /api/v1/portal/staff/tickets`
- `PATCH /api/v1/portal/staff/tickets/:id`
- `POST /api/v1/portal/staff/tickets/:id/messages`

Email delivery is intentionally not claimed as active. The portal creates
in-app notifications and tickets; an email provider and credentials must be
configured before outbound email jobs are added.

## CMS and reporting endpoints

Public:

- `GET /api/v1/cms/pages/:slug`
- `GET /api/v1/cms/blog`
- `GET /api/v1/cms/blog/:slug`
- `POST /api/v1/cms/analytics/events`

Authorized:

- `POST|PATCH /api/v1/cms/pages`
- `POST|PATCH /api/v1/cms/blog`
- `GET /api/v1/cms/reports/overview?from=<date>&to=<date>`
- `GET /api/v1/cms/reports/payments.csv?from=<date>&to=<date>`

Analytics events are stored for reporting. No external analytics provider is
claimed until its credentials and tracking configuration are supplied.

The seed command requires `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
`SEED_ADMIN_FIRST_NAME`, and `SEED_ADMIN_LAST_NAME`. It never supplies a
production password automatically and does not overwrite an existing account.

Optional development demo accounts are created when these variables are set:

```env
SEED_DEMO_COUNSELLOR_PASSWORD=use-a-local-password-of-12-or-more-characters
SEED_DEMO_VISA_OFFICER_PASSWORD=use-a-local-password-of-12-or-more-characters
```

They use these development-only emails:

```text
counsellor.demo@globelink.local
visa.demo@globelink.local
```

The seed command never changes the password of an existing account because it
uses insert-only initialization.

## Deploying to Vercel

The API runs on Vercel as a single serverless function: `api/index.ts` wraps the
same Express app used locally, and `vercel.json` routes every path to it. The
database connection is reused between warm invocations.

1. **MongoDB Atlas → Network Access:** allow `0.0.0.0/0` (Vercel has no fixed IPs).
   Keep a strong database password; access is still protected by credentials.
2. **Create the project:** import this folder in Vercel (Root Directory: `backend`,
   Framework Preset: *Other*), or run `npx vercel` inside `backend/`.
3. **Environment variables** (Production), then redeploy:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Atlas connection string |
   | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | two different random strings, 32+ characters |
   | `CORS_ORIGINS` | optional — defaults to `https://globelinkimmigration.com,https://www.globelinkimmigration.com` in production. Add other origins (e.g. a Lovable preview URL) comma-separated. |
   | `COOKIE_SECURE` | `true` |
   | `COOKIE_SAME_SITE` | `lax` when the API is on `api.globelinkimmigration.com` (recommended); `none` if it stays on `*.vercel.app` |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary |

   The API refuses to start in production with placeholder JWT secrets, a local
   database URL, or `COOKIE_SAME_SITE=none` without `COOKIE_SECURE=true`.
   **Recommended:** add the custom domain `api.globelinkimmigration.com` to the Vercel project
   (Settings → Domains, then the CNAME record Vercel shows at your DNS provider). Then the
   website and API share a site, so the sign-in cookie is first-party and is not blocked by
   Safari or browser third-party-cookie restrictions.
4. **Point the website at the API:** set `VITE_API_URL=https://api.globelinkimmigration.com/api/v1` (or the `*.vercel.app` URL)
   in the frontend's build environment and rebuild it.
5. **Check:** `https://<your-api>.vercel.app/api/v1/health` returns `{"status":"ok", ...}`.

Run `npm run seed` locally (against the Atlas URI) to create the first admin account.

Note: rate limits (sign-in, consultation form) are kept in memory per function
instance, so on Vercel they are best-effort. Use a shared store such as Upstash
Redis if stricter limits are needed.
