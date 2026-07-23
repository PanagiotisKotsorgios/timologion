# e-timologio

Web app for simple Greek electronic invoicing, client management, services/products, delivery notes, payments, reports, and future business modules. The app must feel as easy and fast as Timologic-style Greek invoicing software, but it must be architected and worded correctly: **we are not an official electronic invoicing provider (ΥΠΑΗΕΣ / Πάροχος Ηλεκτρονικής Τιμολόγησης)**. Wrapp is the certified provider layer. Our product is the user-friendly frontend, workflow, dashboard, and business management layer that sends issuance requests to Wrapp through API.

Primary language: Greek.
Secondary language: English, where useful for technical/accounting labels.

## Product Positioning

Build a fast, minimal, professional SaaS for Greek businesses that need to issue documents without accounting complexity.

Core promise:

> "Απλή έκδοση παραστατικών, πελατολόγιο και οργάνωση επιχείρησης σε ένα καθαρό dashboard. Η φοροσήμανση, η διαβίβαση στο myDATA, το MARK, UID και QR γίνονται μέσω Wrapp."

Required legal/product wording:

- Never claim that this app is an official ΥΠΑΗΕΣ provider.
- Never show "Πιστοποιημένος Πάροχος" as our own status.
- Always describe the flow as "Έκδοση μέσω συνεργαζόμενου παρόχου Wrapp" or "Η διαβίβαση και σήμανση γίνεται από Wrapp".
- During onboarding, make clear that the user signs the provider agreement and pays provider fees directly in Wrapp.
- Store proof/status of Wrapp activation, but do not replace Wrapp's contract, subscription, certification, or legal role.

## External References

- Wrapp website: https://wrapp.ai/en
- Wrapp API reference: https://wrapp.ai/api/documentation?locale=en
- Wrapp AI-friendly API docs: https://wrapp.ai/api/documentation.md
- Wrapp partner/API onboarding: https://wrapp.ai/el/api/becomeapartner

Use these references for product parity and API behavior, not for copying branding, copyrighted content, exact layout, or assets.

## Target Users

- Freelancers and small businesses.
- Service providers: doctors, engineers, consultants, technicians, beauty, tourism, rentals, educators.
- Retail and food businesses needing receipts, POS, quick sale, tables, orders, delivery notes.
- Businesses that want simple invoicing first, then add CRM, marketing, expenses, appointments, and inventory.

## UX Direction

The UI should be very simple, fast, and clean.

Visual style:

- Timologic-inspired Greek SaaS feel: white background, calm blue accents, clear cards/tables, simple navigation, practical dashboard.
- Avoid heavy gradients, decorative visuals, clutter, and marketing-first screens inside the app.
- Dashboard-first experience after login.
- Greek labels everywhere by default.
- Keep document creation forms short with progressive disclosure.
- Every major action should be doable in 1-3 clicks where possible.
- Use clear status badges: `Πρόχειρο`, `Απεστάλη`, `Εκδόθηκε`, `MARK λήφθηκε`, `Σφάλμα`, `Πληρωμένο`, `Ακυρωμένο`.
- Mobile responsive, but desktop/tablet workflows are the priority for business use.

Guided UX principles:

- The app must be highly κατευθυντικό: every page should make the next useful action obvious.
- Do not show all ERP features to every user. Show only the modules, widgets, buttons, and menu items enabled by the user's package and role.
- Use onboarding checklists: `Στοιχεία επιχείρησης`, `Σύνδεση Wrapp`, `Σειρές παραστατικών`, `Πρώτος πελάτης`, `Πρώτο παραστατικό`.
- Use empty states with one primary action, not long explanations.
- Use smart defaults based on business type, last used document type, default VAT, default payment method, and default series.
- Keep advanced accounting, classifications, taxes, and technical Wrapp fields collapsed unless required.
- Prefer wizards and short guided forms over large configuration screens.
- Every dashboard should have 3-6 important widgets maximum.
- Every dashboard should have 2-5 primary quick actions maximum.
- Avoid complex charts unless they directly help the user decide what to do next.
- Hide upsell prompts from core workflows; show locked package features in a subtle, non-blocking way.

## Public Website Pages

Implement a public marketing website similar in coverage to Timologic, but with our own branding and correct provider wording.

Required pages:

- `/` Home
  - Hero: "Online εφαρμογή τιμολόγησης για myDATA μέσω Wrapp"
  - CTA: "Ξεκίνα δωρεάν" and "Σύνδεση"
  - Benefits: γρήγορη έκδοση, πελατολόγιο, πρόσβαση από παντού, Wrapp integration.
  - Clear statement: "Δεν είμαστε πάροχος ΥΠΑΗΕΣ. Η έκδοση/σήμανση γίνεται από Wrapp."
- `/features` Χαρακτηριστικά
  - Invoices, receipts, delivery notes, offers, orders, clients, services/products, PDF/thermal PDF, email sending, reports/export, POS, online payments.
- `/pricing` Κόστος
  - Our app subscription packages.
  - Separate note: Wrapp provider subscription/payment happens in Wrapp.
  - Do not bundle provider legal fees unless contractually confirmed.
- `/guides` Οδηγίες
  - How to register.
  - How to activate Wrapp.
  - How to create first client.
  - How to issue first invoice.
  - How to handle errors.
- `/contact` Επικοινωνία
- `/login` Σύνδεση
- `/register` Εγγραφή
- `/terms`, `/privacy`, `/cookies`

## Auth And Accounts

Required:

- Email/password login.
- OAuth optional later.
- Multi-tenant account model: one user can belong to one or more businesses.
- Roles: `owner`, `admin`, `accountant`, `staff`, `sales`, `readonly`.
- MFA support for owners/admins.
- Password reset with short-lived signed token.
- Session management with refresh token rotation.
- Audit log for login, document issuance, Wrapp API calls, exports, user permission changes, and sensitive settings changes.

Business onboarding:

1. User registers in our app.
2. User creates business profile: ΑΦΜ, ΔΟΥ if needed, legal name, trade name, address, activity, branch data.
3. User is prompted to activate Wrapp.
4. Our backend creates or requests Wrapp onboarding using partner flow when available.
5. User is redirected to Wrapp to pay and sign provider agreement.
6. User returns to our app.
7. Backend verifies Wrapp account status.
8. Dashboard unlocks document issuance only when `wrapp.issue_invoice_status = true` and `wrapp.has_plan = true`.

## Wrapp Integration

Wrapp API base:

```text
https://wrapp.ai/api/v1/
```

Staging/sandbox:

- Use Wrapp sandbox credentials during development.
- Keep staging and production credentials fully separated.
- Never expose Wrapp API keys or JWTs to the browser.
- Backend only communicates with Wrapp.

Authentication:

- Login endpoint: `POST /api/v1/login`
- Payload uses partner/API key plus `email` or `wrapp_user_id`.
- Wrapp JWT expires after 24 hours, so cache server-side with expiry and refresh before critical calls.

Important Wrapp endpoints to support:

- `POST /api/v1/login` - retrieve Wrapp JWT.
- `GET /api/v1/tenant_details` - verify Wrapp user status, plan, and issue permission.
- `GET /api/v1/vat_search?vat=...&country_code=EL` - quick customer/company lookup by VAT.
- `GET /api/v1/branches`, `POST /api/v1/branches`, `PUT /api/v1/branches/:id` - branches.
- `GET /api/v1/billing_books`, `POST /api/v1/billing_books`, `PUT /api/v1/billing_books/:id` - series/books.
- `POST /api/v1/invoices` - issue invoice/document.
- `GET /api/v1/invoices/:id` - retrieve status, MARK, UID, QR URL, Wrapp invoice URLs.
- `DELETE /api/v1/invoices/:id/cancel` - cancel delivery notes where supported.
- `GET /api/v1/invoices/:id/generate_pdf` - request PDF generation.
- `GET /api/v1/invoices/:id/generate_thermal_pdf` - request thermal PDF.
- `POST /api/v1/invoices/issue_draft` - if supported/needed for drafts.
- `POST /api/v1/invoices/:id/mark_as_paid` - mark paid where supported.
- `GET /api/v1/invoices/list_open_catering_order_notes` - restaurants/catering.
- `GET /api/v1/pos_devices`, `POST /api/v1/pos_devices` - POS setup.
- `POST /api/v1/create_viva_smart_pay_link` - payment links where eligible.
- `GET/POST/PATCH/DELETE /api/v1/catering_tables...` - tables and catering flows.
- `/api/v1/digital_clienteles...` - digital clientele flows for relevant industries.
- `/api/v1/digital_transports...` - digital delivery/transport flows.
- Webhooks for invoice issued, POS errors, invoice PDF, thermal PDF.

