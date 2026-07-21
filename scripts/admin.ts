#!/usr/bin/env tsx
/**
 * Manage platform admins from the command line.
 *
 *   npm run admin promote <email> [role]
 *   npm run admin demote  <email>
 *   npm run admin list
 *   npm run admin create  <email> <password> [fullName] [role]
 *
 * `role` defaults to `super_admin`. Valid roles: super_admin, support, analyst.
 * `create` creates the user if missing and sets the platform role.
 *
 * Requires DATABASE_URL. Loads .env automatically via prisma client.
 */
import { randomBytes, createHmac } from "node:crypto";
import { PrismaClient, type PlatformRole } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ARGON2 = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const ROLES: PlatformRole[] = ["super_admin", "support", "analyst"];

async function main() {
  const [cmd, arg1, arg2] = process.argv.slice(2);

  if (!cmd) {
    printUsage();
    process.exit(1);
  }

  if (cmd === "list") {
    const admins = await prisma.user.findMany({
      where: { platformRole: { not: null } },
      select: {
        email: true,
        fullName: true,
        platformRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    if (admins.length === 0) {
      console.log("Δεν υπάρχουν platform admins.");
      return;
    }
    console.table(
      admins.map((a) => ({
        email: a.email,
        role: a.platformRole,
        name: a.fullName,
      })),
    );
    return;
  }

  if (!arg1) {
    printUsage();
    process.exit(1);
  }

  if (cmd === "login-token") {
    const email = arg1.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error("Ο χρήστης δεν βρέθηκε.");
      process.exit(1);
    }
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      console.error("SESSION_SECRET δεν έχει οριστεί σωστά στο .env.");
      process.exit(1);
    }
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHmac("sha256", secret).update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: "cli-verification",
      },
    });
    console.log(token);
    return;
  }

  if (cmd === "create") {
    const email = arg1.toLowerCase();
    const password = arg2 ?? randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const fullName = process.argv[5] ?? "Platform Admin";
    const role = (process.argv[6] ?? "super_admin") as PlatformRole;
    if (!ROLES.includes(role)) {
      console.error(`Άγνωστος ρόλος: ${role}.`);
      process.exit(1);
    }
    const passwordHash = await hash(password, ARGON2);
    const user = await prisma.user.upsert({
      where: { email },
      update: { platformRole: role, fullName, passwordHash },
      create: { email, fullName, passwordHash, platformRole: role },
      select: { email: true, platformRole: true, fullName: true },
    });
    console.log("\n✓ Δημιουργήθηκε / ενημερώθηκε platform admin:");
    console.log("   email:     " + user.email);
    console.log("   όνομα:     " + user.fullName);
    console.log("   ρόλος:     " + user.platformRole);
    console.log("   password:  " + password);
    console.log(
      "\nΣύνδεση: http://localhost:3000/login  →  θα σε προωθήσει στο /admin.\n",
    );
    return;
  }

  if (cmd === "promote") {
    const role = (arg2 ?? "super_admin") as PlatformRole;
    if (!ROLES.includes(role)) {
      console.error(
        `Άγνωστος ρόλος: ${role}. Επίτρεπτοι ρόλοι: ${ROLES.join(", ")}`,
      );
      process.exit(1);
    }
    const user = await prisma.user.update({
      where: { email: arg1.toLowerCase() },
      data: { platformRole: role },
      select: { email: true, platformRole: true },
    });
    console.log(`✓ Ο χρήστης ${user.email} έγινε ${user.platformRole}.`);
    return;
  }

  if (cmd === "demote") {
    // Guard against demoting the last super_admin.
    const target = await prisma.user.findUnique({
      where: { email: arg1.toLowerCase() },
      select: { id: true, platformRole: true },
    });
    if (!target) {
      console.error("Ο χρήστης δεν βρέθηκε.");
      process.exit(1);
    }
    if (target.platformRole === "super_admin") {
      const count = await prisma.user.count({
        where: { platformRole: "super_admin" },
      });
      if (count <= 1) {
        console.error(
          "Δεν μπορεί να αφαιρεθεί ο τελευταίος super_admin. Πρόαγε πρώτα κάποιον άλλον.",
        );
        process.exit(1);
      }
    }
    const user = await prisma.user.update({
      where: { email: arg1.toLowerCase() },
      data: { platformRole: null },
      select: { email: true },
    });
    console.log(`✓ Ο χρήστης ${user.email} δεν είναι πλέον platform admin.`);
    return;
  }

  printUsage();
  process.exit(1);
}

function printUsage() {
  console.log(`Χρήση:
  npm run admin -- promote <email> [role]
  npm run admin -- demote  <email>
  npm run admin -- list

  Ρόλοι: ${ROLES.join(", ")} (default: super_admin)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
