#!/usr/bin/env tsx
/**
 * Demo seed for screenshot content.
 *
 *   npm run demo:seed -- <email>
 *
 * Fills the specified user's active (or first) business with realistic Greek
 * SaaS data: profile, branches, billing books, clients, items, ~120 documents
 * across 12 months, provider status, AADE creds, extra team members, plus a
 * platform-side subscription so /admin/billing has content too.
 *
 * Safe to run multiple times: existing rows are updated/replaced. Use only in
 * development / staging.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ARGON2 = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const CLIENTS: {
  vat: string;
  legal: string;
  trade?: string;
  taxOffice: string;
  activity: string;
  address: string;
  city: string;
  postal: string;
  email?: string;
  phone?: string;
}[] = [
  {
    vat: "094012340",
    legal: "COSMOTE ΚΙΝΗΤΕΣ ΤΗΛΕΠΙΚΟΙΝΩΝΙΕΣ Α.Ε.",
    trade: "Cosmote",
    taxOffice: "ΦΑΕ ΑΘΗΝΩΝ",
    activity: "Τηλεπικοινωνίες",
    address: "Λ. Κηφισίας 44",
    city: "Μαρούσι",
    postal: "15125",
    email: "billing@cosmote.gr",
    phone: "+30 210 618 7000",
  },
  {
    vat: "094014273",
    legal: "OPAP ΥΠΗΡΕΣΙΩΝ Α.Ε.",
    trade: "ΟΠΑΠ",
    taxOffice: "ΦΑΕ ΑΘΗΝΩΝ",
    activity: "Ψυχαγωγικές δραστηριότητες",
    address: "Λ. Αθηνών 112",
    city: "Αθήνα",
    postal: "10442",
    phone: "+30 210 578 8000",
  },
  {
    vat: "099921455",
    legal: "ΠΑΠΑΔΟΠΟΥΛΟΣ ΕΜΠΟΡΙΚΗ Ε.Π.Ε.",
    trade: "Παπαδόπουλος Εμπορική",
    taxOffice: "ΔΟΥ Α' ΘΕΣΣΑΛΟΝΙΚΗΣ",
    activity: "Χονδρικό εμπόριο τροφίμων",
    address: "Εγνατίας 74",
    city: "Θεσσαλονίκη",
    postal: "54622",
    email: "info@papadopoulos-em.gr",
    phone: "+30 2310 220 400",
  },
  {
    vat: "800123456",
    legal: "ΓΕΩΡΓΙΑΔΗΣ ΤΕΧΝΙΚΗ Ι.Κ.Ε.",
    trade: "Γεωργιάδης Τεχνική",
    taxOffice: "ΔΟΥ Β' ΘΕΣΣΑΛΟΝΙΚΗΣ",
    activity: "Τεχνικές μελέτες",
    address: "Καραολή Δημητρίου 12",
    city: "Θεσσαλονίκη",
    postal: "54630",
    email: "office@georgiadis-tech.gr",
    phone: "+30 2310 555 021",
  },
  {
    vat: "800765432",
    legal: "ΑΘΗΝΑΪΚΟΣ ΚΑΦΕΣ Α.Ε.",
    trade: "Αθηναϊκός Καφές",
    taxOffice: "ΔΟΥ ΨΥΧΙΚΟΥ",
    activity: "Παραγωγή τροφίμων",
    address: "Δορυλαίου 15",
    city: "Αθήνα",
    postal: "11521",
    email: "orders@athens-coffee.gr",
    phone: "+30 210 641 3200",
  },
  {
    vat: "099876123",
    legal: "ΔΗΜΗΤΡΙΟΥ & ΣΙΑ Ο.Ε.",
    trade: "Δημητρίου",
    taxOffice: "ΔΟΥ ΠΑΤΡΩΝ",
    activity: "Λιανικό εμπόριο",
    address: "Αγίου Νικολάου 78",
    city: "Πάτρα",
    postal: "26221",
    email: "info@dimitriou-oe.gr",
    phone: "+30 2610 220 500",
  },
  {
    vat: "160987321",
    legal: "ΚΑΡΑΓΙΑΝΝΗΣ ΑΝΑΣΤΑΣΙΟΣ",
    trade: "Καραγιάννης",
    taxOffice: "ΔΟΥ ΠΕΙΡΑΙΑ",
    activity: "Ελεύθερος επαγγελματίας",
    address: "Ιάσονος 22",
    city: "Πειραιάς",
    postal: "18535",
    email: "a.karagiannis@example.gr",
    phone: "+30 210 411 2400",
  },
  {
    vat: "999888777",
    legal: "MEDIA GROUP Ι.Κ.Ε.",
    trade: "Media Group",
    taxOffice: "ΦΑΕ ΑΘΗΝΩΝ",
    activity: "Παροχή διαφημιστικών υπηρεσιών",
    address: "Λ. Συγγρού 350",
    city: "Καλλιθέα",
    postal: "17674",
    email: "billing@mediagroup.gr",
    phone: "+30 210 950 0300",
  },
  {
    vat: "111222333",
    legal: "ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΝΕΟΛΑΪΑ Α.Ε.",
    trade: "Νεολαία Α.Ε.",
    taxOffice: "ΔΟΥ ΗΡΑΚΛΕΙΟΥ",
    activity: "Κατασκευές κτιρίων",
    address: "Λεωφ. 62 Μαρτύρων 40",
    city: "Ηράκλειο",
    postal: "71304",
    email: "office@neolaia-ae.gr",
    phone: "+30 2810 322 200",
  },
  {
    vat: "444555666",
    legal: "ΣΤΑΥΡΟΠΟΥΛΟΣ ΕΝΕΡΓΕΙΑΚΗ Μ.Ι.Κ.Ε.",
    trade: "Stavropoulos Energy",
    taxOffice: "ΔΟΥ ΛΑΡΙΣΑΣ",
    activity: "Ενεργειακές υπηρεσίες",
    address: "Ρούσβελτ 30",
    city: "Λάρισα",
    postal: "41221",
    email: "hello@stavropoulos-energy.gr",
    phone: "+30 2410 668 700",
  },
  {
    vat: "888999111",
    legal: "ΠΑΝΑΘΗΝΑΪΚΗ ΞΕΝΟΔΟΧΕΙΑΚΗ Α.Ε.",
    trade: "Panathenaic Hotels",
    taxOffice: "ΦΑΕ ΑΘΗΝΩΝ",
    activity: "Ξενοδοχειακές υπηρεσίες",
    address: "Πλατεία Ομονοίας 8",
    city: "Αθήνα",
    postal: "10437",
    email: "invoices@panathenaic-hotels.gr",
    phone: "+30 210 522 9100",
  },
  {
    vat: "777333555",
    legal: "ΝΤΑΡΑ ΓΕΩΡΓΙΑ",
    trade: "Ντάρα Design",
    taxOffice: "ΔΟΥ ΒΟΛΟΥ",
    activity: "Γραφιστικές υπηρεσίες",
    address: "Δημητριάδος 210",
    city: "Βόλος",
    postal: "38221",
    email: "hello@ntaradesign.gr",
    phone: "+30 24210 33 900",
  },
  {
    vat: "555666777",
    legal: "ELECTRO NIKAS Α.Ε.",
    trade: "Electro Nikas",
    taxOffice: "ΔΟΥ ΚΑΛΑΜΑΤΑΣ",
    activity: "Λιανικό εμπόριο ηλεκτρικών ειδών",
    address: "Νέδοντος 55",
    city: "Καλαμάτα",
    postal: "24100",
    email: "sales@electronikas.gr",
    phone: "+30 27210 92 300",
  },
  {
    vat: "222444888",
    legal: "ΑΙΓΑΙΑ ΤΡΟΦΙΜΑ Α.Ε.",
    trade: "Αιγαία Τρόφιμα",
    taxOffice: "ΔΟΥ ΣΥΡΟΥ",
    activity: "Εμπόριο τροφίμων",
    address: "Νησίδας 3",
    city: "Ερμούπολη",
    postal: "84100",
    email: "info@aigaia-foods.gr",
    phone: "+30 22810 88 600",
  },
  {
    vat: "333777222",
    legal: "IATRIKO KENTRO KRHTHS Μ.Α.Ε.",
    trade: "Ιατρικό Κρήτης",
    taxOffice: "ΔΟΥ ΧΑΝΙΩΝ",
    activity: "Ιατρικές υπηρεσίες",
    address: "Ελευθερίου Βενιζέλου 40",
    city: "Χανιά",
    postal: "73136",
    email: "billing@iatriko-kritis.gr",
    phone: "+30 28210 66 100",
  },
];

const ITEMS: {
  kind: "service" | "product";
  code: string;
  name: string;
  unit: string;
  price: number;
  vat: number;
}[] = [
  { kind: "service", code: "CONS-01", name: "Συμβουλευτική υπηρεσία (ώρα)", unit: "ώρα", price: 85, vat: 24 },
  { kind: "service", code: "DEV-01", name: "Ανάπτυξη λογισμικού (ημέρα)", unit: "ημέρα", price: 480, vat: 24 },
  { kind: "service", code: "DES-01", name: "Σχεδιασμός UX/UI (ημέρα)", unit: "ημέρα", price: 420, vat: 24 },
  { kind: "service", code: "TRAIN-01", name: "Εκπαίδευση προσωπικού", unit: "ώρα", price: 60, vat: 24 },
  { kind: "service", code: "AUDIT-01", name: "Οικονομικός έλεγχος", unit: "τεμ", price: 1200, vat: 24 },
  { kind: "service", code: "MAINT-01", name: "Συντήρηση συστημάτων (μήνας)", unit: "μήνας", price: 250, vat: 24 },
  { kind: "service", code: "HOST-01", name: "Cloud hosting (μήνας)", unit: "μήνας", price: 39.9, vat: 24 },
  { kind: "service", code: "COPY-01", name: "Επιμέλεια κειμένου", unit: "τμχ", price: 45, vat: 24 },
  { kind: "service", code: "SUP-01", name: "Τεχνική υποστήριξη (πακέτο 10 ωρών)", unit: "τμχ", price: 350, vat: 24 },
  { kind: "product", code: "BOOK-01", name: "Έντυπος οδηγός τιμολόγησης 2026", unit: "τεμ", price: 24.9, vat: 6 },
  { kind: "product", code: "USB-01", name: "USB Token υπογραφής", unit: "τεμ", price: 49, vat: 24 },
  { kind: "product", code: "PAPER-01", name: "Θερμικό χαρτί POS (10 ρολά)", unit: "πακ", price: 12.5, vat: 24 },
  { kind: "product", code: "PRINT-01", name: "Θερμικός εκτυπωτής POS", unit: "τεμ", price: 149, vat: 24 },
  { kind: "product", code: "SCAN-01", name: "Barcode Scanner USB", unit: "τεμ", price: 89, vat: 24 },
  { kind: "product", code: "TABLET-01", name: "Tablet Android 10\"", unit: "τεμ", price: 219, vat: 24 },
];

async function main() {
  const email = (process.argv[2] ?? "opengplms@gmail.com").toLowerCase();
  console.log(`Seeding demo data for user: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { business: true } } },
  });
  if (!user) throw new Error(`User not found: ${email}`);

  let membership = user.memberships[0];
  if (!membership) {
    console.log("User has no business — creating one.");
    const b = await prisma.business.create({
      data: {
        vatNumber: "800555999",
        legalName: "ΝΙΚΟΛΑΟΥ ΝΙΚΟΛΑΟΣ ΣΥΜΒΟΥΛΕΥΤΙΚΗ Ι.Κ.Ε.",
        tradeName: "Νικολάου Consulting",
        taxOffice: "ΔΟΥ Α' ΑΘΗΝΩΝ",
        activity: "Παροχή συμβουλευτικών υπηρεσιών",
        addressLine: "Λ. Κηφισίας 100",
        city: "Αθήνα",
        postalCode: "11525",
        phone: "+30 210 611 8800",
        email: "info@nikolaou-consulting.gr",
      },
    });
    membership = {
      ...(await prisma.businessMember.create({
        data: { userId: user.id, businessId: b.id, role: "owner" },
      })),
      business: b,
    };
  }
  const businessId = membership.businessId;
  const businessName = membership.business.tradeName ?? membership.business.legalName;

  // Ensure business profile has values (won't overwrite existing meaningful ones).
  await prisma.business.update({
    where: { id: businessId },
    data: {
      vatNumber: membership.business.vatNumber || "800555999",
      legalName:
        membership.business.legalName ||
        "ΝΙΚΟΛΑΟΥ ΝΙΚΟΛΑΟΣ ΣΥΜΒΟΥΛΕΥΤΙΚΗ Ι.Κ.Ε.",
      tradeName: membership.business.tradeName ?? "Νικολάου Consulting",
      taxOffice: membership.business.taxOffice ?? "ΔΟΥ Α' ΑΘΗΝΩΝ",
      activity:
        membership.business.activity ?? "Παροχή συμβουλευτικών υπηρεσιών",
      addressLine: membership.business.addressLine ?? "Λ. Κηφισίας 100",
      city: membership.business.city ?? "Αθήνα",
      postalCode: membership.business.postalCode ?? "11525",
      phone: membership.business.phone ?? "+30 210 611 8800",
      email: membership.business.email ?? "info@nikolaou-consulting.gr",
    },
  });

  // Set Wrapp active so the activation gate doesn't cover the dashboard.
  await prisma.wrappConnection.upsert({
    where: { businessId },
    create: {
      businessId,
      status: "active",
      hasPlan: true,
      canIssueInvoice: true,
      wrappUserId: "wrapp-demo",
      lastVerifiedAt: new Date(),
    },
    update: {
      status: "active",
      hasPlan: true,
      canIssueInvoice: true,
      wrappUserId: "wrapp-demo",
      lastVerifiedAt: new Date(),
      lastError: null,
    },
  });

  // Wipe previous demo entities (idempotent).
  await prisma.$transaction([
    prisma.documentLine.deleteMany({
      where: { document: { businessId } },
    }),
    prisma.document.deleteMany({ where: { businessId } }),
    prisma.client.deleteMany({ where: { businessId } }),
    prisma.item.deleteMany({ where: { businessId } }),
    prisma.billingBook.deleteMany({ where: { businessId } }),
    prisma.branch.deleteMany({ where: { businessId } }),
  ]);

  // Branches
  const [hqBranch, thess] = await Promise.all([
    prisma.branch.create({
      data: {
        businessId,
        label: "Έδρα · Αθήνα",
        addressLine: "Λ. Κηφισίας 100",
        city: "Αθήνα",
        postalCode: "11525",
        phone: "+30 210 611 8800",
        isDefault: true,
      },
    }),
    prisma.branch.create({
      data: {
        businessId,
        label: "Υποκατάστημα · Θεσσαλονίκη",
        addressLine: "Τσιμισκή 122",
        city: "Θεσσαλονίκη",
        postalCode: "54622",
        phone: "+30 2310 220 100",
      },
    }),
  ]);

  // Billing books
  const books = await Promise.all([
    prisma.billingBook.create({
      data: {
        businessId,
        branchId: hqBranch.id,
        documentType: "service_invoice",
        series: "A",
        label: "Τιμολόγια Παροχής",
        nextNumber: 1,
        isDefault: true,
      },
    }),
    prisma.billingBook.create({
      data: {
        businessId,
        branchId: hqBranch.id,
        documentType: "invoice",
        series: "B",
        label: "Τιμολόγια Πώλησης",
        nextNumber: 1,
      },
    }),
    prisma.billingBook.create({
      data: {
        businessId,
        branchId: hqBranch.id,
        documentType: "retail_receipt",
        series: "R",
        label: "Λιανικές Αθήνας",
        nextNumber: 1,
        isDefault: true,
      },
    }),
    prisma.billingBook.create({
      data: {
        businessId,
        branchId: thess.id,
        documentType: "retail_receipt",
        series: "RS",
        label: "Λιανικές Θεσ/νίκης",
        nextNumber: 1,
      },
    }),
    prisma.billingBook.create({
      data: {
        businessId,
        documentType: "credit_note",
        series: "PN",
        label: "Πιστωτικά",
        nextNumber: 1,
        isDefault: true,
      },
    }),
    prisma.billingBook.create({
      data: {
        businessId,
        documentType: "delivery_note",
        series: "DA",
        label: "Δελτία Αποστολής",
        nextNumber: 1,
        isDefault: true,
      },
    }),
  ]);

  // Clients
  const createdClients = await Promise.all(
    CLIENTS.map((c) =>
      prisma.client.create({
        data: {
          businessId,
          vatNumber: c.vat,
          legalName: c.legal,
          tradeName: c.trade,
          taxOffice: c.taxOffice,
          activity: c.activity,
          addressLine: c.address,
          city: c.city,
          postalCode: c.postal,
          country: "GR",
          email: c.email ?? null,
          phone: c.phone ?? null,
        },
      }),
    ),
  );

  // Items
  const createdItems = await Promise.all(
    ITEMS.map((it) =>
      prisma.item.create({
        data: {
          businessId,
          kind: it.kind,
          code: it.code,
          name: it.name,
          unit: it.unit,
          defaultPrice: it.price,
          vatRate: it.vat,
        },
      }),
    ),
  );

  // Documents — 14 months back through today.
  const now = new Date();
  const rng = mulberry32(20260701);
  const invoiceBook = books.find((b) => b.series === "A")!;
  const salesBook = books.find((b) => b.series === "B")!;
  const receiptBook = books.find((b) => b.series === "R")!;

  const doctypeCycle: {
    type: Prisma.DocumentCreateInput["type"];
    book: (typeof books)[number];
    weight: number;
  }[] = [
    { type: "service_invoice", book: invoiceBook, weight: 5 },
    { type: "invoice", book: salesBook, weight: 3 },
    { type: "retail_receipt", book: receiptBook, weight: 2 },
  ];

  let created = 0;
  for (let month = 13; month >= 0; month--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - month, 1);
    const monthDocs = 6 + Math.floor(rng() * 8) + (month < 3 ? 4 : 0);
    for (let d = 0; d < monthDocs; d++) {
      const chosen = pickWeighted(doctypeCycle, rng);
      const day = 1 + Math.floor(rng() * 27);
      const issue = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        day,
        9 + Math.floor(rng() * 8),
        Math.floor(rng() * 60),
      );
      if (issue > now) continue;

      const client = createdClients[Math.floor(rng() * createdClients.length)]!;
      const lineCount = 1 + Math.floor(rng() * 4);
      let net = new Prisma.Decimal(0);
      let vat = new Prisma.Decimal(0);
      const lines = [];
      for (let li = 0; li < lineCount; li++) {
        const item = createdItems[Math.floor(rng() * createdItems.length)]!;
        const qty = 1 + Math.floor(rng() * 4);
        const price = new Prisma.Decimal(item.defaultPrice);
        const discount = rng() < 0.15 ? 5 + Math.floor(rng() * 10) : 0;
        const gross = price.mul(qty);
        const netLine = gross.mul(100 - discount).div(100);
        const vatLine = netLine.mul(item.vatRate).div(100);
        net = net.add(netLine);
        vat = vat.add(vatLine);
        lines.push({
          itemId: item.id,
          ordinal: li,
          description: item.name,
          quantity: new Prisma.Decimal(qty),
          unit: item.unit,
          unitPrice: price,
          discountPct: new Prisma.Decimal(discount),
          vatRate: new Prisma.Decimal(item.vatRate),
          netAmount: netLine,
          vatAmount: vatLine,
          totalAmount: netLine.add(vatLine),
        });
      }
      const total = net.add(vat);

      // Reserve number
      const numberedBook = await prisma.billingBook.update({
        where: { id: chosen.book.id },
        data: { nextNumber: { increment: 1 } },
      });
      const number = numberedBook.nextNumber - 1;

      const isRecent = month < 2;
      const isDraft = isRecent && rng() < 0.15;
      const isFailed = !isDraft && isRecent && rng() < 0.05;
      const paid = !isDraft && !isFailed && rng() < 0.75;

      const status = isDraft ? "draft" : isFailed ? "failed" : "issued";
      const paymentStatus = paid ? "paid" : rng() < 0.25 ? "partial" : "unpaid";

      const doc = await prisma.document.create({
        data: {
          businessId,
          clientId: client.id,
          branchId: chosen.book.branchId,
          billingBookId: chosen.book.id,
          type: chosen.type,
          status,
          paymentStatus,
          series: chosen.book.series,
          number: status === "draft" ? null : number,
          issueDate: issue,
          netTotalAmount: net,
          vatTotalAmount: vat,
          totalAmount: total,
          payableTotalAmount: total,
          paymentMethod: pick(
            [
              "Μετρητά",
              "Χρεωστική / Πιστωτική κάρτα",
              "Τραπεζική μεταφορά",
              "IRIS",
            ],
            rng,
          ),
          printLanguage: "el",
          issuedAt: status === "issued" ? issue : null,
          myDataMark:
            status === "issued"
              ? `4001234${(created + 100).toString().padStart(4, "0")}`
              : null,
          myDataUid:
            status === "issued"
              ? `UID-${Math.floor(rng() * 10 ** 10)}`
              : null,
          myDataQrUrl:
            status === "issued"
              ? "https://www.aade.gr/mydata/qr/demo"
              : null,
          wrappInvoiceId:
            status === "issued" ? `wrapp-${created + 5000}` : null,
        },
      });

      await prisma.documentLine.createMany({
        data: lines.map((l) => ({ ...l, documentId: doc.id })),
      });
      created++;
    }
  }

  // Extra team members (demo — creates users if missing).
  const teamPassword = await hash("demo-password-2026", ARGON2);
  const team = [
    {
      email: "mairh.papadopoulou@nikolaou-consulting.gr",
      fullName: "Μαίρη Παπαδοπούλου",
      role: "admin" as const,
    },
    {
      email: "kostas.dimitriou@nikolaou-consulting.gr",
      fullName: "Κώστας Δημητρίου",
      role: "accountant" as const,
    },
    {
      email: "eleni.karagianni@nikolaou-consulting.gr",
      fullName: "Ελένη Καραγιάννη",
      role: "sales" as const,
    },
  ];
  for (const m of team) {
    const u = await prisma.user.upsert({
      where: { email: m.email },
      create: {
        email: m.email,
        fullName: m.fullName,
        passwordHash: teamPassword,
      },
      update: { fullName: m.fullName },
    });
    await prisma.businessMember.upsert({
      where: {
        userId_businessId: { userId: u.id, businessId },
      },
      create: { userId: u.id, businessId, role: m.role },
      update: { role: m.role },
    });
  }

  // Platform-side (for admin screenshots) — a Business plan subscription.
  const plan = await prisma.platformPlan.upsert({
    where: { code: "business" },
    create: {
      code: "business",
      name: "Business",
      description: "Ολοκληρωμένη οικονομική εικόνα.",
      priceMonthly: 14.9,
      priceYearly: 149,
      includedDocsMonth: 150,
      features: "Έκδοση παραστατικών\nΈξοδα & προμηθευτές\nΠληρωμές",
      sortOrder: 20,
    },
    update: {},
  });
  const now2 = new Date();
  const periodEnd = new Date(now2.getFullYear() + 1, now2.getMonth(), now2.getDate());
  await prisma.businessSubscription.updateMany({
    where: { businessId, status: { in: ["active", "trialing", "past_due"] } },
    data: { status: "cancelled", cancelledAt: now2 },
  });
  const sub = await prisma.businessSubscription.create({
    data: {
      businessId,
      planId: plan.id,
      billingCycle: "yearly",
      status: "active",
      currentPeriodStart: now2,
      currentPeriodEnd: periodEnd,
      nextBillingAt: periodEnd,
    },
  });

  // Provider cost sample
  await prisma.providerCost.create({
    data: {
      businessId,
      periodStart: now2,
      periodEnd: periodEnd,
      netAmount: 28.23,
      vatAmount: 6.77,
      totalAmount: 35,
      description: "Χρέωση Wrapp — ετήσια συνδρομή παρόχου",
    },
  });

  // Platform invoice (issued)
  await prisma.platformInvoice.create({
    data: {
      businessId,
      subscriptionId: sub.id,
      description: "Ετήσια συνδρομή Business — timologion",
      series: "PL",
      number: 1,
      issueDate: now2,
      status: "issued",
      issuedAt: now2,
      netAmount: 149,
      vatAmount: 35.76,
      totalAmount: 184.76,
      providerCost: 35,
      providerRebate: 0,
      margin: new Prisma.Decimal(184.76).sub(35),
      wrappInvoiceId: "wrapp-platform-1",
      wrappInvoiceUrl: "https://wrapp.ai/inv/demo",
      myDataMark: "40012340000001",
      myDataUid: "UID-PL-1",
    },
  });

  console.log(`
✓ Demo data seeded for ${businessName} (${businessId})
   ${createdClients.length} πελάτες
   ${createdItems.length} είδη/υπηρεσίες
   ${created} παραστατικά (14 μήνες)
   ${team.length} μέλη ομάδας
   1 συνδρομή Business + πρόχειρο platform invoice

Test team credentials (any of):
   mairh.papadopoulou@nikolaou-consulting.gr / demo-password-2026
   kostas.dimitriou@nikolaou-consulting.gr / demo-password-2026
   eleni.karagianni@nikolaou-consulting.gr / demo-password-2026
`);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
function pickWeighted<T extends { weight: number }>(
  arr: T[],
  rng: () => number,
): T {
  const total = arr.reduce((s, a) => s + a.weight, 0);
  let r = rng() * total;
  for (const item of arr) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return arr[arr.length - 1]!;
}
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