Webhook security:

- Verify `X-Webhook-Secret` using HMAC-SHA256 over the raw request body with the relevant Wrapp API key.
- Reject unsigned or invalid webhooks.
- Store every webhook payload in an append-only table before processing.
- Process webhooks idempotently by `event_type + invoice_id + payload_hash`.

## Main App Pages

### Dashboard

- Revenue summary.
- Issued documents count by month and plan limit.
- Open drafts.
- Recent documents and statuses.
- Wrapp activation status.
- Pending errors requiring action.
- Quick actions: `Νέο Τιμολόγιο`, `Νέα Απόδειξη`, `Νέο Δελτίο Αποστολής`, `Νέος Πελάτης`, `Γρήγορη Πώληση`.

Dashboard design:

- The dashboard must adapt to package, role, and business type.
- A Starter user should not see CRM, inventory, POS, campaigns, or advanced statistics as active dashboard widgets.
- A Retail/POS user should see quick sale, open orders, POS status, and daily sales first.
- A Service/Operations user should see appointments, today's work, unpaid services, and quick receipt actions first.
- An Owner should see money, pending actions, errors, and subscription/Wrapp status.
- A Staff user should see only task actions they are allowed to perform.
- An Accountant user should see documents, exports, VAT summaries, and reconciliation tasks.
- A Readonly user should see search, reports, and document history without mutation actions.
- Keep each dashboard simple and calm. No more than one primary CTA should visually dominate.

### Package-Based Dashboards

The app must have different dashboards per package. The goal is not to build one huge dashboard with hidden complexity; the goal is to give each user a simple work surface for what they actually bought.

### Starter Dashboard

Purpose: issue documents quickly.

Widgets:

- Wrapp activation/connection status.
- `Νέο Παραστατικό` primary action.
- Recent documents.
- Open drafts.
- Monthly issued document count and plan limit.
- Unpaid documents summary.

Quick actions:

- `Νέο Τιμολόγιο`
- `Νέα Απόδειξη`
- `Νέος Πελάτης`
- `Νέα Υπηρεσία/Είδος`

### Business Dashboard

Purpose: manage day-to-day finances without making the UI feel like full accounting software.

Widgets:

- Revenue and expenses this month.
- Unpaid invoices.
- Upcoming payments/collections.
- Recent supplier expenses.
- VAT/report export shortcut.

Quick actions:

- `Νέο Παραστατικό`
- `Νέο Έξοδο`
- `Νέος Προμηθευτής`
- `Καταχώρηση Πληρωμής`

### Retail / POS Dashboard

Purpose: sell fast.

Widgets:

- `Γρήγορη Πώληση` as the main action.
- Today's sales.
- POS/Soft POS connection status.
- Open orders or open tables where enabled.
- Low stock warnings where inventory is enabled.

Quick actions:

- `Γρήγορη Πώληση`
- `Νέα Παραγγελία`
- `Άνοιγμα Τραπεζιού`
- `Σύνδεση POS`

### Operations Dashboard

Purpose: manage appointments and service work.

Widgets:

- Today's appointments.
- Pending appointment confirmations.
- Services completed but not invoiced.
- Customer reminders.

