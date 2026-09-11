import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const DEMO_WORKSPACE_ID = "loop-demo-workspace";

function daysAgo(days: number): Date {
  const date = new Date();

  date.setDate(date.getDate() - days);

  return date;
}

const feedbackData = [
  {
    customerLabel: "Priya Sharma",
    content:
      "The dashboard is much easier to understand now, especially the weekly overview.",
    channel: "Website",
    sentiment: "Positive",
    sentimentScore: 0.91,
    status: "REVIEWED" as const,
    theme: "User Experience",
    priority: "Low",
    createdAt: daysAgo(1),
  },
  {
    customerLabel: "Rahul Mehta",
    content:
      "The application takes too long to load when I open the analytics dashboard.",
    channel: "Email",
    sentiment: "Negative",
    sentimentScore: -0.82,
    status: "NEW" as const,
    theme: "Performance",
    priority: "High",
    createdAt: daysAgo(2),
  },
  {
    customerLabel: "Ananya Gupta",
    content:
      "It would be helpful to export the feedback results as a CSV file.",
    channel: "Support",
    sentiment: "Neutral",
    sentimentScore: 0.05,
    status: "REVIEWED" as const,
    theme: "Feature Request",
    priority: "Medium",
    createdAt: daysAgo(3),
  },
  {
    customerLabel: "Vikram Singh",
    content:
      "The support team resolved my issue quickly and kept me updated throughout.",
    channel: "Email",
    sentiment: "Positive",
    sentimentScore: 0.88,
    status: "ACTIONED" as const,
    theme: "Customer Support",
    priority: "Low",
    createdAt: daysAgo(4),
  },
  {
    customerLabel: "Neha Verma",
    content:
      "I experienced an error while submitting feedback and had to try twice.",
    channel: "Website",
    sentiment: "Negative",
    sentimentScore: -0.67,
    status: "NEW" as const,
    theme: "Reliability",
    priority: "High",
    createdAt: daysAgo(5),
  },
  {
    customerLabel: "Arjun Kapoor",
    content:
      "The new navigation is clean, but finding older feedback still takes too many clicks.",
    channel: "Social Media",
    sentiment: "Neutral",
    sentimentScore: -0.08,
    status: "REVIEWED" as const,
    theme: "User Experience",
    priority: "Medium",
    createdAt: daysAgo(6),
  },
  {
    customerLabel: "Sneha Patel",
    content:
      "The reports give our team a much clearer picture of what customers are asking for.",
    channel: "Website",
    sentiment: "Positive",
    sentimentScore: 0.86,
    status: "ACTIONED" as const,
    theme: "Reporting",
    priority: "Medium",
    createdAt: daysAgo(7),
  },
  {
    customerLabel: "Aman Joshi",
    content:
      "The pricing feels high compared with similar products I have evaluated.",
    channel: "Social Media",
    sentiment: "Negative",
    sentimentScore: -0.74,
    status: "NEW" as const,
    theme: "Pricing",
    priority: "High",
    createdAt: daysAgo(8),
  },
  {
    customerLabel: "Riya Malhotra",
    content:
      "I like the product overall. The feedback search is especially useful.",
    channel: "Website",
    sentiment: "Positive",
    sentimentScore: 0.83,
    status: "REVIEWED" as const,
    theme: "User Experience",
    priority: "Low",
    createdAt: daysAgo(9),
  },
  {
    customerLabel: "Karan Bansal",
    content:
      "The system occasionally becomes unresponsive when there are many records.",
    channel: "Support",
    sentiment: "Negative",
    sentimentScore: -0.79,
    status: "NEW" as const,
    theme: "Performance",
    priority: "High",
    createdAt: daysAgo(10),
  },
  {
    customerLabel: "Meera Iyer",
    content:
      "Please add more filtering options for customer segments.",
    channel: "Email",
    sentiment: "Neutral",
    sentimentScore: 0.02,
    status: "REVIEWED" as const,
    theme: "Feature Request",
    priority: "Medium",
    createdAt: daysAgo(11),
  },
  {
    customerLabel: "Rohan Agarwal",
    content:
      "The support response was fast and the final solution worked perfectly.",
    channel: "Support",
    sentiment: "Positive",
    sentimentScore: 0.94,
    status: "ACTIONED" as const,
    theme: "Customer Support",
    priority: "Low",
    createdAt: daysAgo(12),
  },
  {
    customerLabel: "Simran Kaur",
    content:
      "Some labels in the dashboard are confusing and could be explained better.",
    channel: "Website",
    sentiment: "Neutral",
    sentimentScore: -0.04,
    status: "NEW" as const,
    theme: "User Experience",
    priority: "Medium",
    createdAt: daysAgo(13),
  },
  {
    customerLabel: "Aditya Jain",
    content:
      "I would like to see a comparison of sentiment between different time periods.",
    channel: "Email",
    sentiment: "Neutral",
    sentimentScore: 0.11,
    status: "REVIEWED" as const,
    theme: "Analytics",
    priority: "Medium",
    createdAt: daysAgo(14),
  },
  {
    customerLabel: "Pooja Sinha",
    content:
      "The feedback workflow is simple and our team has started using it regularly.",
    channel: "Website",
    sentiment: "Positive",
    sentimentScore: 0.89,
    status: "ACTIONED" as const,
    theme: "Workflow",
    priority: "Low",
    createdAt: daysAgo(15),
  },
  {
    customerLabel: "Nikhil Rao",
    content:
      "I received an unexpected error when opening an older report.",
    channel: "Support",
    sentiment: "Negative",
    sentimentScore: -0.71,
    status: "NEW" as const,
    theme: "Reliability",
    priority: "High",
    createdAt: daysAgo(16),
  },
  {
    customerLabel: "Ishita Roy",
    content:
      "A mobile-friendly version of the dashboard would be useful for managers.",
    channel: "Social Media",
    sentiment: "Neutral",
    sentimentScore: 0.07,
    status: "REVIEWED" as const,
    theme: "Feature Request",
    priority: "Medium",
    createdAt: daysAgo(17),
  },
  {
    customerLabel: "Dev Sharma",
    content:
      "The analytics view helped us identify an issue we had been missing for weeks.",
    channel: "Website",
    sentiment: "Positive",
    sentimentScore: 0.92,
    status: "ACTIONED" as const,
    theme: "Analytics",
    priority: "High",
    createdAt: daysAgo(18),
  },
  {
    customerLabel: "Tanya Kapoor",
    content:
      "The subscription price is difficult for a small team to justify.",
    channel: "Email",
    sentiment: "Negative",
    sentimentScore: -0.77,
    status: "REVIEWED" as const,
    theme: "Pricing",
    priority: "High",
    createdAt: daysAgo(19),
  },
  {
    customerLabel: "Mohit Verma",
    content:
      "The product is reliable most of the time, but yesterday there was a short outage.",
    channel: "Social Media",
    sentiment: "Negative",
    sentimentScore: -0.58,
    status: "ACTIONED" as const,
    theme: "Reliability",
    priority: "High",
    createdAt: daysAgo(20),
  },
  {
    customerLabel: "Kavya Nair",
    content:
      "I would like more detailed explanations alongside the analytics charts.",
    channel: "Website",
    sentiment: "Neutral",
    sentimentScore: 0.09,
    status: "NEW" as const,
    theme: "Analytics",
    priority: "Low",
    createdAt: daysAgo(21),
  },
  {
    customerLabel: "Saurabh Mishra",
    content:
      "The support experience has improved significantly compared with last month.",
    channel: "Support",
    sentiment: "Positive",
    sentimentScore: 0.81,
    status: "ACTIONED" as const,
    theme: "Customer Support",
    priority: "Medium",
    createdAt: daysAgo(22),
  },
  {
    customerLabel: "Divya Shah",
    content:
      "Please make it easier to bulk update the status of several feedback items.",
    channel: "Email",
    sentiment: "Neutral",
    sentimentScore: 0.04,
    status: "NEW" as const,
    theme: "Workflow",
    priority: "Medium",
    createdAt: daysAgo(23),
  },
  {
    customerLabel: "Yash Malhotra",
    content:
      "The interface feels professional and the feedback details are easy to scan.",
    channel: "Website",
    sentiment: "Positive",
    sentimentScore: 0.9,
    status: "REVIEWED" as const,
    theme: "User Experience",
    priority: "Low",
    createdAt: daysAgo(24),
  },
];

async function main() {
  console.log("Seeding LOOP demo feedback...");

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: DEMO_WORKSPACE_ID,
    },
  });

  if (!workspace) {
    throw new Error(
      `Demo workspace "${DEMO_WORKSPACE_ID}" does not exist.`
    );
  }

  // Remove existing feedback from the demo workspace.
  // This keeps the demo dataset clean and repeatable.
  const deleted = await prisma.feedback.deleteMany({
    where: {
      workspaceId: DEMO_WORKSPACE_ID,
    },
  });

  console.log(`Removed ${deleted.count} existing demo feedback records.`);

  const result = await prisma.feedback.createMany({
    data: feedbackData.map((feedback) => ({
      ...feedback,
      workspaceId: DEMO_WORKSPACE_ID,
    })),
  });

  console.log(
    `✓ Created ${result.count} demo feedback records.`
  );

  console.log("Demo feedback seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Feedback seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });