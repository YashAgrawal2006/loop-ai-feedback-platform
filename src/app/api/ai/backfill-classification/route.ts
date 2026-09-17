import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { hasRole, requireUser } from "../../../../lib/authz";
import { classifyFeedback } from "../../../../lib/ai/classify-feedback";

export async function POST() {
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

    if (!hasRole(user.role, ["ADMIN", "ANALYST"])) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const feedback = await prisma.feedback.findMany({
      where: {
        workspaceId: user.workspaceId,
        OR: [
          { sentiment: null },
          { category: null },
          { theme: null },
          { urgency: null },
          { priority: null },
          { summary: null },
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

    const results = {
      total: feedback.length,
      succeeded: 0,
      failed: 0,
      failures: [] as {
        feedbackId: string;
        customer: string;
        error: string;
      }[],
    };

    for (const item of feedback) {
      try {
        const classification = await classifyFeedback(item.content);

        await prisma.feedback.update({
          where: {
            id: item.id,
          },
          data: {
            sentiment: classification.sentiment,
            category: classification.category,
            theme: classification.theme,
            urgency: classification.urgency,
            priority: classification.priority,
            summary: classification.summary,
          },
        });

        results.succeeded += 1;
      } catch (error) {
        results.failed += 1;

        results.failures.push({
          feedbackId: item.id,
          customer: item.customerLabel,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });

        console.error(
          `Classification backfill failed for ${item.id}:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Classification backfill completed.",
      results,
    });
  } catch (error) {
    console.error("Classification backfill error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Classification backfill failed.",
      },
      { status: 500 }
    );
  }
}