import { gemini } from "../gemini";

const EMBEDDING_MODEL = "gemini-embedding-001";

export async function createEmbedding(text: string) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("Text cannot be empty.");
  }

  const response = await gemini.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: normalizedText,
  });

  const values = response.embeddings?.[0]?.values;

  if (!values || values.length === 0) {
    throw new Error("Gemini returned an empty embedding.");
  }

  return values;
}