import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../lib/prisma";
import { hasRole, requireUser } from "../../../lib/authz";

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

    const body = await request.json();

    const {
      customer,
      message,
      source,
      sentiment,
      theme,
      priority,
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

    const feedback = await prisma.feedback.create({
      data: {
        customerLabel: customer,
        content: message,
        channel: source,
        sentiment: sentiment || null,
        theme: theme || null,
        priority: priority || null,
        workspaceId: user.workspaceId,
      },
    });

    return NextResponse.json(feedback, {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating feedback:", error);

    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const feedback = await prisma.feedback.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);

    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json();

    const parsed = updateFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback update.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { id, status } = parsed.data;

    const existingFeedback =
      await prisma.feedback.findFirst({
        where: {
          id,
          workspaceId: user.workspaceId,
        },
      });

    if (!existingFeedback) {
      return NextResponse.json(
        { error: "Feedback not found." },
        { status: 404 }
      );
    }

    const updatedFeedback =
      await prisma.feedback.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });

    return NextResponse.json(updatedFeedback);
  } catch (error) {
    console.error(
      "Error updating feedback status:",
      error
    );

    return NextResponse.json(
      { error: "Failed to update feedback status." },
      { status: 500 }
    );
  }
}