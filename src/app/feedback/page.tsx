"use client";

import { useEffect, useRef, useState } from "react";

type FeedbackStatus = "NEW" | "REVIEWED" | "ACTIONED";

type Feedback = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string;
  sentiment: string | null;
  sentimentScore: number | null;
  status: FeedbackStatus;
  theme: string | null;
  priority: string | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type InboxResponse = {
  feedback: Feedback[];
  pagination: Pagination;
  availableThemes: string[];
};

type CsvResult = {
  imported: number;
  failed: number;
  failures: Array<{
    row: number;
    error: string;
  }>;
};

export default function FeedbackInbox() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [themes, setThemes] = useState<string[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("All");
  const [sentiment, setSentiment] = useState("All");
  const [theme, setTheme] = useState("All");
  const [status, setStatus] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvResult | null>(
    null
  );

  const [simulating, setSimulating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInbox = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("pageSize", "10");

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (channel !== "All") {
        params.set("channel", channel);
      }

      if (sentiment !== "All") {
        params.set("sentiment", sentiment);
      }

      if (theme !== "All") {
        params.set("theme", theme);
      }

      if (status !== "All") {
        params.set("status", status);
      }

      if (dateFrom) {
        params.set("from", dateFrom);
      }

      if (dateTo) {
        params.set("to", dateTo);
      }

      const response = await fetch(
        `/api/feedback/inbox?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load feedback inbox.");
      }

      const data: InboxResponse = await response.json();

      setFeedback(data.feedback);
      setPagination(data.pagination);
      setThemes(data.availableThemes);
    } catch (error) {
      console.error("Error fetching feedback inbox:", error);
      setError("Failed to load feedback inbox.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox(1);
  }, [
    search,
    channel,
    sentiment,
    theme,
    status,
    dateFrom,
    dateTo,
  ]);

  const handleCSVUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setCsvUploading(true);
      setError("");
      setCsvResult(null);
      setSimulationMessage("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/feedback/csv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to import CSV."
        );
      }

      setCsvResult({
        imported: data.imported,
        failed: data.failed,
        failures: data.failures || [],
      });

      await fetchInbox(1);
    } catch (error) {
      console.error("CSV upload error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to import CSV."
      );
    } finally {
      setCsvUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSimulateFeedback = async () => {
    try {
      setSimulating(true);
      setError("");
      setCsvResult(null);
      setSimulationMessage("");

      const response = await fetch("/api/feedback/simulate", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to simulate feedback."
        );
      }

      setSimulationMessage(
        "Simulated feedback created successfully."
      );

      await fetchInbox(1);
    } catch (error) {
      console.error(
        "Simulation error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to simulate feedback."
      );
    } finally {
      setSimulating(false);
    }
  };

  const updateStatus = async (
    feedbackId: string,
    newStatus: FeedbackStatus
  ) => {
    try {
      const response = await fetch("/api/feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: feedbackId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.error || "Failed to update feedback status."
        );
      }

      setFeedback((currentFeedback) =>
        currentFeedback.map((item) =>
          item.id === feedbackId
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating feedback status:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update feedback status."
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setChannel("All");
    setSentiment("All");
    setTheme("All");
    setStatus("All");
    setDateFrom("");
    setDateTo("");
  };

  const getStatusClass = (value: FeedbackStatus) => {
    if (value === "NEW") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (value === "REVIEWED") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-green-50 text-green-700 border-green-200";
  };

  const getSentimentClass = (value: string | null) => {
    if (value === "Positive") {
      return "text-green-700";
    }

    if (value === "Negative") {
      return "text-red-700";
    }

    if (value === "Neutral") {
      return "text-zinc-600";
    }

    return "text-zinc-400";
  };

  const getPriorityClass = (value: string | null) => {
    if (value === "High") {
      return "text-red-700 font-semibold";
    }

    if (value === "Medium") {
      return "text-amber-700 font-medium";
    }

    if (value === "Low") {
      return "text-green-700";
    }

    return "text-zinc-400";
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Project LOOP
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
                Feedback Inbox
              </h1>

              <p className="mt-3 text-zinc-600">
                Review, filter, and prioritize customer feedback.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm">
                <span className="text-zinc-500">
                  Total feedback:{" "}
                </span>

                <span className="font-semibold text-zinc-900">
                  {pagination.total}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCSVUpload}
                className="hidden"
              />

              <button
                type="button"
                disabled={csvUploading || simulating}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {csvUploading
                  ? "Importing..."
                  : "Import CSV"}
              </button>

              <button
                type="button"
                disabled={csvUploading || simulating}
                onClick={handleSimulateFeedback}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {simulating
                  ? "Simulating..."
                  : "Simulate Feedback"}
              </button>
            </div>
          </div>
        </div>

        {/* CSV Result */}
        {csvResult && (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-zinc-900">
                  CSV import complete
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {csvResult.imported} imported ·{" "}
                  {csvResult.failed} failed
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCsvResult(null)}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
              >
                Dismiss
              </button>
            </div>

            {csvResult.failures.length > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  Failed rows
                </p>

                <ul className="mt-2 space-y-1 text-sm text-red-600">
                  {csvResult.failures.map((failure) => (
                    <li key={failure.row}>
                      Row {failure.row}: {failure.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Simulation Result */}
        {simulationMessage && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-green-800">
                  Channel simulation complete
                </h2>

                <p className="mt-1 text-sm text-green-700">
                  {simulationMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSimulationMessage("")}
                className="text-sm font-medium text-green-700 hover:text-green-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                Filters
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Find specific customer feedback quickly.
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Clear filters
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer or feedback..."
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Channel
              </label>

              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Channels</option>
                <option value="Website">Website</option>
                <option value="Email">Email</option>
                <option value="Survey">Survey</option>
                <option value="Social Media">
                  Social Media
                </option>
                <option value="Support">Support</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Sentiment
              </label>

              <select
                value={sentiment}
                onChange={(event) =>
                  setSentiment(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Sentiments</option>
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Negative">Negative</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Theme
              </label>

              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Themes</option>

                {themes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Statuses</option>
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="ACTIONED">Actioned</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                From
              </label>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                To
              </label>

              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-6 py-5">
            <h2 className="text-lg font-bold text-zinc-900">
              Customer Feedback
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Showing page {pagination.page} of{" "}
              {pagination.totalPages}
            </p>
          </div>

          {loading && (
            <div className="px-6 py-16 text-center">
              <p className="text-zinc-500">
                Loading feedback...
              </p>
            </div>
          )}

          {!loading && feedback.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-medium text-zinc-700">
                No feedback found
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Try changing your search or filters.
              </p>
            </div>
          )}

          {!loading && feedback.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-zinc-50">
                    <tr className="border-b border-zinc-200">
                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Customer
                      </th>

                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Feedback
                      </th>

                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Channel
                      </th>

                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Sentiment
                      </th>

                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Theme
                      </th>

                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Priority
                      </th>

                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Status
                      </th>

                      <th className="px-6 py-4 font-semibold text-zinc-700">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {feedback.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-zinc-100 transition hover:bg-zinc-50"
                      >
                        <td className="px-6 py-5 font-medium text-zinc-900">
                          {item.customerLabel}
                        </td>

                        <td className="max-w-md px-6 py-5 text-zinc-600">
                          <div className="line-clamp-2">
                            {item.content}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-zinc-600">
                          {item.channel}
                        </td>

                        <td
                          className={`px-6 py-5 font-medium ${getSentimentClass(
                            item.sentiment
                          )}`}
                        >
                          {item.sentiment || "Not analyzed"}
                        </td>

                        <td className="px-6 py-5 text-zinc-600">
                          {item.theme || "Not classified"}
                        </td>

                        <td
                          className={`px-6 py-5 ${getPriorityClass(
                            item.priority
                          )}`}
                        >
                          {item.priority || "Not set"}
                        </td>

                        <td className="px-6 py-5">
                          <select
                            value={item.status}
                            onChange={(event) =>
                              updateStatus(
                                item.id,
                                event.target.value as FeedbackStatus
                              )
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none ${getStatusClass(
                              item.status
                            )}`}
                          >
                            <option value="NEW">New</option>
                            <option value="REVIEWED">
                              Reviewed
                            </option>
                            <option value="ACTIONED">
                              Actioned
                            </option>
                          </select>
                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-zinc-500">
                          {new Date(
                            item.createdAt
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-4 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                  Page {pagination.page} of{" "}
                  {pagination.totalPages} · {pagination.total}{" "}
                  total records
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() =>
                      fetchInbox(pagination.page - 1)
                    }
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      pagination.page >=
                        pagination.totalPages || loading
                    }
                    onClick={() =>
                      fetchInbox(pagination.page + 1)
                    }
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}