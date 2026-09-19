import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/authz";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  search: z.string().trim().optional(),
  channel: z.string().trim().optional(),
  sentiment: z.string().trim().optional(),
  theme: z.string().trim().optional(),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),

  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const parsedQuery = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      channel: searchParams.get("channel") ?? undefined,
      sentiment: searchParams.get("sentiment") ?? undefined,
      theme: searchParams.get("theme") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsedQuery.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      page,
      pageSize,
      search,
      channel,
      sentiment,
      theme,
      status,
      from,
      to,
    } = parsedQuery.data;

    const where = {
      workspaceId: user.workspaceId,

      ...(search
        ? {
            OR: [
              {
                customerLabel: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                content: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(channel
        ? {
            channel,
          }
        : {}),

      ...(sentiment
        ? {
            sentiment: sentiment.toLowerCase(),
          }
        : {}),

      ...(theme
        ? {
            theme,
          }
        : {}),

      ...(status
        ? {
            status,
          }
        : {}),

      ...(from || to
        ? {
            createdAt: {
              ...(from
                ? {
                    gte: new Date(`${from}T00:00:00.000Z`),
                  }
                : {}),

              ...(to
                ? {
                    lte: new Date(`${to}T23:59:59.999Z`),
                  }
                : {}),
            },
          }
        : {}),
    };

    const skip = (page - 1) * pageSize;

    const [feedback, total, themes] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
      }),

      prisma.feedback.count({
        where,
      }),

      prisma.feedback.findMany({
        where: {
          workspaceId: user.workspaceId,
          theme: {
            not: null,
          },
        },
        select: {
          theme: true,
        },
        distinct: ["theme"],
        orderBy: {
          theme: "asc",
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      availableThemes: themes
        .map((item) => item.theme)
        .filter((theme): theme is string => Boolean(theme)),
    });
  } catch (error) {
    console.error("Error fetching feedback inbox:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch feedback inbox",
      },
      { status: 500 }
    );
  }
}