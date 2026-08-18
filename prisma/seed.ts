import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hashAnswer } from "../lib/claims";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@findit.com" },
    update: {},
    create: {
      email: "admin@findit.com",
      name: "Platform Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const security = await prisma.user.upsert({
    where: { email: "security@findit.com" },
    update: {},
    create: {
      email: "security@findit.com",
      name: "Campus Security",
      passwordHash,
      role: "SECURITY",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@findit.com" },
    update: {},
    create: {
      email: "user@findit.com",
      name: "Alex Finder",
      passwordHash,
      role: "USER",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "jane@findit.com" },
    update: {},
    create: {
      email: "jane@findit.com",
      name: "Jane Doe",
      passwordHash,
      role: "USER",
    },
  });

  await prisma.item.deleteMany();

  const lostWallet = await prisma.item.create({
    data: {
      title: "Brown Leather Wallet",
      description: "Lost near the library entrance. Contains student ID.",
      category: "Accessories",
      type: "LOST",
      status: "ACTIVE",
      verificationQ: "What color is the student ID card?",
      verificationA: hashAnswer("blue"),
      reportedById: user.id,
      location: {
        create: { latitude: 12.9716, longitude: 77.5946, address: "Main Library" },
      },
    },
  });

  await prisma.item.create({
    data: {
      title: "Blue Backpack",
      description: "Found in cafeteria. Has laptop compartment.",
      category: "Bags",
      type: "FOUND",
      status: "ACTIVE",
      reportedById: user2.id,
      location: {
        create: { latitude: 12.973, longitude: 77.596, address: "Cafeteria Block" },
      },
    },
  });

  await prisma.item.create({
    data: {
      title: "iPhone 14 Pro",
      description: "Lost in parking lot B.",
      category: "Electronics",
      type: "LOST",
      status: "FLAGGED",
      reportedById: user.id,
      location: {
        create: { latitude: 12.97, longitude: 77.592, address: "Parking Lot B" },
      },
    },
  });

  await prisma.claimAudit.create({
    data: {
      itemId: lostWallet.id,
      claimantId: user2.id,
      status: "PENDING",
      answer: "blue",
    },
  });

  console.log("Seed complete!");
  console.log("Demo accounts (password: password123):");
  console.log("  Admin:    admin@findit.com");
  console.log("  Security: security@findit.com");
  console.log("  User:     user@findit.com");
  console.log("  User:     jane@findit.com");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
