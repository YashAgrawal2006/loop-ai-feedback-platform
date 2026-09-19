import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { gemini, GEMINI_MODEL } from "../../../../lib/gemini";
import { hasRole, requireUser } from "../../../../lib/authz";

/**
 * --------------------------------------------------------------------------
 * ZOD VALIDATION SCHEMAS
 * --------------------------------------------------------------------------
 *
 * Gemini receives a JSON schema and its response is then validated again
 * with Zod before anything is written to PostgreSQL.
 */

const classificationSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),

  category: z.enum([
    "product",
    "service",
    "support",
    "pricing",
    "performance",
    "user_experience",
    "feature_request",
    "other",
  ]),

  theme: z.string().min(1).max(100),

  urgency: z.enum(["low", "medium", "high"]),

  priority: z.enum(["low", "medium", "high"]),

  summary: z.string().min(1).max(300),
});

const batchResultSchema = z.object({
  results: z.array(
    z.object({
      feedbackId: z.string().min(1),
      classification: classificationSchema,
    })
  ),
});

type FeedbackClassification = z.infer<
  typeof classificationSchema
>;

type PendingFeedback = {
  id: string;
  content: string;
  customerLabel: string;
};

/**
 * --------------------------------------------------------------------------
 * GEMINI JSON SCHEMAS
 * --------------------------------------------------------------------------
 *
 * We intentionally use plain JSON Schema here instead of
 * zod-to-json-schema because the installed versions of Zod and
 * @google/genai produced an incompatible TypeScript type.
 *
 * Zod remains responsible for validating Gemini's actual response.
 */

const classificationJsonSchema = {
  type: "object",

  properties: {
    sentiment: {
      type: "string",
      enum: ["positive", "neutral", "negative"],
    },

    category: {
      type: "string",
      enum: [
        "product",
        "service",
        "support",
        "pricing",
        "performance",
        "user_experience",
        "feature_request",
        "other",
      ],
    },

    theme: {
      type: "string",
    },

    urgency: {
      type: "string",
      enum: ["low", "medium", "high"],
    },

    priority: {
      type: "string",
      enum: ["low", "medium", "high"],
    },

    summary: {
      type: "string",
    },
  },

  required: [
    "sentiment",
    "category",
    "theme",
    "urgency",
    "priority",
    "summary",
  ],
} as const;

const batchResultJsonSchema = {
  type: "object",

  properties: {
    results: {
      type: "array",

      items: {
        type: "object",

        properties: {
          feedbackId: {
            type: "string",
          },

          classification: classificationJsonSchema,
        },

        required: [
          "feedbackId",
          "classification",
        ],
      },
    },
  },

  required: ["results"],
} as const;

/**
 * --------------------------------------------------------------------------
 * CONFIGURATION
 * --------------------------------------------------------------------------
 */

const BATCH_SIZE = 10;

/**
 * --------------------------------------------------------------------------
 * ERROR HELPERS
 * --------------------------------------------------------------------------
 */

/**
 * Detect Gemini quota/rate-limit errors.
 *
 * If this occurs, we stop immediately instead of spending more requests
 * trying individual fallback classifications.
 */
function isQuotaError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const normalizedMessage =
    message.toLowerCase();

  return (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    normalizedMessage.includes("quota exceeded") ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("rate limit")
  );
}

/**
 * Get a readable error message.
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

/**
 * --------------------------------------------------------------------------
 * GEMINI SINGLE CLASSIFICATION
 * --------------------------------------------------------------------------
 *
 * Used as a fallback when a complete batch cannot be validated.
 */

