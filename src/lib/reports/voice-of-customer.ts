import { prisma } from "../prisma";
import { generateGeminiText } from "../gemini";

type GenerateVoiceOfCustomerReportInput = {
  workspaceId: string;
  periodStart: Date;
  periodEnd: Date;
};

function normalizeStartOfDay(date: Date) {
  const normalized = new Date(date);

  normalized.setHours(0, 0, 0, 0);

  return normalized;
}

function normalizeEndOfDay(date: Date) {
  const normalized = new Date(date);

  normalized.setHours(23, 59, 59, 999);

  return normalized;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calculateSentimentCounts(
  feedback: Array<{ sentiment: string | null }>
) {
  return {
    positive: feedback.filter(
      (item) => item.sentiment === "positive"
    ).length,

    neutral: feedback.filter(
      (item) => item.sentiment === "neutral"
    ).length,

    negative: feedback.filter(
      (item) => item.sentiment === "negative"
    ).length,
  };
}

function calculateSentimentPercentages(
  counts: {
    positive: number;
    neutral: number;
    negative: number;
  },
  total: number
) {
  return {
    positive:
      total > 0
        ? Math.round((counts.positive / total) * 100)
        : 0,

    neutral:
      total > 0
        ? Math.round((counts.neutral / total) * 100)
        : 0,

    negative:
      total > 0
        ? Math.round((counts.negative / total) * 100)
        : 0,
  };
}

function calculateSentimentShift(
  current: {
    positive: number;
    neutral: number;
    negative: number;
  },
  previous: {
    positive: number;
    neutral: number;
    negative: number;
  }
) {
  return {
    positive: current.positive - previous.positive,
    neutral: current.neutral - previous.neutral,
    negative: current.negative - previous.negative,
  };
}

export async function generateVoiceOfCustomerReport({
  workspaceId,
  periodStart,
  periodEnd,
}: GenerateVoiceOfCustomerReportInput) {
  const normalizedStart = normalizeStartOfDay(periodStart);
  const normalizedEnd = normalizeEndOfDay(periodEnd);

  if (normalizedStart > normalizedEnd) {
    throw new Error(
      "Report period start date cannot be after the end date."
    );
  }

  /*
   * Calculate the previous comparable period.
   *
   * Example:
   *
   * Current:
   * September 11 → September 17
   *
   * Previous:
   * September 4 → September 10
   */
  const periodLengthMs =
    normalizedEnd.getTime() -
    normalizedStart.getTime() +
    24 * 60 * 60 * 1000;

  const previousPeriodEnd = new Date(
    normalizedStart.getTime() - 1
  );

  const previousPeriodStart = new Date(
    previousPeriodEnd.getTime() -
      periodLengthMs +
      1
  );

  /*
   * Fetch only feedback belonging to the authenticated
   * workspace and selected reporting period.
   */
  const feedback = await prisma.feedback.findMany({
    where: {
      workspaceId,

      createdAt: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      content: true,
      customerLabel: true,
      channel: true,
      sentiment: true,
      category: true,
      theme: true,
      urgency: true,
      priority: true,
      summary: true,
      createdAt: true,
    },
  });

  if (feedback.length === 0) {
    throw new Error(
      `No feedback available for the selected period (${formatDate(
        normalizedStart
      )} to ${formatDate(normalizedEnd)}).`
    );
  }

  /*
   * Fetch the previous comparable period only for
   * sentiment-shift calculation.
   */
  const previousFeedback = await prisma.feedback.findMany({
    where: {
      workspaceId,

      createdAt: {
        gte: previousPeriodStart,
        lte: previousPeriodEnd,
      },
    },

    select: {
      sentiment: true,
    },
  });

  const total = feedback.length;

  /*
   * A record is considered fully AI-classified only when
   * all required classification fields are present.
   */
  const classifiedFeedback = feedback.filter(
    (item) =>
      item.sentiment !== null &&
      item.category !== null &&
      item.theme !== null &&
      item.urgency !== null &&
      item.priority !== null
  );

  const classifiedCount = classifiedFeedback.length;

  const classificationCoverage =
    total > 0
      ? Math.round((classifiedCount / total) * 100)
      : 0;

  /*
   * Current-period structured statistics.
   */
  const sentimentCounts = calculateSentimentCounts(feedback);

  const priorityCounts = {
    high: feedback.filter(
      (item) => item.priority === "high"
    ).length,

    medium: feedback.filter(
      (item) => item.priority === "medium"
    ).length,

    low: feedback.filter(
      (item) => item.priority === "low"
    ).length,
  };

  const urgencyCounts = {
    high: feedback.filter(
      (item) => item.urgency === "high"
    ).length,

    medium: feedback.filter(
      (item) => item.urgency === "medium"
    ).length,

    low: feedback.filter(
      (item) => item.urgency === "low"
    ).length,
  };

  /*
   * Previous-period sentiment statistics.
   */
  const previousSentimentCounts =
    calculateSentimentCounts(previousFeedback);

  const currentSentimentPercentages =
    calculateSentimentPercentages(
      sentimentCounts,
      total
    );

  const previousSentimentPercentages =
    calculateSentimentPercentages(
      previousSentimentCounts,
      previousFeedback.length
    );

  /*
   * Sentiment shift is expressed in percentage points.
   *
   * Example:
   * Current negative = 30%
   * Previous negative = 20%
   *
   * Shift = +10 percentage points
   */
  const sentimentShift = calculateSentimentShift(
    currentSentimentPercentages,
    previousSentimentPercentages
  );

  /*
   * Theme intelligence for the selected period.
   */
  const themeCounts = new Map<string, number>();

  for (const item of feedback) {
    if (!item.theme) {
      continue;
    }

    const theme = item.theme.trim();

    if (!theme) {
      continue;
    }

    themeCounts.set(
      theme,
      (themeCounts.get(theme) ?? 0) + 1
    );
  }

  const topThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme, count]) => ({
      theme,
      count,
    }));

  /*
   * Real high-priority customer evidence from the
   * selected reporting period.
   */
  const highPriorityFeedback = feedback
    .filter((item) => item.priority === "high")
    .slice(0, 5)
    .map((item) => ({
      customer: item.customerLabel,
      content: item.content,
      sentiment: item.sentiment,
      theme: item.theme,
      priority: item.priority,
      urgency: item.urgency,
    }));

  /*
   * Provide the AI with the actual selected-period
   * feedback sample only.
   */
  const feedbackForAI = feedback
    .slice(0, 30)
    .map((item) => ({
      customer: item.customerLabel,
      content: item.content,
      channel: item.channel,
      sentiment: item.sentiment,
      category: item.category,
      theme: item.theme,
      urgency: item.urgency,
      priority: item.priority,
      createdAt: item.createdAt.toISOString(),
    }));

  /*
   * The AI receives both the current reporting-period
   * statistics and the previous-period sentiment
   * percentages so it can describe sentiment shifts.
   */
  const prompt = `
You are generating a Voice-of-Customer report for LOOP,
an AI-powered Customer Feedback Intelligence Platform.

REPORTING PERIOD:
${formatDate(normalizedStart)} to ${formatDate(normalizedEnd)}

PREVIOUS COMPARABLE PERIOD:
${formatDate(previousPeriodStart)} to ${formatDate(previousPeriodEnd)}

Use ONLY the customer feedback and statistics provided below.

Do not invent:
- customers
- feedback
- statistics
- themes
- quotes
- sentiment
- priority
- urgency
- business facts

Generate a concise, professional, business-focused Voice-of-Customer report containing:

1. Executive Summary
2. Key Customer Insights
3. Main Themes
4. Sentiment Shifts
5. Priority Issues
6. Recommended Actions

Important rules:

- Every insight must be grounded in the provided data.
- Mention the reporting period clearly.
- Mention important numbers when useful.
- Use the selected reporting period as the primary source of truth.
- Sentiment shifts must be described using the supplied current-period and previous-period percentages.
- Describe changes as percentage-point changes where appropriate.
- Do not claim statistical significance.
- Do not invent causes for sentiment changes.
- Do not infer sentiment, priority, or urgency from raw text when the structured field is missing.
- You may summarize raw customer comments as qualitative observations.
- Keep qualitative observations separate from structured classification statistics.
- Recommended actions must directly relate to observed feedback.
- Customer quotes must come only from the supplied feedback.
- Keep the report suitable for a business stakeholder.

STRUCTURED CLASSIFICATION RULE:

A feedback record is considered AI-classified only when ALL of these fields are present:

- sentiment
- category
- theme
- urgency
- priority

TOTAL FEEDBACK IN SELECTED PERIOD:
${total}

FULLY AI-CLASSIFIED FEEDBACK:
${classifiedCount}

CLASSIFICATION COVERAGE:
${classificationCoverage}%

CURRENT PERIOD SENTIMENT COUNTS:
Positive: ${sentimentCounts.positive}
Neutral: ${sentimentCounts.neutral}
Negative: ${sentimentCounts.negative}

CURRENT PERIOD SENTIMENT PERCENTAGES:
Positive: ${currentSentimentPercentages.positive}%
Neutral: ${currentSentimentPercentages.neutral}%
Negative: ${currentSentimentPercentages.negative}%

PREVIOUS PERIOD FEEDBACK COUNT:
${previousFeedback.length}

PREVIOUS PERIOD SENTIMENT PERCENTAGES:
Positive: ${previousSentimentPercentages.positive}%
Neutral: ${previousSentimentPercentages.neutral}%
Negative: ${previousSentimentPercentages.negative}%

SENTIMENT SHIFT IN PERCENTAGE POINTS:
Positive: ${sentimentShift.positive >= 0 ? "+" : ""}${sentimentShift.positive} pp
Neutral: ${sentimentShift.neutral >= 0 ? "+" : ""}${sentimentShift.neutral} pp
Negative: ${sentimentShift.negative >= 0 ? "+" : ""}${sentimentShift.negative} pp

CURRENT PERIOD PRIORITY COUNTS:
High: ${priorityCounts.high}
Medium: ${priorityCounts.medium}
Low: ${priorityCounts.low}

CURRENT PERIOD URGENCY COUNTS:
High: ${urgencyCounts.high}
Medium: ${urgencyCounts.medium}
Low: ${urgencyCounts.low}

TOP THEMES IN SELECTED PERIOD:
${JSON.stringify(topThemes, null, 2)}

HIGH-PRIORITY CUSTOMER FEEDBACK:
${JSON.stringify(highPriorityFeedback, null, 2)}

CUSTOMER FEEDBACK SAMPLE FROM SELECTED PERIOD:
${JSON.stringify(feedbackForAI, null, 2)}
`;

  /*
   * Gemini generates the narrative from the supplied
   * reporting-period data.
   */
  const narrative = await generateGeminiText(prompt);

  return {
    generatedAt: new Date().toISOString(),

    period: {
      start: normalizedStart.toISOString(),
      end: normalizedEnd.toISOString(),
      previousStart: previousPeriodStart.toISOString(),
      previousEnd: previousPeriodEnd.toISOString(),
    },

    statistics: {
      total,
      classifiedCount,
      classificationCoverage,

      sentiment: sentimentCounts,

      priority: priorityCounts,

      urgency: urgencyCounts,
    },

    sentimentAnalysis: {
      currentPercentages: currentSentimentPercentages,

      previousPercentages: previousSentimentPercentages,

      shiftPercentagePoints: sentimentShift,

      previousPeriodFeedbackCount:
        previousFeedback.length,
    },

    topThemes,

    highPriorityFeedback,

    narrative,
  };
}