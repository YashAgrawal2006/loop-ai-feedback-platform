import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "../../../../lib/authz";
import { classifyFeedback } from "../../../../lib/ai/classify-feedback";

const requestSchema = z.object({
  feedback: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { feedback } = requestSchema.parse(body);

    const classification = await classifyFeedback(feedback);

    return NextResponse.json({
      success: true,
      classification,
    });
  } catch (error) {
    console.error("Feedback classification error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid feedback input.",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Feedback classification failed.",
      },
      { status: 500 }
    );
  }
}