Quick actions:

- `Νέο Ραντεβού`
- `Νέα Απόδειξη`
- `Νέος Πελάτης`
- `Αποστολή Υπενθύμισης`

### CRM & Marketing Dashboard

Purpose: manage commercial follow-up simply.

Widgets:

- New leads.
- Open opportunities.
- Follow-ups due today.
- Campaign performance summary.
- Recent customer interactions.

Quick actions:

- `Νέο Lead`
- `Νέα Ευκαιρία`
- `Νέα Καμπάνια`
- `Νέα Εργασία`

### Advanced / Smart Pack Dashboard

Purpose: give power users extra insights without changing the simple core experience.

Widgets:

- Advanced revenue trends.
- Client profitability.
- Automation/credit usage.
- Bulk action queue.
- Alerts and recommendations.

Quick actions:

- `Μαζική Ενέργεια`
- `Νέα Αυτοματοποίηση`
- `Εξαγωγή Αναφοράς`
- `AI Βοήθεια`

Dashboard rules:

- Package dashboards should share one design system and layout pattern.
- A user can switch between available dashboards only when their package includes them.
- If a business upgrades, new dashboard modules appear gradually with a short guided setup.
- If a business downgrades, data remains stored but locked features become readonly/export-only where legally and technically appropriate.
- The left navigation should be package-aware and role-aware.
- Search should remain global for allowed entities: documents, clients, items, suppliers, payments.

### Documents

Routes:

- `/app/documents`
- `/app/documents/new`
- `/app/documents/:id`
- `/app/documents/:id/edit`
- `/app/documents/:id/pdf`

Supported document families:

- Τιμολόγια πώλησης.
- Τιμολόγια παροχής υπηρεσιών.
- Αποδείξεις λιανικής.
- Αποδείξεις παροχής υπηρεσιών.
- Πιστωτικά.
- Προτιμολόγια.
- Προσφορές.
- Παραγγελίες.
- Δελτία αποστολής.
- Φορτωτικές / παροχής μεταφοράς where supported.
- B2G invoices where Wrapp/business plan supports it.
- Repeating documents.

Document creation requirements:

- Step 1: document type and series.
- Step 2: client/counterpart.
- Step 3: lines, VAT, classifications, taxes, withholdings, payment method.
- Step 4: preview and validation.
- Step 5: issue through Wrapp.
- After issuance: show MARK, UID, QR URL, Wrapp invoice URL, PDF buttons, email/send actions.

Rules:

- Do not allow issued documents to be edited locally in a way that desynchronizes from Wrapp.
- Drafts can be edited.
- Failed issuance must preserve payload and error details.
- Add retry only when safe and idempotency can be guaranteed.

### Clients

Routes:

- `/app/clients`
- `/app/clients/new`
- `/app/clients/:id`

Features:

- Quick add by ΑΦΜ using Wrapp VAT search.
- Manual add/edit.
- Client card with balance, documents, payments, notes, tags, contact people.
- Email/phone fields.
- Export clients.
- Merge duplicate clients with audit history.

### Products And Services

Routes:

- `/app/items`
- `/app/services`

Features:

- Services and products.
- Unit, VAT category, default price, SKU/code, description.
- Stock tracking optional by package.
- Price zones optional by package.
- Bulk import/export.

### Payments

Routes:

- `/app/payments`
- `/app/receipts`

Features:

- Mark invoice as paid.
- Partial payments.
- Payment methods.
- Viva payment link creation when supported.
- Receipts, bank transfers, remittances.
- Client balance.

### Expenses And Suppliers

Routes:

- `/app/expenses`
- `/app/suppliers`
- `/app/purchases`

Features:

- Expense tracking.
- Supplier database.
- Purchases.
- Supplier payments.
- Attach receipts/PDFs.
- Reports by category, supplier, month.

### Inventory And Orders

Routes:

- `/app/inventory`
- `/app/orders`

Features:

