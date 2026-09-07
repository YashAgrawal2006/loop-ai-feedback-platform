import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Setting up LOOP workspace...");

  const workspace = await prisma.workspace.upsert({
    where: {
      id: "loop-demo-workspace",
    },
    update: {},
    create: {
      id: "loop-demo-workspace",
      name: "LOOP Demo Workspace",
    },
  });

  const result = await prisma.feedback.updateMany({
    where: {
      workspaceId: null,
    },
    data: {
      workspaceId: workspace.id,
    },
  });

  console.log(`Workspace ready: ${workspace.name}`);
  console.log(`Feedback assigned to workspace: ${result.count}`);
}

main()
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });