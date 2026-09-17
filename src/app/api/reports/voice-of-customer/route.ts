import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "../../../../lib/authz";
import { prisma } from "../../../../lib/prisma";
import { generateVoiceOfCustomerReport } from "../../../../lib/reports/voice-of-customer";

const reportPeriodSchema = z
  .object({
    periodStart: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Start date must use YYYY-MM-DD format."
      ),

    periodEnd: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "End date must use YYYY-MM-DD format."
      ),
  })
  .refine(
    (data) => data.periodStart <= data.periodEnd,
    {
      message: "Start date cannot be after the end date.",
      path: ["periodEnd"],
    }
  );

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatReportTitle(
  periodStart: Date,
  periodEnd: Date
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `Voice of Customer Report — ${formatter.format(
    periodStart
  )} to ${formatter.format(periodEnd)}`;
}

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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must contain a valid JSON object.",
        },
        { status: 400 }
      );
    }

    const parsed = reportPeriodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message ??
            "Invalid report period.",
        },
        { status: 400 }
      );
    }

    const periodStart = parseDateOnly(
      parsed.data.periodStart
    );

    const periodEnd = parseDateOnly(
      parsed.data.periodEnd
    );

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected report period contains an invalid date.",
        },
        { status: 400 }
      );
    }

    /*
     * Make the end date inclusive.
     *
     * The report service also normalizes the reporting
     * boundaries, but keeping the API input date-only makes
     * the contract simple and predictable for the UI.
     */
    periodEnd.setHours(23, 59, 59, 999);

    if (periodStart > periodEnd) {
      return NextResponse.json(
        {
          success: false,
          error: "Start date cannot be after the end date.",
        },
        { status: 400 }
      );
    }

    /*
     * Generate the report using ONLY the authenticated
     * user's workspace and the selected reporting period.
     */
    const report = await generateVoiceOfCustomerReport({
      workspaceId: user.workspaceId,
      periodStart,
      periodEnd,
    });

    /*
     * Save the complete generated report using the
     * Zidio-aligned Report fields.
     */
    const savedReport = await prisma.report.create({
      data: {
        workspaceId: user.workspaceId,

        generatedById: user.id,

        periodStart,
        periodEnd,

        title: formatReportTitle(
          periodStart,
          periodEnd
        ),

        contentJson: JSON.stringify(report),

        /*
         * Legacy field retained temporarily because existing
         * reports were created before contentJson was introduced.
         */
        content: JSON.stringify(report),
      },
    });

    return NextResponse.json({
      success: true,

      report,

      savedReport: {
        id: savedReport.id,
        title: savedReport.title,
        periodStart: savedReport.periodStart,
        periodEnd: savedReport.periodEnd,
        generatedById: savedReport.generatedById,
        createdAt: savedReport.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Voice-of-Customer report error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate Voice-of-Customer report.",
      },
      { status: 500 }
    );
  }
}