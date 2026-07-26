# Τιμολόγιον — timologion.gr

Ελληνικό online πρόγραμμα ηλεκτρονικής τιμολόγησης για μικρομεσαίες επιχειρήσεις, ελεύθερους επαγγελματίες και μικρές αλυσίδες. Έκδοση τιμολογίων, αποδείξεων και όλων των παραστατικών με άμεση σύνδεση στο **myDATA** της **ΑΑΔΕ** μέσω του πιστοποιημένου παρόχου **Wrapp**.

- **Παραγωγή:** [https://timologion.gr](https://timologion.gr)
- **Υποστήριξη:** [support@timologion.gr](mailto:support@timologion.gr)

---

## Τι κάνει η εφαρμογή

**Έκδοση παραστατικών μέσω myDATA:**
- Τιμολόγια πώλησης & παροχής υπηρεσιών
- Αποδείξεις λιανικής & υπηρεσιών
- Πιστωτικά τιμολόγια
- Δελτία αποστολής
- Προσφορές & προτιμολόγια
- Επαναλαμβανόμενα παραστατικά
- Ενσωμάτωση MARK / UID / QR / Wrapp URL

**Οργάνωση επιχείρησης:**
- Πελατολόγιο με αναζήτηση ΑΦΜ (ΓΓΠΣ / Wrapp VAT search)
- Είδη & υπηρεσίες με κατηγορίες ΦΠΑ
- Εισπράξεις, πληρωμές, χαρακτηρισμός εξοφλημένων
- Αναφορές εσόδων, ΦΠΑ, ανεξόφλητων
- Εξαγωγές σε Excel / CSV
- Ρόλοι ομάδας: owner, admin, accountant, sales, staff, readonly
- Multi-tenant: ένας λογαριασμός → πολλές επιχειρήσεις

**POS & CRM (Advanced πακέτο):**
- Γρήγορη πώληση + θερμική εκτύπωση 80mm
- Τραπέζια & catering flow
- CRM: leads, ευκαιρίες με 5 στάδια pipeline, tasks με reminders
- Απόθεμα ειδών

**Λογαριασμοί & ασφάλεια:**
- Email/password login (Argon2id)
- OAuth: Google
- Επιβεβαίωση email με signed token
- Επαναφορά κωδικού
- MFA (TOTP) για owners/admins
- Encrypted session cookies (httpOnly, sameSite)
- AES-256-GCM για αποθηκευμένα διαπιστευτήρια τρίτων
- Row-level tenant isolation σε όλα τα queries
- Audit log για κρίσιμες ενέργειες
- Rate limiting σε login, password reset, OAuth, VAT search

---

## Τεχνολογίες

| Επίπεδο | Επιλογή |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC, Server Actions) |
| Γλώσσα | TypeScript (strict mode) |
| ORM / DB | Prisma + MySQL 8 |
| Styling | Tailwind CSS 4 + custom design tokens |
| Validation | Zod |
| Auth | Custom session cookies, Argon2id, TOTP, Google OAuth |
| Email | Brevo (transactional) |
| Deployment | Coolify + Docker Compose |
| Node runtime | Node 20+ |

---

## Wrapp integration

Το Wrapp είναι ο πιστοποιημένος πάροχος ηλεκτρονικής τιμολόγησης που κάνει τη φοροσήμανση και τη διαβίβαση στο myDATA. Το Τιμολόγιον διαχειρίζεται τη σχέση με τη Wrapp εκ μέρους του τελικού χρήστη — αυτό σημαίνει:

1. Ο χρήστης εγγράφεται στο Τιμολόγιον (δωρεάν).
2. Όταν είναι έτοιμος για έκδοση, ενεργοποιεί τη σύνδεση Wrapp από το dashboard.
3. Το backend καλεί το partner endpoint `external_login` και ο χρήστης προωθείται στη Wrapp για πληρωμή + υπογραφή σύμβασης.
4. Μόλις ολοκληρώσει, η Wrapp στέλνει webhook με το tenant `api_key` στο `/api/wrapp/webhook`.
5. Το api_key αποθηκεύεται κρυπτογραφημένο (AES-256-GCM) και όλες οι επόμενες κλήσεις (νέο παραστατικό, VAT search, PDF) γίνονται server-side από το backend.

Ο browser δεν βλέπει ποτέ κανένα Wrapp credential.

Το admin UI στο `/admin/wrapp` επιτρέπει την ενημέρωση των partner credentials (base URL, partner API key, webhook secret) χωρίς αλλαγή env vars.

---

## Development

### Prerequisites

- Node 20+ (`nvm use 20`)
- MySQL 8 (τοπικά ή στο Docker)
- npm

### Setup

