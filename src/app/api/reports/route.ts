import { NextResponse } from "next/server";

import { requireUser } from "../../../lib/authz";
import { prisma } from "../../../lib/prisma";

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

    const reports = await prisma.report.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Reports fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reports.",
      },
      { status: 500 }
    );
  }
}