- Stock movements.
- Purchase orders.
- Sales orders.
- Delivery note connection.
- Low stock alerts.
- Price zones.

### POS / Quick Sale

Routes:

- `/app/quick-sale`
- `/app/pos`
- `/app/tables`

Features:

- Fast retail receipt flow.
- POS device list and setup.
- EFT POS / Soft POS connection through Wrapp-supported flows.
- Restaurant/catering tables where relevant.
- Open/close table, transfer, open order notes.
- Thermal print view.

### CRM

Routes:

- `/app/crm`
- `/app/leads`
- `/app/opportunities`
- `/app/campaigns`

Features:

- Leads.
- Opportunities.
- Pipeline stages.
- Tasks/reminders.
- Customer communication history.
- Email/SMS campaigns in future packages.

### Appointments And Calendar

Routes:

- `/app/calendar`
- `/app/appointments`

Features:

- Appointment scheduling.
- Services linked to appointment types.
- Customer reminders by email/SMS in future packages.
- Convert appointment to invoice/receipt.

### Reports

Routes:

- `/app/reports`
- `/app/statistics`

Features:

- Monthly revenue.
- VAT summaries.
- Open receivables.
- Paid/unpaid documents.
- Top clients/services/products.
- Exports to Excel/CSV.
- Advanced statistics in higher packages.

### Settings

Routes:

- `/app/settings/business`
- `/app/settings/wrapp`
- `/app/settings/branches`
- `/app/settings/billing-books`
- `/app/settings/users`
- `/app/settings/roles`
- `/app/settings/templates`
- `/app/settings/security`
- `/app/settings/billing`

Features:

- Business profile.
- Wrapp connection status and activation redirect.
- Branches.
- Document series/billing books.
- User and role management.
- Invoice template branding: logo, color, notes.
- Webhook endpoint diagnostics.
- API status checks.
- App subscription management.

## Suggested Packages

Keep pricing flexible. These are feature bundles, not final prices.

### Starter

- Invoices, receipts, delivery notes via Wrapp.
- Clients.
- Services/products.
- Basic dashboard.
- PDF and email sending.
- Basic reports/export.

### Business

- Expenses.
- Suppliers.
- Payments, collections, remittances.
- Advanced reports.
- Repeating documents.
- Multiple users/roles.

### Retail / POS

- Quick Sale.
- EFT POS / Soft POS integration through Wrapp.
- Orders.
- Price zones.
- Thermal printing.
- Tables/catering where applicable.

### Operations

- Appointments and calendar.
- Service workflows.
- Customer reminders.
- Staff assignment.

### CRM & Marketing

- Leads.
- Opportunities.
- Full CRM.
- Email campaigns.
- SMS campaigns.
- Customer segments.

### Advanced / Smart Pack

- Advanced financial statistics.
- Automation credits.
- AI-assisted document creation.
- Bulk actions.
- Large email/SMS/automation credit packs.

## Recommended Architecture

Use a modern full-stack TypeScript architecture unless there is a strong reason otherwise.

Recommended stack:

- Next.js App Router or Remix for web app.
- TypeScript strict mode.
- PostgreSQL.
- Prisma or Drizzle ORM.
- Redis for queues/cache/rate limits.
- Background jobs with BullMQ, Inngest, Trigger.dev, or similar.
- Object storage for generated/imported files.
- Playwright for end-to-end tests.
- Vitest/Jest for unit tests.
- Zod or Valibot for runtime validation.
- Tailwind CSS plus a small component system.

Backend boundaries:

- Browser calls only our backend.
- Our backend owns auth, roles, database, validation, audit, subscriptions, and Wrapp token handling.
- Wrapp integration must be isolated in a `wrapp` service/client module.
- Document issuance must go through a server-side command/service, never directly from UI components.

## Suggested Data Model

Core tables/entities:

