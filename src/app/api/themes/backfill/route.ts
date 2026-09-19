import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { hasRole, requireUser } from "../../../../lib/authz";

function normalizeThemeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function themeKey(value: string) {
  return normalizeThemeName(value).toLowerCase();
}

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

    // 1. Get all feedback that already has an AI-generated theme.
    const feedback = await prisma.feedback.findMany({
      where: {
        workspaceId: user.workspaceId,
        theme: {
          not: null,
        },
      },
      select: {
        id: true,
        theme: true,
      },
    });

    const validFeedback = feedback.filter(
      (item): item is { id: string; theme: string } =>
        typeof item.theme === "string" && item.theme.trim().length > 0
    );

    // 2. Get existing themes for this workspace.
    const existingThemes = await prisma.theme.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const themeMap = new Map<string, string>();

    for (const theme of existingThemes) {
      const key = themeKey(theme.name);

      if (!themeMap.has(key)) {
        themeMap.set(key, theme.id);
      }
    }

    // 3. Create missing Theme records.
    let themesCreated = 0;

    const uniqueThemeNames = Array.from(
      new Map(
        validFeedback.map((item) => {
          const name = normalizeThemeName(item.theme);

          return [themeKey(name), name];
        })
      ).values()
    );

    for (const name of uniqueThemeNames) {
      const key = themeKey(name);

      if (themeMap.has(key)) {
        continue;
      }

      const createdTheme = await prisma.theme.create({
        data: {
          name,
          workspaceId: user.workspaceId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      themeMap.set(key, createdTheme.id);
      themesCreated++;
    }

    // 4. Get existing feedback-theme links.
    const existingLinks = await prisma.feedbackTheme.findMany({
      where: {
        feedback: {
          workspaceId: user.workspaceId,
        },
      },
      select: {
        feedbackId: true,
        themeId: true,
      },
    });

    const existingLinkKeys = new Set(
      existingLinks.map(
        (link) => `${link.feedbackId}:${link.themeId}`
      )
    );

    // 5. Build only missing links.
    const missingLinks: Array<{
      feedbackId: string;
      themeId: string;
    }> = [];

    for (const item of validFeedback) {
      const themeId = themeMap.get(themeKey(item.theme));

      if (!themeId) {
        continue;
      }

      const key = `${item.id}:${themeId}`;

      if (!existingLinkKeys.has(key)) {
        missingLinks.push({
          feedbackId: item.id,
          themeId,
        });
      }
    }

    // 6. Insert missing links in one bulk operation.
    let linksCreated = 0;

    if (missingLinks.length > 0) {
      const result = await prisma.feedbackTheme.createMany({
        data: missingLinks,
      });

      linksCreated = result.count;
    }

    return NextResponse.json({
      success: true,
      message: "Theme backfill completed successfully.",
      results: {
        feedbackWithThemes: validFeedback.length,
        themesCreated,
        linksCreated,
        existingLinks: existingLinks.length,
        uniqueThemes: themeMap.size,
      },
    });
  } catch (error) {
    console.error("THEME BACKFILL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to backfill themes.",
      },
      { status: 500 }
    );
  }
}