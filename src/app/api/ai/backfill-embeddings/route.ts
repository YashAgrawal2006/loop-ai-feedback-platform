import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { gemini } from "../../../../lib/gemini";
import { hasRole, requireUser } from "../../../../lib/authz";

const EMBEDDING_MODEL = "gemini-embedding-001";
const BATCH_SIZE = 10;
const EXPECTED_DIMENSIONS = 3072;

type PendingFeedback = {
  id: string;
  content: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error);
}

function isQuotaError(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();

  return (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    normalized.includes("quota exceeded") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota")
  );
}

export async function POST() {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // 2. ROLE PROTECTION
    // -----------------------------------------------------------------------

    if (!hasRole(user.role, ["ADMIN", "ANALYST"])) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------------------------------
    // 3. FIND ONLY FEEDBACK WITHOUT EMBEDDINGS
    // -----------------------------------------------------------------------

    const feedback = await prisma.feedback.findMany({
      where: {
        workspaceId: user.workspaceId,
        embedding: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        content: true,
      },
    });

    // -----------------------------------------------------------------------
    // 4. NOTHING TO PROCESS
    // -----------------------------------------------------------------------

    if (feedback.length === 0) {
      const existingCount = await prisma.embedding.count({
        where: {
          feedback: {
            workspaceId: user.workspaceId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "All workspace feedback already has embeddings.",
        results: {
          total: 0,
          succeeded: 0,
          failed: 0,
          batches: 0,
          existingEmbeddings: existingCount,
          failures: [],
        },
      });
    }

    // -----------------------------------------------------------------------
    // 5. PROCESSING STATISTICS
    // -----------------------------------------------------------------------

    const results = {
      total: feedback.length,
      succeeded: 0,
      failed: 0,
      batches: 0,
      existingEmbeddings: 0,
      failures: [] as Array<{
        feedbackId: string;
        error: string;
      }>,
    };

    // -----------------------------------------------------------------------
    // 6. PROCESS BATCHES
    // -----------------------------------------------------------------------

    for (
      let start = 0;
      start < feedback.length;
      start += BATCH_SIZE
    ) {
      const batch = feedback.slice(
        start,
        start + BATCH_SIZE
      ) as PendingFeedback[];

      results.batches += 1;

      try {
        // Gemini supports multiple Content objects in one embedding call.
        // Each Content object produces its own embedding.
        const response = await gemini.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: batch.map((item) => ({
            parts: [
              {
                text: item.content,
              },
            ],
          })),
        });

        const embeddings = response.embeddings ?? [];

        // ---------------------------------------------------------------
        // Validate batch size
        // ---------------------------------------------------------------

        if (embeddings.length !== batch.length) {
          throw new Error(
            `Embedding batch size mismatch. Expected ${batch.length} embeddings but received ${embeddings.length}.`
          );
        }

        // ---------------------------------------------------------------
        // Validate dimensions and build database rows
        // ---------------------------------------------------------------

        const rows = batch.map((item, index) => {
          const values = embeddings[index]?.values;

          if (
            !values ||
            values.length !== EXPECTED_DIMENSIONS
          ) {
            throw new Error(
              `Invalid embedding dimensions for feedback ${item.id}. Expected ${EXPECTED_DIMENSIONS}, received ${values?.length ?? 0}.`
            );
          }

          return {
            feedbackId: item.id,
            vector: JSON.stringify(values),
          };
        });

        // ---------------------------------------------------------------
        // Save the complete validated batch
        // ---------------------------------------------------------------

        const saved = await prisma.embedding.createMany({
          data: rows,
          skipDuplicates: true,
        });

        results.succeeded += saved.count;
      } catch (error) {
        const errorMessage = getErrorMessage(error);

        console.error(
          `Embedding batch ${results.batches} failed:`,
          error
        );

        // ---------------------------------------------------------------
        // QUOTA / RATE LIMIT
        // ---------------------------------------------------------------

        if (isQuotaError(error)) {
          results.failed += batch.length;

          results.failures.push(
            ...batch.map((item) => ({
              feedbackId: item.id,
              error: errorMessage,
            }))
          );

          return NextResponse.json(
            {
              success: false,
              quotaExceeded: true,
              message:
                "Gemini embedding quota/rate limit was reached. Successfully stored embeddings remain saved.",
              results,
            },
            { status: 429 }
          );
        }

        // ---------------------------------------------------------------
        // NON-QUOTA BATCH FAILURE
        // ---------------------------------------------------------------

        results.failed += batch.length;

        results.failures.push(
          ...batch.map((item) => ({
            feedbackId: item.id,
            error: errorMessage,
          }))
        );

        // Continue with the next batch.
        // This keeps already successful batches intact.
      }
    }

    // -----------------------------------------------------------------------
    // 7. FINAL COUNT
    // -----------------------------------------------------------------------

    const finalEmbeddingCount =
      await prisma.embedding.count({
        where: {
          feedback: {
            workspaceId: user.workspaceId,
          },
        },
      });

    results.existingEmbeddings =
      finalEmbeddingCount;

    return NextResponse.json({
      success: results.failed === 0,
      message:
        results.failed === 0
          ? "Embedding backfill completed successfully."
          : "Embedding backfill completed with some failed batches. Successfully stored embeddings remain saved.",
      results,
    });
  } catch (error) {
    console.error(
      "Embedding backfill error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Embedding backfill failed.",
      },
      { status: 500 }
    );
  }
}