async function classifySingle(
  item: PendingFeedback
): Promise<FeedbackClassification> {
  const prompt = `
You are the AI classification engine for Project LOOP,
an AI-powered Customer Feedback Intelligence Platform.

Classify the following customer feedback.

Return ONLY valid JSON matching the required schema.

FEEDBACK:

Customer:
${item.customerLabel}

Feedback:
${item.content}

CLASSIFICATION RULES

SENTIMENT:
Choose exactly one:
- positive
- neutral
- negative

CATEGORY:
Choose exactly one:
- product
- service
- support
- pricing
- performance
- user_experience
- feature_request
- other

URGENCY:
Choose exactly one:
- low
- medium
- high

PRIORITY:
Choose exactly one:
- low
- medium
- high

THEME:
Create one concise, reusable, human-readable theme based ONLY on the feedback.

Prefer themes such as:
- Performance
- Mobile App
- Reporting
- Analytics
- Customer Support
- Pricing
- Reliability
- Checkout
- User Experience
- Feature Request
- Search
- Workflow
- Import/Export
- Navigation
- Notifications
- Authentication
- Dashboard
- Billing
- Integrations

SUMMARY:
Write a short factual summary of the customer's feedback.
Maximum 300 characters.

IMPORTANT:
- Do not invent facts.
- Do not invent customer information.
- Do not infer unsupported information.
- Keep the classification consistent with the actual feedback.
- Return JSON only.
- Do not include markdown.
- Do not include explanations outside the JSON.
`;

  const response =
    await gemini.models.generateContent({
      model: GEMINI_MODEL,

      contents: prompt,

      config: {
        responseMimeType:
          "application/json",

        responseJsonSchema:
          classificationJsonSchema,
      },
    });

  const rawText =
    response.text ?? "";

  if (!rawText.trim()) {
    throw new Error(
      "Gemini returned an empty classification response."
    );
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error(
      "Gemini returned invalid JSON for individual classification."
    );
  }

  const validated =
    classificationSchema.safeParse(
      parsedJson
    );

  if (!validated.success) {
    throw new Error(
      `Individual classification failed Zod validation: ${validated.error.message}`
    );
  }

  return validated.data;
}

/**
 * --------------------------------------------------------------------------
 * GEMINI BATCH CLASSIFICATION
 * --------------------------------------------------------------------------
 */

async function classifyBatch(
  items: PendingFeedback[]
) {
  const input = items.map(
    (item) => ({
      feedbackId: item.id,
      customer: item.customerLabel,
      feedback: item.content,
    })
  );

  const prompt = `
You are the AI classification engine for Project LOOP,
an AI-powered Customer Feedback Intelligence Platform.

Your task is to classify EVERY feedback item in the provided batch.

Return ONLY valid JSON matching the required schema.

For every input feedback item, return exactly one result containing:

- feedbackId
- classification.sentiment
- classification.category
- classification.theme
- classification.urgency
- classification.priority
- classification.summary

CLASSIFICATION RULES

SENTIMENT:
Choose exactly one:
- positive
- neutral
- negative

CATEGORY:
Choose exactly one:
- product
- service
- support
- pricing
- performance
- user_experience
- feature_request
- other

URGENCY:
Choose exactly one:
- low
- medium
- high

PRIORITY:
Choose exactly one:
- low
- medium
- high

THEME:
Create one concise, reusable, human-readable theme based ONLY on the feedback.

Prefer themes such as:
- Performance
- Mobile App
- Reporting
- Analytics
- Customer Support
- Pricing
- Reliability
- Checkout
- User Experience
- Feature Request
- Search
- Workflow
- Import/Export
- Navigation
- Notifications
- Authentication
- Dashboard
- Billing
- Integrations

If none of these fit, create another concise theme that accurately represents the feedback.

SUMMARY:
Write a short factual summary of the feedback.
Maximum 300 characters.

IMPORTANT RULES

1. Classify EVERY input item.
2. Every input feedbackId must appear exactly once.
3. Do not omit any feedbackId.
4. Do not invent facts.
5. Do not invent customer information.
6. Do not infer information that is not supported by the feedback.
7. Keep the classification consistent with the actual feedback.
8. Return JSON only.
9. Do not include markdown.
10. Do not include explanations outside the JSON response.

FEEDBACK BATCH:

${JSON.stringify(
  input,
  null,
  2
)}
`;

  const response =
    await gemini.models.generateContent({
      model: GEMINI_MODEL,

      contents: prompt,

      config: {
        responseMimeType:
          "application/json",

        responseJsonSchema:
          batchResultJsonSchema,
      },
    });

  const rawText =
    response.text ?? "";

  if (!rawText.trim()) {
    throw new Error(
      "Gemini returned an empty classification response."
    );
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error(
      "Gemini returned invalid JSON for the classification batch."
    );
  }

  /**
   * Validate the complete response with Zod.
   */
  const validated =
    batchResultSchema.safeParse(
      parsedJson
    );

  if (!validated.success) {
    throw new Error(
      `Gemini batch classification failed Zod validation: ${validated.error.message}`
    );
  }

  /**
   * Validate feedback IDs.
   */
  const expectedIds =
    new Set(
      items.map(
        (item) => item.id
      )
    );

  const returnedIds =
    new Set(
      validated.data.results.map(
        (item) =>
          item.feedbackId
      )
    );

  /**
   * Number of results must equal number of inputs.
   */
  if (
    validated.data.results.length !==
    items.length
  ) {
    throw new Error(
      `Batch size mismatch. Expected ${items.length} classifications but received ${validated.data.results.length}.`
    );
  }

  /**
   * Duplicate IDs are not allowed.
   */
  if (
    returnedIds.size !==
    items.length
  ) {
    throw new Error(
      "Gemini returned duplicate feedback IDs."
    );
  }

  /**
   * No unexpected IDs.
   */
  for (
    const id of returnedIds
  ) {
    if (
      !expectedIds.has(id)
    ) {
      throw new Error(
        `Gemini returned an unexpected feedback ID: ${id}`
      );
    }
  }

  /**
   * No missing IDs.
   */
  for (
    const id of expectedIds
  ) {
    if (
      !returnedIds.has(id)
    ) {
      throw new Error(
        `Gemini omitted feedback ID: ${id}`
      );
    }
  }

  return validated.data.results;
}

