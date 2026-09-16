import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/authz";

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
        description: true,
        color: true,
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

    // Get feedback linked to this theme.
    const feedbackThemes =
      await prisma.feedbackTheme.findMany({
        where: {
          themeId: theme.id,
          feedback: {
            workspaceId: user.workspaceId,
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
              sentimentScore: true,
              category: true,
              urgency: true,
              priority: true,
              summary: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          feedback: {
            createdAt: "desc",
          },
        },
      });

    const feedback = feedbackThemes.map(
      (feedbackTheme) => feedbackTheme.feedback
    );

    return NextResponse.json({
      success: true,
      theme,
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    console.error(
      "Error fetching theme drill-down:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch theme feedback.",
      },
      { status: 500 }
    );
  }
}