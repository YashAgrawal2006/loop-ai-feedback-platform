import { NextResponse } from "next/server";

import { generateGeminiText } from "../../../../lib/gemini";

export async function GET() {
  try {
    const text = await generateGeminiText(
      "You are testing the LOOP AI integration. Reply with exactly: LOOP Gemini connection successful."
    );

    return NextResponse.json({
      success: true,
      message: text,
    });
  } catch (error) {
    console.error("Gemini test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Gemini API test failed.",
      },
      { status: 500 }
    );
  }
}