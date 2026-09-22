"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [customer, setCustomer] = useState("");
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("Website");
  const [sentiment, setSentiment] = useState("");
  const [theme, setTheme] = useState("");
  const [priority, setPriority] = useState("");

  // Prevent multiple submissions at the same time.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent duplicate/concurrent requests.
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer,
          message,
          source,
          sentiment,
          theme,
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Feedback submission failed:", data);

        alert(
          data.error ||
            "Failed to submit feedback. Please try again."
        );

        return;
      }

      console.log("Feedback saved:", data);

      alert("Feedback submitted successfully!");

      // Clear the form after successful submission.
      setCustomer("");
      setMessage("");
      setSource("Website");
      setSentiment("");
      setTheme("");
      setPriority("");
    } catch (error) {
      console.error("Feedback submission error:", error);

      alert(
        "Something went wrong while submitting feedback. Please try again."
      );
    } finally {
      // Re-enable the button after the request finishes.
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Project LOOP
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            Customer Feedback
          </h1>

          <p className="mt-3 text-zinc-600">
            Collect customer feedback and prepare it for analysis.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-white p-8 shadow-sm"
        >
          <div>
            <label
              htmlFor="customer"
              className="mb-2 block text-sm font-medium text-zinc-900"
            >
              Customer Name
            </label>

            <input
              id="customer"
              type="text"
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              placeholder="Enter customer name"
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none transition focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="mb-2 block text-sm font-medium text-zinc-900"
            >
              Feedback
            </label>

            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Enter customer feedback"
              rows={5}
              className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-3 outline-none transition focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="source"
              className="mb-2 block text-sm font-medium text-zinc-900"
            >
              Source
            </label>

            <select
              id="source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="Website">Website</option>
              <option value="Email">Email</option>
              <option value="Survey">Survey</option>
              <option value="Social Media">Social Media</option>
              <option value="Support">Support</option>
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <label
                htmlFor="sentiment"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Sentiment
              </label>

              <select
                id="sentiment"
                value={sentiment}
                onChange={(event) => setSentiment(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Not analyzed</option>
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Negative">Negative</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="theme"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Theme
              </label>

              <input
                id="theme"
                type="text"
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                placeholder="e.g. Pricing"
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="priority"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Priority
              </label>

              <select
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Not set</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      </div>
    </main>
  );
}