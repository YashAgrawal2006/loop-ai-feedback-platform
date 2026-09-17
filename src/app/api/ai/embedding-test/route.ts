import { NextResponse } from "next/server";
import { z } from "zod";

import { createEmbedding } from "../../../../lib/ai/create-embedding";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid text input.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const embedding = await createEmbedding(
      parsed.data.text
    );

    return NextResponse.json({
      success: true,
      dimensions: embedding.length,
      embedding: embedding.slice(0, 10),
    });
  } catch (error) {
    console.error("Embedding test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Embedding generation failed.",
      },
      { status: 500 }
    );
  }
}