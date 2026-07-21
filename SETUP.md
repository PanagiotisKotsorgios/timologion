# e-timologio — Setup (Phase 1)

Phase 1 delivers the app foundation: auth, multi-tenant businesses, roles,
onboarding, Starter dashboard, clients, items (services/products), document
drafts, and a Wrapp connection status page backed by a **typed stub client**.
Real Wrapp API calls arrive in Phase 2 — see `README.md` for the full roadmap.

## Requirements

- Node.js 20.11+ (Next.js 15 requires ≥ 18.18, but 20+ recommended).
- MySQL 8.x running locally (a `root` user with password `root` on
  `localhost:3306` matches the default `.env.example`; change as needed).
- `npm` (or `pnpm` / `yarn` — commands below use `npm`).

## First-time setup

```powershell
# 1) Copy the env template and edit values.
Copy-Item .env.example .env

# 2) Generate a strong SESSION_SECRET (paste into .env).
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3) Install dependencies.
npm install

# 4) Create the database and apply schema.
#    Make sure the database referenced in DATABASE_URL exists first, e.g.:
#      mysql -u root -p -e "CREATE DATABASE etimologio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm run db:migrate -- --name init

# 5) Start the dev server.
npm run dev
```

Open http://localhost:3000. Register a user, complete the business onboarding
wizard, and you land on the Starter dashboard.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server with HMR |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Strict TypeScript check |
| `npm run lint` | Next.js ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create + apply a new migration |
| `npm run db:studio` | Prisma Studio (DB browser) |

## Environment variables

See `.env.example`. Required:

- `DATABASE_URL` — MySQL connection string.
- `SESSION_SECRET` — ≥ 32 chars, used for HMAC of session tokens.

Wrapp credentials are read but unused in Phase 1 (`WRAPP_API_KEY` may be blank).

## Phase 1 scope

Implemented:

- Public landing page and `/login`, `/register`.
- Argon2id password hashing (via `@node-rs/argon2`).
- Server-side sessions (opaque token, HMAC hashed at rest, httpOnly cookie).
- Business onboarding, membership + role, business switcher in topbar.
- Middleware bounces unauth'd users away from `/app/*` fast.
- Tenant scoping helper `requireTenant()` + role helper `assertCan(role, action)`.
- Audit log entries for login/register, business/create/update, client CRUD,
  item CRUD, document drafts, member invite / role change, Wrapp status refresh.
- Clients CRUD with mocked VAT lookup (Wrapp stub).
- Items (services & products) CRUD.
- Document drafts: list, filter by status, create with dynamic line editor,
  server-recomputed totals, detail page. Issuance shows the "not activated"
  Greek error the README specifies.
- Settings pages: business profile, Wrapp status, users/roles.

Not in scope for Phase 1:

- Real Wrapp API calls (login, tenant_details, invoice issuance, PDFs, webhooks).
- Marketing pages beyond a single landing route.
- Email/PDF generation, payments, expenses, reports, POS, CRM, appointments.
- MFA, OAuth, password reset flow.
- E2E test harness.

## Legal / product wording

The app never presents itself as an official ΥΠΑΗΕΣ provider. Wrapp remains the
certified provider; issuance, φοροσήμανση, MARK/UID/QR, and myDATA transmission
are its responsibility. The onboarding, dashboard, and Wrapp settings pages all
carry this note. Do not remove it.
