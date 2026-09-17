import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "../../../../lib/authz";
import { storeFeedbackEmbedding } from "../../../../lib/ai/store-feedback-embedding";

const requestSchema = z.object({
  feedbackId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid feedback ID.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await storeFeedbackEmbedding({
      feedbackId: parsed.data.feedbackId,
      workspaceId: user.workspaceId,
    });

    return NextResponse.json({
      success: true,
      embedding: result,
    });
  } catch (error) {
    console.error(
      "Embedding storage test error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to store feedback embedding.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}