/**
 * --------------------------------------------------------------------------
 * DATABASE SAVE
 * --------------------------------------------------------------------------
 */

async function saveClassification(
  feedbackId: string,
  classification: FeedbackClassification
) {
  await prisma.feedback.update({
    where: {
      id: feedbackId,
    },

    data: {
      sentiment:
        classification.sentiment,

      category:
        classification.category,

      theme:
        classification.theme,

      urgency:
        classification.urgency,

      priority:
        classification.priority,

      summary:
        classification.summary,
    },
  });
}

/**
 * --------------------------------------------------------------------------
 * POST /api/ai/backfill-classification
 * --------------------------------------------------------------------------
 */

export async function POST() {
  try {
    /**
     * 1. Authenticate.
     */
    const user =
      await requireUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /**
     * 2. Only ADMIN and ANALYST users may run AI backfill.
     */
    if (
      !hasRole(
        user.role,
        [
          "ADMIN",
          "ANALYST",
        ]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    /**
     * 3. Find all incompletely classified feedback
     *    inside the current workspace.
     *
     * A record is considered incomplete if ANY required
     * classification field is missing.
     */
    const feedback =
      await prisma.feedback.findMany({
        where: {
          workspaceId:
            user.workspaceId,

          OR: [
            {
              sentiment: null,
            },
            {
              category: null,
            },
            {
              theme: null,
            },
            {
              urgency: null,
            },
            {
              priority: null,
            },
            {
              summary: null,
            },
          ],
        },

        orderBy: {
          createdAt: "asc",
        },

        select: {
          id: true,
          content: true,
          customerLabel: true,
        },
      });

    /**
     * 4. Nothing left to classify.
     */
    if (
      feedback.length === 0
    ) {
      return NextResponse.json({
        success: true,

        message:
          "All feedback is already fully classified.",

        results: {
          total: 0,
          succeeded: 0,
          failed: 0,
          batches: 0,
          batchFallbacks: 0,
          failures: [],
        },
      });
    }

    /**
     * 5. Processing statistics.
     */
    const results = {
      total:
        feedback.length,

      succeeded: 0,

      failed: 0,

      batches: 0,

      batchFallbacks: 0,

      failures:
        [] as Array<{
          feedbackId: string;
          customer: string;
          error: string;
        }>,
    };

    /**
     * 6. Process batches of 10.
     */
    for (
      let start = 0;
      start < feedback.length;
      start += BATCH_SIZE
    ) {
      const batch =
        feedback.slice(
          start,
          start +
            BATCH_SIZE
        );

      results.batches +=
        1;

      /**
       * --------------------------------------------------------------
       * FIRST ATTEMPT: BATCH CLASSIFICATION
       * --------------------------------------------------------------
       */

      try {
        const classifications =
          await classifyBatch(
            batch
          );

        /**
         * Save all validated classifications.
         */
        for (
          const item of classifications
        ) {
          await saveClassification(
            item.feedbackId,
            item.classification
          );

          results.succeeded +=
            1;
        }

        /**
         * Batch succeeded.
         * Move directly to the next batch.
         */
        continue;
      } catch (batchError) {
        const batchErrorMessage =
          getErrorMessage(
            batchError
          );

        console.error(
          `Classification batch ${results.batches} failed:`,
          batchError
        );

        /**
         * ------------------------------------------------------------
         * QUOTA ERROR
         * ------------------------------------------------------------
         *
         * Never fall back to individual calls when quota is exhausted.
         */
        if (
          isQuotaError(
            batchError
          )
        ) {
          results.failed +=
            batch.length;

          results.failures.push(
            ...batch.map(
              (item) => ({
                feedbackId:
                  item.id,

                customer:
                  item.customerLabel,

                error:
                  batchErrorMessage,
              })
            )
          );

          return NextResponse.json(
            {
              success: false,

              quotaExceeded:
                true,

              message:
                "Gemini quota was exhausted while processing the classification batches. Successfully classified records remain saved.",

              results,
            },
            {
              status: 429,
            }
          );
        }

        /**
         * ------------------------------------------------------------
         * FALLBACK: INDIVIDUAL CLASSIFICATION
         * ------------------------------------------------------------
         *
         * If the batch failed for a non-quota reason, classify each
         * feedback item separately.
         *
         * This protects the entire backfill from one malformed batch
         * response or one problematic feedback item.
         */

        results.batchFallbacks +=
          1;

        console.warn(
          `Falling back to individual classification for batch ${results.batches}.`
        );

        for (
          const item of batch
        ) {
          try {
            const classification =
              await classifySingle(
                item
              );

            await saveClassification(
              item.id,
              classification
            );

            results.succeeded +=
              1;
          } catch (individualError) {
            const individualErrorMessage =
              getErrorMessage(
                individualError
              );

            console.error(
              `Individual classification failed for ${item.id}:`,
              individualError
            );

            results.failed +=
              1;

            results.failures.push({
              feedbackId:
                item.id,

              customer:
                item.customerLabel,

              error:
                individualErrorMessage,
            });

            /**
             * If the fallback itself encounters a quota error,
             * stop immediately.
             */
            if (
              isQuotaError(
                individualError
              )
            ) {
              return NextResponse.json(
                {
                  success: false,

                  quotaExceeded:
                    true,

                  message:
                    "Gemini quota was exhausted during individual fallback classification. Successfully classified records remain saved.",

                  results,
                },
                {
                  status: 429,
                }
              );
            }
          }
        }
      }
    }

    /**
     * 7. Final response.
     */
    return NextResponse.json({
      success:
        results.failed === 0,

      message:
        results.failed === 0
          ? "Classification backfill completed successfully."
          : "Classification backfill completed with some failed records. Successfully classified records remain saved.",

      results,
    });
  } catch (error) {
    console.error(
      "Classification backfill error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Classification backfill failed.",
      },
      {
        status: 500,
      }
    );
  }
}