- `users`
- `businesses`
- `business_members`
- `roles`
- `sessions`
- `audit_logs`
- `wrapp_connections`
- `branches`
- `billing_books`
- `clients`
- `client_contacts`
- `suppliers`
- `items`
- `documents`
- `document_lines`
- `document_events`
- `payments`
- `expenses`
- `inventory_movements`
- `orders`
- `appointments`
- `crm_leads`
- `crm_opportunities`
- `campaigns`
- `webhook_events`
- `files`
- `subscription_plans`
- `business_subscriptions`

Important document fields:

- Local `id`
- `business_id`
- `type`
- `status`
- `wrapp_invoice_id`
- `wrapp_invoice_url`
- `wrapp_invoice_url_en`
- `my_data_mark`
- `my_data_uid`
- `my_data_qr_url`
- `series`
- `number`
- `issue_date`
- `net_total_amount`
- `vat_total_amount`
- `total_amount`
- `payable_total_amount`
- `payment_status`
- `last_wrapp_payload`
- `last_wrapp_error`
- `issued_at`

## Security Requirements

This app handles business, tax, and personal data. Treat security as a product feature.

Minimum requirements:

- Server-only Wrapp credentials.
- Encrypt Wrapp API keys/tokens at rest.
- Use HTTPS everywhere.
- Strong password hashing with Argon2id or bcrypt with current safe parameters.
- MFA for privileged users.
- Row-level tenant isolation in every query.
- Authorization checks on every mutation and export.
- CSRF protection where cookie auth is used.
- Secure, httpOnly, sameSite cookies.
- Rate limit login, password reset, document issuance, VAT search, and public forms.
- Validate all input with schemas.
- Escape/sanitize rendered user text.
- Virus scan uploaded files where possible.
- Immutable audit logs for important business actions.
- Backups with tested restore process.
- GDPR-compliant privacy controls, retention, export, and deletion process.
- Secrets only in environment/secret manager, never committed.
- Webhook signature verification.
- Idempotency keys for issuance commands.

Security tests:

- Auth bypass tests.
- Tenant isolation tests.
- Role permission tests.
- Webhook signature tests.
- Wrapp error handling tests.
- Rate limit tests.
- Dependency vulnerability scanning in CI.

## Performance Requirements

The product must feel instant.

Targets:

- Initial app route load under 2 seconds on normal broadband.
- Dashboard data rendered with server-side loading/suspense.
- Document form interactions under 100ms where possible.
- Search clients/items under 300ms for typical accounts.
- API p95 under 500ms for local reads/writes, excluding Wrapp network calls.

Implementation:

- Use server-rendered routes for initial data.
- Keep client components small.
- Lazy load heavy modules like charts, PDF preview, CRM pipelines.
- Use indexed database queries.
- Paginate documents, clients, items, payments, expenses.
- Debounce VAT/client search.
- Cache stable reference data like VAT exemptions, invoice type options, payment methods.
- Queue PDF generation and email sending.
- Use optimistic UI only for local drafts, not final issuance.
- Never block the UI while waiting for background webhooks; show pending status and refresh.

## Document Issuance Flow

1. User opens `Νέο Παραστατικό`.
2. UI loads business settings, branches, billing books, clients, items, VAT settings.
3. User selects document type.
4. User selects or creates client.
5. User adds lines.
6. Frontend validates required fields.
7. Backend recalculates totals and validates again.
8. Backend creates/updates local draft.
9. User clicks `Έκδοση μέσω Wrapp`.
10. Backend creates idempotency key.
11. Backend obtains Wrapp JWT.
12. Backend sends `POST /api/v1/invoices`.
13. Backend stores Wrapp response.
14. UI shows MARK, UID, QR, PDF/status links.
15. Backend requests PDF if needed.
16. Webhook updates PDF URL when ready.
17. User can email client/accountant or download/print.

## Error Handling

Use clear Greek error messages with actionable next steps.

Examples:

