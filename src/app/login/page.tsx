"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Project LOOP
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            Welcome back
          </h1>

          <p className="mt-3 text-zinc-600">
            Sign in to your LOOP workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-white p-8 shadow-sm"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-zinc-900"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-zinc-900"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}