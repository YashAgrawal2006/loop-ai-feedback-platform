import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "../../../../lib/authz";
import { searchSimilarFeedback } from "../../../../lib/ai/search-similar-feedback";

const requestSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  limit: z.number().int().min(1).max(20).optional(),
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
          error: "Invalid search request.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const results = await searchSimilarFeedback({
      query: parsed.data.query,
      workspaceId: user.workspaceId,
      limit: parsed.data.limit ?? 5,
    });

    return NextResponse.json({
      success: true,
      query: parsed.data.query,
      results,
    });
  } catch (error) {
    console.error(
      "Semantic feedback search error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Semantic feedback search failed.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}