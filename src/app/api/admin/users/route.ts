import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { hasRole, requireUser } from "../../../../lib/authz";

const updateRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

export async function GET() {
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

    if (!hasRole(user.role, ["ADMIN"])) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const members = await prisma.user.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching workspace members:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch workspace members",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    if (!hasRole(user.role, ["ADMIN"])) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { userId, role } = result.data;

    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        workspaceId: user.workspaceId,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Prevent the last ADMIN from removing their own workspace's
    // final administrative role.
    if (targetUser.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: {
          workspaceId: user.workspaceId,
          role: "ADMIN",
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              "The workspace must have at least one ADMIN. Create another ADMIN before changing this role.",
          },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        workspaceId: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating member role:", error);

    return NextResponse.json(
      {
        error: "Failed to update member role",
      },
      { status: 500 }
    );
  }
}