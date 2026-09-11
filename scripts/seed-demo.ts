import "dotenv/config";
import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const DEMO_WORKSPACE_ID = "loop-demo-workspace";

const demoUsers = [
  {
    name: "LOOP Admin",
    email: "admin@loop-demo.com",
    password: "Admin@12345",
    role: "ADMIN" as const,
  },
  {
    name: "LOOP Analyst",
    email: "analyst@loop-demo.com",
    password: "Analyst@12345",
    role: "ANALYST" as const,
  },
  {
    name: "LOOP Viewer",
    email: "viewer@loop-demo.com",
    password: "Viewer@12345",
    role: "VIEWER" as const,
  },
];

async function main() {
  console.log("Seeding LOOP demo users...");

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: DEMO_WORKSPACE_ID,
    },
  });

  if (!workspace) {
    throw new Error(
      `Demo workspace "${DEMO_WORKSPACE_ID}" does not exist. Run setup-workspace.ts first.`
    );
  }

  for (const demoUser of demoUsers) {
    const passwordHash = await bcrypt.hash(demoUser.password, 12);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: demoUser.email,
      },
    });

    if (existingUser && existingUser.workspaceId !== DEMO_WORKSPACE_ID) {
      throw new Error(
        `User ${demoUser.email} already belongs to another workspace.`
      );
    }

    const user = await prisma.user.upsert({
      where: {
        email: demoUser.email,
      },
      update: {
        name: demoUser.name,
        passwordHash,
        role: demoUser.role,
        workspaceId: DEMO_WORKSPACE_ID,
      },
      create: {
        name: demoUser.name,
        email: demoUser.email,
        passwordHash,
        role: demoUser.role,
        workspaceId: DEMO_WORKSPACE_ID,
      },
    });

    console.log(
      `✓ ${user.name} | ${user.email} | ${user.role}`
    );
  }

  console.log("");
  console.log("Demo users seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });