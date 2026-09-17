import { prisma } from "../prisma";
import { createEmbedding } from "./create-embedding";

type SimilarFeedback = {
  feedbackId: string;
  similarity: number;
  customerLabel: string;
  content: string;
  channel: string;
  sentiment: string | null;
  category: string | null;
  theme: string | null;
  priority: string | null;
  createdAt: Date;
};

type SearchSimilarFeedbackInput = {
  query: string;
  workspaceId: string;
  limit?: number;
};

function cosineSimilarity(
  vectorA: number[],
  vectorB: number[]
) {
  if (
    vectorA.length === 0 ||
    vectorB.length === 0 ||
    vectorA.length !== vectorB.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return (
    dotProduct /
    (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
  );
}

export async function searchSimilarFeedback({
  query,
  workspaceId,
  limit = 5,
}: SearchSimilarFeedbackInput): Promise<
  SimilarFeedback[]
> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const safeLimit = Math.min(
    Math.max(limit, 1),
    20
  );

  // Generate an embedding for the user's search query.
  const queryEmbedding = await createEmbedding(
    normalizedQuery
  );

  // Only retrieve embeddings belonging to feedback
  // inside the current workspace.
  const storedEmbeddings =
    await prisma.embedding.findMany({
      where: {
        feedback: {
          workspaceId,
        },
      },
      include: {
        feedback: {
          select: {
            id: true,
            customerLabel: true,
            content: true,
            channel: true,
            sentiment: true,
            category: true,
            theme: true,
            priority: true,
            createdAt: true,
          },
        },
      },
    });

  const results: SimilarFeedback[] = [];

  for (const storedEmbedding of storedEmbeddings) {
    if (!storedEmbedding.vector) {
      continue;
    }

    try {
      const vector = JSON.parse(
        storedEmbedding.vector
      );

      if (!Array.isArray(vector)) {
        continue;
      }

      const similarity = cosineSimilarity(
        queryEmbedding,
        vector
      );

      results.push({
        feedbackId:
          storedEmbedding.feedback.id,
        similarity,
        customerLabel:
          storedEmbedding.feedback.customerLabel,
        content:
          storedEmbedding.feedback.content,
        channel:
          storedEmbedding.feedback.channel,
        sentiment:
          storedEmbedding.feedback.sentiment,
        category:
          storedEmbedding.feedback.category,
        theme:
          storedEmbedding.feedback.theme,
        priority:
          storedEmbedding.feedback.priority,
        createdAt:
          storedEmbedding.feedback.createdAt,
      });
    } catch (error) {
      console.error(
        `Failed to parse embedding for feedback ${storedEmbedding.feedback.id}:`,
        error
      );
    }
  }

  return results
    .sort(
      (a, b) =>
        b.similarity - a.similarity
    )
    .slice(0, safeLimit);
}