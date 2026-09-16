import { prisma } from "../prisma";

type LinkFeedbackThemeInput = {
  feedbackId: string;
  workspaceId: string;
  themeName: string;
};

function normalizeThemeName(themeName: string) {
  return themeName.trim().replace(/\s+/g, " ").slice(0, 100);
}

export async function linkFeedbackToTheme({
  feedbackId,
  workspaceId,
  themeName,
}: LinkFeedbackThemeInput) {
  const normalizedThemeName = normalizeThemeName(themeName);

  if (!normalizedThemeName) {
    throw new Error("Theme name cannot be empty.");
  }

  return prisma.$transaction(async (tx) => {
    // Make sure the feedback belongs to the current workspace.
    const feedback = await tx.feedback.findFirst({
      where: {
        id: feedbackId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!feedback) {
      throw new Error("Feedback not found in the current workspace.");
    }

    // Reuse an existing theme in this workspace if possible.
    let theme = await tx.theme.findFirst({
      where: {
        workspaceId,
        name: {
          equals: normalizedThemeName,
          mode: "insensitive",
        },
      },
    });

    // Otherwise create a new workspace-owned theme.
    if (!theme) {
      theme = await tx.theme.create({
        data: {
          name: normalizedThemeName,
          workspaceId,
        },
      });
    }

    // Create the Feedback <-> Theme relationship.
    const feedbackTheme = await tx.feedbackTheme.upsert({
      where: {
        feedbackId_themeId: {
          feedbackId,
          themeId: theme.id,
        },
      },
      update: {},
      create: {
        feedbackId,
        themeId: theme.id,
      },
    });

    return {
      theme,
      feedbackTheme,
    };
  });
}