```bash
git clone https://github.com/PanagiotisKotsorgios/timologion.git
cd timologion
npm install
cp .env.example .env    # συμπλήρωσε τουλάχιστον DATABASE_URL, SESSION_SECRET, APP_BASE_URL
npx prisma migrate dev
npm run seed             # optional: seed demo tenant
npm run dev
```

Άνοιξε το [http://localhost:3000](http://localhost:3000).

### Απαιτούμενα env vars (ελάχιστο)

| Var | Παράδειγμα |
| --- | --- |
| `DATABASE_URL` | `mysql://user:pass@localhost:3306/timologion` |
| `SESSION_SECRET` | random 32+ chars |
| `APP_BASE_URL` | `http://localhost:3000` (dev) / `https://timologion.gr` (prod) |
| `ENCRYPTION_KEY` | 32-byte base64 (για AES-GCM) |

### Προαιρετικά env vars

| Var | Χρήση |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth login |
| `WRAPP_BASE_URL` / `WRAPP_PARTNER_API_KEY` | Wrapp integration (μπορούν να μπουν και από `/admin/wrapp`) |
| `BREVO_API_KEY` | Αποστολή email (verification, reset) |

### Scripts

```bash
npm run dev              # dev server (port 3000)
npm run build            # production build
npm run start            # production runtime
npm run lint             # ESLint
npx tsc --noEmit         # type check
npx prisma studio        # DB UI
npx prisma migrate dev   # νέα migration
```

---

## Deployment (Coolify)

Το repo περιέχει `docker-compose.yaml` που τρέχει σε Coolify one-click.

1. **New Resource → Docker Compose** στο Coolify.
2. Επιλογή του repository.
3. **Build Pack:** Docker Compose (όχι Nixpacks).
4. **Env vars** που πρέπει να οριστούν:
   - `APP_BASE_URL=https://timologion.gr`
   - `SERVICE_PASSWORD_DBROOT` (η ίδια η Coolify τη δημιουργεί)
   - `SESSION_SECRET`, `ENCRYPTION_KEY`
   - `WRAPP_PARTNER_API_KEY` (ή set from `/admin/wrapp` μετά το deploy)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `BREVO_API_KEY`
5. Deploy.

Οι υπόλοιπες ρυθμίσεις (Wrapp base URL, webhook secret, sender email) γίνονται από το admin panel μετά το πρώτο login.

---

## Δομή project

```
src/
├── app/
│   ├── (marketing)/       Δημόσιο site: /, /features, /pricing, /guides, /contact, νομικά
│   ├── (auth)/            /login, /register, /forgot-password, /reset-password, /verify-email
│   ├── app/               Λογαριασμοί χρηστών (dashboard, documents, clients, POS, CRM, settings)
│   ├── admin/             Admin panel (businesses, plans, Wrapp, email, audit)
│   └── api/               Server routes: webhooks (Wrapp), OAuth, cron
├── components/            React components (UI, marketing, layout, admin)
├── lib/                   Server modules: db, auth, wrapp, email, rbac, audit, seo, quota
└── styles/                Global CSS

prisma/
├── schema.prisma          Data model (users, businesses, documents, wrapp_connections, ...)
└── migrations/            SQL migrations

public/                    Static assets (logo, manifest, robots-aux files)
scripts/                   One-shot scripts (seed, first-boot)
```

---

## SEO / marketing

Το marketing surface είναι πλήρως server-rendered, με:
- Metadata template + JSON-LD (Organization, SoftwareApplication, WebSite) στο `src/lib/seo.ts`
- Sitemap δυναμικό στο `/sitemap.xml` που περιλαμβάνει και τους δημοσιευμένους οδηγούς
- `robots.txt` που μπλοκάρει `/app/`, `/admin/`, `/api/`
- OpenGraph + Twitter cards σε κάθε σελίδα
- PWA manifest

---

## Legal

Το Τιμολόγιον διαχειρίζεται τη σύμβαση με τον πιστοποιημένο πάροχο ηλεκτρονικής τιμολόγησης (Wrapp) εκ μέρους του τελικού χρήστη. Η φοροσήμανση, η διαβίβαση στο myDATA και η νομική ευθύνη πιστοποίησης παραμένουν στην πλευρά του παρόχου.

- **Πάροχος:** Wrapp AI — [wrapp.ai](https://wrapp.ai)
- **Ρυθμιστική αρχή myDATA:** ΑΑΔΕ

Πλήρες κείμενο: [/terms](https://timologion.gr/terms) · [/privacy](https://timologion.gr/privacy) · [/cookies](https://timologion.gr/cookies).

---

## Επικοινωνία

- Email: [support@timologion.gr](mailto:support@timologion.gr)
- Τηλέφωνο: +30 2631 028971
- Ωράριο: Δευτέρα – Παρασκευή, 09:00 – 18:00 (EET)