- Wrapp not activated: "Δεν έχει ολοκληρωθεί η ενεργοποίηση Wrapp. Συνέχισε στο Wrapp για πληρωμή και υπογραφή σύμβασης."
- Missing billing book: "Δεν έχει οριστεί σειρά παραστατικού. Δημιούργησε σειρά στις Ρυθμίσεις > Σειρές."
- Invalid VAT: "Το ΑΦΜ δεν βρέθηκε ή δεν είναι έγκυρο. Έλεγξε τα στοιχεία πελάτη."
- Wrapp API down: "Η έκδοση δεν ολοκληρώθηκε λόγω προσωρινού προβλήματος σύνδεσης. Το παραστατικό έμεινε ως πρόχειρο."
- Issuance failed after Wrapp response: "Η Wrapp επέστρεψε σφάλμα. Δεν θεωρείται εκδομένο μέχρι να υπάρχει MARK."

Never mark a document as issued unless Wrapp returns successful issuance data.

## Testing Requirements

Unit tests:

- Totals, VAT, discounts.
- Document validation.
- Role permissions.
- Wrapp payload mapping.
- Webhook signature verification.

Integration tests:

- Register/login.
- Create business.
- Connect Wrapp sandbox.
- Create client by VAT.
- Create billing book.
- Issue invoice through mocked Wrapp.
- Receive invoice issued webhook.
- Generate PDF flow.
- Failed issuance and retry.

E2E tests:

- Owner registers, activates Wrapp, issues first invoice.
- Staff user creates draft but cannot change billing/security settings.
- Retail quick sale flow.
- Delivery note flow.
- Mobile document preview.

## Development Milestones

### Phase 1 - Foundation

- App shell, auth, tenants, roles.
- Business onboarding.
- Dashboard.
- Clients.
- Services/products.
- Document drafts.
- Wrapp connection status.

### Phase 2 - Core Issuance

- Billing books/series.
- Branches.
- Invoice/receipt/delivery note creation.
- Wrapp invoice issuance.
- MARK/UID/QR display.
- PDF generation.
- Email sending.
- Audit logs.

### Phase 3 - Compliance And Reliability

- Webhooks.
- Idempotency.
- Error recovery.
- Full audit/event history.
- Permission hardening.
- Backups.
- Monitoring.

### Phase 4 - Business Modules

- Payments.
- Expenses.
- Suppliers.
- Reports.
- Repeating documents.
- Imports/exports.

### Phase 5 - Advanced Packages

- Quick Sale.
- POS.
- Inventory.
- Orders.
- CRM.
- Campaigns.
- Appointments/calendar.
- Advanced statistics.

## Acceptance Criteria

The app is ready for first production users when:

- Users can register, login, create a business, and manage team members.
- Users can activate/connect Wrapp and see clear activation status.
- Users cannot issue documents until Wrapp confirms eligibility.
- Each package has a simple dedicated dashboard with only the relevant widgets and quick actions.
- Navigation is package-aware and role-aware, so users do not see irrelevant complex modules.
- Onboarding and empty states guide the user to the next action without requiring accounting/software knowledge.
- Users can create clients and services/products.
- Users can issue at least invoices, receipts, credit notes, and delivery notes supported by Wrapp.
- Issued documents show MARK, UID, QR URL, Wrapp URL, PDF status, and payment status.
- All Wrapp API calls are server-side and audited.
- Webhooks are verified and idempotent.
- Tenant isolation is tested.
- Basic reports and exports work.
- The app is fast on desktop and usable on mobile.
- Product copy never presents us as the official provider.

## Prompt For Claude Code / Coding Agents

When implementing this project:

1. Read this README completely first.
2. Do not build a landing page only; build the actual logged-in business app.
3. Keep UI simple, dense, and professional.
4. Prioritize secure backend architecture before visual polish.
5. Implement Wrapp through a backend service module with typed request/response schemas.
6. Mock Wrapp in tests; use real sandbox only through environment variables.
7. Never expose provider credentials to frontend code.
8. Never mark documents as issued without Wrapp success data.
9. Add tests for every compliance/security boundary.
10. Keep the product legally accurate: this app is the frontend/business workflow layer; Wrapp is the provider issuing/signing/transmitting.
