"use client";

import { useEffect, useState } from "react";

type Feedback = {
  id: string;
  customerLabel: string;
  content: string;
  channel: string;
  sentiment: string | null;
  theme: string | null;
  priority: string | null;
  createdAt: string;
};

export default function Dashboard() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await fetch("/api/feedback");

        if (!response.ok) {
          throw new Error("Failed to fetch feedback");
        }

        const data = await response.json();

        setFeedback(data);
      } catch (error) {
        console.error("Error fetching feedback:", error);
        setError("Failed to load feedback.");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  const totalFeedback = feedback.length;

  const positiveFeedback = feedback.filter(
    (item) => item.sentiment === "Positive"
  ).length;

  const neutralFeedback = feedback.filter(
    (item) => item.sentiment === "Neutral"
  ).length;

  const negativeFeedback = feedback.filter(
    (item) => item.sentiment === "Negative"
  ).length;

  const highPriorityFeedback = feedback.filter(
    (item) => item.priority === "High"
  ).length;

  const filteredFeedback = feedback.filter((item) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      item.customerLabel.toLowerCase().includes(searchText) ||
      item.content.toLowerCase().includes(searchText);

    const matchesSentiment =
      sentimentFilter === "All" ||
      item.sentiment === sentimentFilter;

    const matchesPriority =
      priorityFilter === "All" ||
      item.priority === priorityFilter;

    const matchesSource =
      sourceFilter === "All" ||
      item.channel === sourceFilter;

    return (
      matchesSearch &&
      matchesSentiment &&
      matchesPriority &&
      matchesSource
    );
  });

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Project LOOP
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            Feedback Dashboard
          </h1>

          <p className="mt-3 text-zinc-600">
            Analyze customer feedback and monitor important insights.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              Total Feedback
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {totalFeedback}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              Positive
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {positiveFeedback}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              Neutral
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {neutralFeedback}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              Negative
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {negativeFeedback}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              High Priority
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {highPriorityFeedback}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-zinc-900">
              Recent Feedback
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Search and filter customer feedback.
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or feedback..."
              className="rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <select
              value={sentimentFilter}
              onChange={(event) => setSentimentFilter(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="All">All Sentiments</option>
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="All">All Sources</option>
              <option value="Website">Website</option>
              <option value="Email">Email</option>
              <option value="Survey">Survey</option>
              <option value="Social Media">Social Media</option>
              <option value="Support">Support</option>
            </select>
          </div>

          {loading && (
            <p className="py-6 text-center text-zinc-500">
              Loading feedback...
            </p>
          )}

          {error && (
            <p className="py-6 text-center text-red-600">
              {error}
            </p>
          )}

          {!loading && !error && filteredFeedback.length === 0 && (
            <p className="py-6 text-center text-zinc-500">
              No feedback matches your filters.
            </p>
          )}

          {!loading && !error && filteredFeedback.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="px-4 py-3 font-semibold text-zinc-700">
                      Customer
                    </th>

                    <th className="px-4 py-3 font-semibold text-zinc-700">
                      Feedback
                    </th>

                    <th className="px-4 py-3 font-semibold text-zinc-700">
                      Source
                    </th>

                    <th className="px-4 py-3 font-semibold text-zinc-700">
                      Sentiment
                    </th>

                    <th className="px-4 py-3 font-semibold text-zinc-700">
                      Priority
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFeedback.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100"
                    >
                      <td className="px-4 py-4 text-zinc-900">
                        {item.customerLabel}
                      </td>

                      <td className="max-w-md px-4 py-4 text-zinc-600">
                        {item.content}
                      </td>

                      <td className="px-4 py-4 text-zinc-600">
                        {item.channel}
                      </td>

                      <td className="px-4 py-4 text-zinc-600">
                        {item.sentiment || "Not analyzed"}
                      </td>

                      <td className="px-4 py-4 text-zinc-600">
                        {item.priority || "Not set"}
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