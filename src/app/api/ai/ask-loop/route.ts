import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "../../../../lib/authz";
import { askLoop } from "../../../../lib/ai/ask-loop";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
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
          error: "Invalid question.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await askLoop({
      question: parsed.data.question,
      workspaceId: user.workspaceId,
    });

    return NextResponse.json({
      success: true,
      question: parsed.data.question,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error("Ask LOOP error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Ask LOOP request failed.",
      },
      { status: 500 }
    );
  }
}