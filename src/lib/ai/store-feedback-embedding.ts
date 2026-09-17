import { prisma } from "../prisma";
import { createEmbedding } from "./create-embedding";

type StoreFeedbackEmbeddingInput = {
  feedbackId: string;
  workspaceId: string;
};

export async function storeFeedbackEmbedding({
  feedbackId,
  workspaceId,
}: StoreFeedbackEmbeddingInput) {
  // Find the feedback by its unique ID first.
  const feedback = await prisma.feedback.findUnique({
    where: {
      id: feedbackId,
    },
    select: {
      id: true,
      content: true,
      workspaceId: true,
    },
  });

  if (!feedback) {
    throw new Error(
      "Feedback record does not exist."
    );
  }

  // Enforce workspace isolation explicitly.
  if (feedback.workspaceId !== workspaceId) {
    throw new Error(
      `Feedback belongs to workspace "${feedback.workspaceId}", not the current workspace.`
    );
  }

  // Generate the semantic embedding.
  const embedding = await createEmbedding(
    feedback.content
  );

  // Store or update the embedding.
  const storedEmbedding =
    await prisma.embedding.upsert({
      where: {
        feedbackId: feedback.id,
      },
      update: {
        vector: JSON.stringify(embedding),
      },
      create: {
        feedbackId: feedback.id,
        vector: JSON.stringify(embedding),
      },
    });

  return {
    id: storedEmbedding.id,
    feedbackId: storedEmbedding.feedbackId,
    dimensions: embedding.length,
  };
}