import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),

  workspaceName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name is too long"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid signup data",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, password, workspaceName } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const resultTransaction = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
          workspaceId: workspace.id,
        },
      });

      return {
        workspace,
        user,
      };
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: resultTransaction.user.id,
          name: resultTransaction.user.name,
          email: resultTransaction.user.email,
          role: resultTransaction.user.role,
          workspaceId: resultTransaction.user.workspaceId,
        },
        workspace: {
          id: resultTransaction.workspace.id,
          name: resultTransaction.workspace.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);

    return NextResponse.json(
      {
        error: "Failed to create account",
      },
      { status: 500 }
    );
  }
}