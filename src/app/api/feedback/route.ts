import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../lib/prisma";
import { hasRole, requireUser } from "../../../lib/authz";
import { classifyFeedback } from "../../../lib/ai/classify-feedback";
import { linkFeedbackToTheme } from "../../../lib/ai/link-feedback-theme";

const feedbackStatusSchema = z.enum([
  "NEW",
  "REVIEWED",
  "ACTIONED",
]);

const updateFeedbackSchema = z.object({
  id: z.string().min(1),
  status: feedbackStatusSchema,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      customer,
      message,
      source,
    } = body;

    if (!customer || !message || !source) {
      return NextResponse.json(
        {
          error:
            "customer, message, and source are required",
        },
        { status: 400 }
      );
    }

    // Public customer feedback submission.
    // Use the default workspace for unauthenticated submissions.
    const workspace = await prisma.workspace.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace available" },
        { status: 500 }
      );
    }

    // Let Gemini analyze the customer feedback.
    const classification = await classifyFeedback(message);

    const feedback = await prisma.feedback.create({
      data: {
        customerLabel: customer,
        content: message,
        channel: source,

        // AI classification
        sentiment: classification.sentiment,
        category: classification.category,
        theme: classification.theme,
        urgency: classification.urgency,
        priority: classification.priority,
        summary: classification.summary,

        workspaceId: workspace.id,
      },
    });

    // Link the AI-generated theme to the feedback.
    await linkFeedbackToTheme({
      feedbackId: feedback.id,
      workspaceId: workspace.id,
      themeName: classification.theme,
    });

    return NextResponse.json(
      {
        ...feedback,
        classification,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error creating feedback:", error);

    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}