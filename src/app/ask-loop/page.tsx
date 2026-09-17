"use client";

import { FormEvent, useState } from "react";

type Source = {
  sourceNumber: number;
  feedbackId: string;
  customerLabel: string;
  content: string;
  channel: string;
  sentiment: string | null;
  category: string | null;
  theme: string | null;
  priority: string | null;
  similarity: number;
  createdAt: string;
};

type AskLoopResponse = {
  success: boolean;
  question?: string;
  answer?: string;
  sources?: Source[];
  error?: string;
};

export default function AskLoopPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const response = await fetch(
        "/api/ai/ask-loop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
          }),
        }
      );

      const data: AskLoopResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Ask LOOP request failed."
        );
      }

      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
    } catch (err) {
      console.error("Ask LOOP UI error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Project LOOP
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-900">
            Ask LOOP
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Ask questions about customer feedback and
            get AI-powered answers grounded in real
            feedback from your workspace.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <label
              htmlFor="question"
              className="block text-sm font-semibold text-slate-800"
            >
              Your question
            </label>

            <textarea
              id="question"
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Example: Why are customers having problems with checkout and payments?"
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                LOOP uses semantic search to find relevant
                customer feedback before generating an answer.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Ask LOOP"}
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />

              <p className="text-sm text-slate-600">
                Searching customer feedback and generating
                a grounded answer...
              </p>
            </div>
          </div>
        )}

        {answer && !loading && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                LOOP Answer
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                AI-powered feedback insight
              </h2>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <p className="whitespace-pre-wrap leading-7 text-slate-700">
                {answer}
              </p>
            </div>
          </section>
        )}

        {sources.length > 0 && !loading && (
          <section className="mt-6">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Evidence
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Sources from customer feedback
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                These are the real feedback records used to
                ground the answer.
              </p>
            </div>

            <div className="space-y-4">
              {sources.map((source) => (
                <article
                  key={source.feedbackId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Source {source.sourceNumber}
                      </span>

                      <h3 className="mt-3 text-lg font-bold text-slate-900">
                        {source.customerLabel}
                      </h3>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Semantic similarity
                      </p>

                      <p className="text-lg font-bold text-slate-900">
                        {(
                          source.similarity * 100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 leading-7 text-slate-700">
                    {source.content}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {source.channel}
                    </span>

                    {source.sentiment && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {source.sentiment}
                      </span>
                    )}

                    {source.category && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {source.category}
                      </span>
                    )}

                    {source.theme && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {source.theme}
                      </span>
                    )}

                    {source.priority && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Priority: {source.priority}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}