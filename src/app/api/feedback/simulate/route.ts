import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { hasRole, requireUser } from "../../../../lib/authz";

const simulatedFeedback = [
  {
    customer: "Simulated Customer",
    message: "The dashboard is easy to use and very helpful.",
    source: "Website",
    sentiment: "Positive",
    theme: "User Experience",
    priority: "Low",
  },
  {
    customer: "Simulated Customer",
    message: "The application takes too long to load sometimes.",
    source: "Support",
    sentiment: "Negative",
    theme: "Performance",
    priority: "High",
  },
  {
    customer: "Simulated Customer",
    message: "It would be useful to have more export options.",
    source: "Survey",
    sentiment: "Neutral",
    theme: "Feature Request",
    priority: "Medium",
  },
];

export async function POST() {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!hasRole(user.role, ["ADMIN", "ANALYST"])) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const selected =
      simulatedFeedback[
        Math.floor(Math.random() * simulatedFeedback.length)
      ];

    const feedback = await prisma.feedback.create({
      data: {
        customerLabel: selected.customer,
        content: selected.message,
        channel: selected.source,
        sentiment: selected.sentiment,
        theme: selected.theme,
        priority: selected.priority,
        workspaceId: user.workspaceId,
      },
    });

    return NextResponse.json(
      {
        message: "Simulated feedback created successfully",
        feedback,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating simulated feedback:", error);

    return NextResponse.json(
      { error: "Failed to create simulated feedback" },
      { status: 500 }
    );
  }
}