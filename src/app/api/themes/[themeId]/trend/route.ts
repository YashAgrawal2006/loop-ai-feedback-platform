import { NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/authz";

type RouteContext = {
  params: Promise<{
    themeId: string;
  }>;
};

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

    // Get all feedback linked to this theme.
    const feedbackThemes =
      await prisma.feedbackTheme.findMany({
        where: {
          themeId: theme.id,
          feedback: {
            workspaceId: user.workspaceId,
          },
        },
        select: {
          feedback: {
            select: {
              createdAt: true,
            },
          },
        },
        orderBy: {
          feedback: {
            createdAt: "asc",
          },
        },
      });

    // Group feedback counts by calendar date.
    const countsByDate = new Map<string, number>();

    for (const item of feedbackThemes) {
      const date = item.feedback.createdAt
        .toISOString()
        .slice(0, 10);

      countsByDate.set(
        date,
        (countsByDate.get(date) ?? 0) + 1
      );
    }

    const trend = Array.from(countsByDate.entries()).map(
      ([date, count]) => ({
        date,
        count,
      })
    );

    return NextResponse.json({
      success: true,
      theme,
      trend,
    });
  } catch (error) {
    console.error(
      "Error fetching theme trend:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch theme trend.",
      },
      { status: 500 }
    );
  }
}