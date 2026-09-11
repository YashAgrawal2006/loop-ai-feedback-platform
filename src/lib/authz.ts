import { auth } from "../../auth";

export type AppRole = "ADMIN" | "ANALYST" | "VIEWER";

export async function getCurrentUser() {
  const session = await auth();

  if (
    !session?.user?.id ||
    !session.user.workspaceId ||
    !session.user.role
  ) {
    return null;
  }

  return {
    id: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role as AppRole,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return user;
}

export function hasRole(
  role: AppRole,
  allowedRoles: AppRole[]
) {
  return allowedRoles.includes(role);
}