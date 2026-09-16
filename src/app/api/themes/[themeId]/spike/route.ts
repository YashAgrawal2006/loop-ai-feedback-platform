import { NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/authz";

type RouteContext = {
  params: Promise<{
    themeId: string;
  }>;
};

const PERIOD_DAYS = 7;

export async function GET(
  request: Request,
  context: RouteContext
) {
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

    const { themeId } = await context.params;

    if (!themeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Theme ID is required.",
        },
        { status: 400 }
      );
    }

    // Make sure the theme belongs to the current workspace.
    const theme = await prisma.theme.findFirst({
      where: {
        id: themeId,
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!theme) {
      return NextResponse.json(
        {
          success: false,
          error: "Theme not found.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const recentStart = new Date(now);
    recentStart.setDate(
      recentStart.getDate() - PERIOD_DAYS
    );

    const previousStart = new Date(recentStart);
    previousStart.setDate(
      previousStart.getDate() - PERIOD_DAYS
    );

    const recentCount =
      await prisma.feedbackTheme.count({
        where: {
          themeId: theme.id,
          feedback: {
            workspaceId: user.workspaceId,
            createdAt: {
              gte: recentStart,
              lt: now,
            },
          },
        },
      });

    const previousCount =
      await prisma.feedbackTheme.count({
        where: {
          themeId: theme.id,
          feedback: {
            workspaceId: user.workspaceId,
            createdAt: {
              gte: previousStart,
              lt: recentStart,
            },
          },
        },
      });

    let percentageChange: number | null = null;

    if (previousCount === 0) {
      if (recentCount > 0) {
        percentageChange = 100;
      } else {
        percentageChange = 0;
      }
    } else {
      percentageChange = Math.round(
        ((recentCount - previousCount) /
          previousCount) *
          100
      );
    }

    // A spike is detected when recent activity
    // increases by at least 100% compared with
    // the previous period.
    const isSpike =
      recentCount > 0 &&
      percentageChange !== null &&
      percentageChange >= 100;

    return NextResponse.json({
      success: true,
      theme,
      periodDays: PERIOD_DAYS,
      recentCount,
      previousCount,
      percentageChange,
      isSpike,
    });
  } catch (error) {
    console.error(
      "Error detecting theme spike:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to detect theme spike.",
      },
      { status: 500 }
    );
  }
}