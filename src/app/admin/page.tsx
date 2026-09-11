"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
  createdAt: string;
};

const roles: Member["role"][] = ["ADMIN", "ANALYST", "VIEWER"];

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMembers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/users");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load members");
      }

      setMembers(data);
    } catch (error) {
      console.error("Failed to load members:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load members"
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, role: Member["role"]) {
    try {
      setError("");

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === userId
            ? {
                ...member,
                role: data.role,
              }
            : member
        )
      );
    } catch (error) {
      console.error("Failed to update role:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update role"
      );
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            Workspace Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Members
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Manage members and their roles in this workspace.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Member
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Role
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {member.name || "Unnamed user"}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {member.email}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <select
                          value={member.role}
                          onChange={(event) =>
                            updateRole(
                              member.id,
                              event.target.value as Member["role"]
                            )
                          }
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}