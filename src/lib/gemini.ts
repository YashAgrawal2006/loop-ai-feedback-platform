import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

export const gemini = new GoogleGenAI({
  apiKey,
  httpOptions: {
    retryOptions: {
      attempts: 1,
    },
  },
});

export const GEMINI_MODEL = "gemini-3.5-flash";

export async function generateGeminiText(prompt: string) {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return response.text ?? "";
}