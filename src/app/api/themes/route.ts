import { NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/authz";

export async function GET() {
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

    const themes = await prisma.theme.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        _count: {
          select: {
            feedbackThemes: true,
          },
        },
      },
    });

 const themeCounts = themes
  .map((theme) => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    color: theme.color,
    count: theme._count.feedbackThemes,
  }))
  .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      themes: themeCounts,
    });
  } catch (error) {
    console.error("Error fetching theme counts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch theme counts.",
      },
      { status: 500 }
    );
  }
}