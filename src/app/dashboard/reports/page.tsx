"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ReportStatistics = {
  total: number;
  classifiedCount: number;
  classificationCoverage: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  priority: {
    high: number;
    medium: number;
    low: number;
  };
  urgency: {
    high: number;
    medium: number;
    low: number;
  };
};

type HighPriorityFeedback = {
  customer: string;
  content: string;
  sentiment: string | null;
  theme: string | null;
  priority: string | null;
  urgency: string | null;
};

type SentimentAnalysis = {
  currentPercentages: {
    positive: number;
    neutral: number;
    negative: number;
  };
  previousPercentages: {
    positive: number;
    neutral: number;
    negative: number;
  };
  shiftPercentagePoints: {
    positive: number;
    neutral: number;
    negative: number;
  };
  previousPeriodFeedbackCount: number;
};

type VoiceOfCustomerReport = {
  generatedAt: string;

  period?: {
    start: string;
    end: string;
    previousStart?: string;
    previousEnd?: string;
  };

  statistics: ReportStatistics;

  sentimentAnalysis?: SentimentAnalysis;

  topThemes: {
    theme: string;
    count: number;
  }[];

  highPriorityFeedback: HighPriorityFeedback[];

  narrative: string;
};

type SavedReport = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  contentJson?: string | null;
};

type ReportsResponse = {
  success: boolean;
  reports?: SavedReport[];
  error?: string;
};

type GenerateReportResponse = {
  success: boolean;
  report?: VoiceOfCustomerReport;
  savedReport?: {
    id: string;
    title: string;
    periodStart: string;
    periodEnd: string;
    generatedById: string;
    createdAt: string;
  };
  error?: string;
};

type Preset = "7D" | "30D" | "MONTH" | "CUSTOM";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetDates(preset: Exclude<Preset, "CUSTOM">) {
  const today = new Date();

  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);

  if (preset === "7D") {
    start.setDate(start.getDate() - 6);
  }

  if (preset === "30D") {
    start.setDate(start.getDate() - 29);
  }

  if (preset === "MONTH") {
    start.setDate(1);
  }

  start.setHours(0, 0, 0, 0);

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

function formatReportDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateInput(value: string) {
  if (!value) return "—";

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getInitialPeriod() {
  return getPresetDates("7D");
}

export default function ReportsPage() {
  const initialPeriod = useMemo(() => getInitialPeriod(), []);

  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<VoiceOfCustomerReport | null>(null);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");

  const [periodPreset, setPeriodPreset] =
    useState<Preset>("7D");

  const [periodStart, setPeriodStart] =
    useState(initialPeriod.start);

  const [periodEnd, setPeriodEnd] =
    useState(initialPeriod.end);

  const [generationMessage, setGenerationMessage] =
    useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch("/api/reports", {
          cache: "no-store",
        });

        const data: ReportsResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to load reports."
          );
        }

        const savedReports = data.reports ?? [];

        setReports(savedReports);

        if (savedReports.length > 0) {
          try {
            const latestReport = savedReports[0];

            const reportContent =
              latestReport.contentJson ||
              latestReport.content;

            const parsedReport: VoiceOfCustomerReport =
              JSON.parse(reportContent);

            setSelectedReport(parsedReport);

            if (parsedReport.period?.start) {
              setPeriodStart(
                toDateInputValue(
                  new Date(parsedReport.period.start)
                )
              );
            }

            if (parsedReport.period?.end) {
              setPeriodEnd(
                toDateInputValue(
                  new Date(parsedReport.period.end)
                )
              );

              setPeriodPreset("CUSTOM");
            }
          } catch {
            throw new Error(
              "Saved report data could not be read."
            );
          }
        }
      } catch (err) {
        console.error("Reports page error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load reports."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  function handlePresetChange(nextPreset: Preset) {
    setPeriodPreset(nextPreset);

    if (nextPreset === "CUSTOM") {
      return;
    }

    const dates = getPresetDates(nextPreset);

    setPeriodStart(dates.start);
    setPeriodEnd(dates.end);
  }

  async function handleGenerateReport() {
    setError("");
    setGenerationMessage("");

    if (!periodStart || !periodEnd) {
      setError(
        "Please select both a start date and an end date."
      );

      return;
    }

    if (periodStart > periodEnd) {
      setError(
        "The report start date cannot be after the end date."
      );

      return;
    }

    try {
      setGenerating(true);

      setGenerationMessage(
        "Analyzing feedback for the selected reporting period..."
      );

      const response = await fetch(
        "/api/reports/voice-of-customer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            periodStart,
            periodEnd,
          }),
        }
      );

      const data: GenerateReportResponse =
        await response.json();

      if (!response.ok || !data.success || !data.report) {
        throw new Error(
          data.error ||
            "Failed to generate Voice-of-Customer report."
        );
      }

      setSelectedReport(data.report);

      if (data.savedReport) {
        const newSavedReport: SavedReport = {
          id: data.savedReport.id,
          title: data.savedReport.title,
          content: JSON.stringify(data.report),
          contentJson: JSON.stringify(data.report),
          createdAt: data.savedReport.createdAt,
          updatedAt: data.savedReport.createdAt,
          periodStart: data.savedReport.periodStart,
          periodEnd: data.savedReport.periodEnd,
        };

        setReports((current) => [
          newSavedReport,
          ...current,
        ]);
      }

      setGenerationMessage(
        "Voice-of-Customer report generated successfully."
      );
    } catch (err) {
      console.error(
        "Voice-of-Customer generation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate report."
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleExportPdf() {
    const originalTitle = document.title;

    document.title =
      "Project LOOP - Voice of Customer Report";

    window.print();

    window.setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  const reportPeriod = selectedReport?.period;

  const reportPeriodLabel = reportPeriod
    ? `${formatReportDate(
        reportPeriod.start
      )} — ${formatReportDate(reportPeriod.end)}`
    : `${formatDateInput(
        periodStart
      )} — ${formatDateInput(periodEnd)}`;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 print:bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
            <p className="text-sm text-slate-600">
              Loading Voice-of-Customer reports...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          * {
            box-shadow: none !important;
          }

          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-allow-break {
            break-inside: auto;
            page-break-inside: auto;
          }

          .print-heading {
            break-after: avoid;
            page-break-after: avoid;
          }

          .print-no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-new-page {
            break-before: page;
            page-break-before: always;
          }

          .report-narrative h1,
          .report-narrative h2,
          .report-narrative h3 {
            break-after: avoid;
            page-break-after: avoid;
          }

          .report-narrative ul,
          .report-narrative ol,
          .report-narrative blockquote {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .report-narrative p {
            orphans: 3;
            widows: 3;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-50 px-6 py-10 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-6xl">

          {/* ========================================================= */}
          {/* REPORT HEADER */}
          {/* ========================================================= */}

          <header className="mb-8 print-section print:mb-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white print:bg-slate-900">
                    L
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                      Project LOOP
                    </p>

                    <p className="text-xs text-slate-500">
                      Customer Feedback Intelligence
                    </p>
                  </div>
                </div>

                <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 print:mt-5 print:text-3xl">
                  Voice of Customer
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 print:max-w-none">
                  AI-generated customer feedback intelligence based on real
                  feedback from your workspace.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center print:hidden">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Generated
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedReport
                      ? new Date(
                          selectedReport.generatedAt
                        ).toLocaleString()
                      : "Not generated"}
                  </p>
                </div>

                {selectedReport && (
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  >
                    Export PDF
                  </button>
                )}
              </div>

              {selectedReport && (
                <div className="hidden print:block">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Generated
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {new Date(
                      selectedReport.generatedAt
                    ).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 h-px bg-slate-200 print:mt-5" />
          </header>

          {/* ========================================================= */}
          {/* REPORT PERIOD CONTROL */}
          {/* ========================================================= */}

          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Report Configuration
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Reporting Period
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Choose the period that LOOP should analyze. The generated
                  report uses only feedback from the selected period.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Selected Period
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatDateInput(periodStart)} —{" "}
                  {formatDateInput(periodEnd)}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr_auto]">
              <div>
                <label
                  htmlFor="report-period-start"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  From
                </label>

                <input
                  id="report-period-start"
                  type="date"
                  value={periodStart}
                  onChange={(event) => {
                    setPeriodStart(event.target.value);
                    setPeriodPreset("CUSTOM");
                    setGenerationMessage("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="report-period-end"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  To
                </label>

                <input
                  id="report-period-end"
                  type="date"
                  value={periodEnd}
                  onChange={(event) => {
                    setPeriodEnd(event.target.value);
                    setPeriodPreset("CUSTOM");
                    setGenerationMessage("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={generating}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 lg:min-w-[190px]"
              >
                {generating
                  ? "Generating..."
                  : "Generate Report"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["7D", "Last 7 Days"],
                ["30D", "Last 30 Days"],
                ["MONTH", "This Month"],
                ["CUSTOM", "Custom"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    handlePresetChange(
                      value as Preset
                    )
                  }
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    periodPreset === value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {generationMessage && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {generationMessage}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>

          {/* ========================================================= */}
          {/* EMPTY STATE */}
          {/* ========================================================= */}

          {!selectedReport && (
            <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <span className="text-2xl">📊</span>
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                No Voice-of-Customer report yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Select a reporting period above and generate your first
                Voice-of-Customer report.
              </p>
            </section>
          )}

          {selectedReport && (
            <>
              {/* ========================================================= */}
              {/* REPORT PERIOD */}
              {/* ========================================================= */}

              <section className="mb-7 rounded-2xl border border-blue-100 bg-blue-50 p-5 print-section print:bg-white print:p-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                      Reporting Period
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {reportPeriodLabel}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3 print:border print:border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Dataset Scope
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedReport.statistics.total} feedback records
                    </p>
                  </div>
                </div>
              </section>

              {/* ========================================================= */}
              {/* EXECUTIVE METRICS */}
              {/* ========================================================= */}

              <section className="print-section">
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    Executive Overview
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Feedback at a Glance
                  </h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 print:grid-cols-5">
                  <StatCard
                    label="Total Feedback"
                    value={selectedReport.statistics.total}
                  />

                  <StatCard
                    label="Positive"
                    value={
                      selectedReport.statistics.sentiment
                        .positive
                    }
                  />

                  <StatCard
                    label="Negative"
                    value={
                      selectedReport.statistics.sentiment
                        .negative
                    }
                  />

                  <StatCard
                    label="High Priority"
                    value={
                      selectedReport.statistics.priority.high
                    }
                  />

                  <StatCard
                    label="AI Classified"
                    value={
                      selectedReport.statistics
                        .classifiedCount
                    }
                    secondary={`${selectedReport.statistics.classificationCoverage}% coverage`}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900 print:bg-white print:text-slate-700">
                  Structured sentiment, priority, and urgency metrics are based
                  on AI-classified feedback. Qualitative observations may include
                  the wider feedback dataset.
                </div>
              </section>

              {/* ========================================================= */}
              {/* AI EXECUTIVE ANALYSIS */}
              {/* ========================================================= */}

              <section className="mt-7 print-allow-break">
                <div className="mb-4 print-heading">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    AI Analysis
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Executive Summary & Insights
                  </h2>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-7 print:border-slate-200 print:p-6">
                  <MarkdownReport
                    text={selectedReport.narrative}
                  />
                </div>
              </section>

              {/* ========================================================= */}
              {/* STRUCTURED METRICS */}
              {/* ========================================================= */}

              <section className="mt-7 print-section">
                <div className="mb-4 print-heading">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    Structured Intelligence
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Classification Breakdown
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
                  <MetricCard
                    title="Sentiment"
                    rows={[
                      [
                        "Positive",
                        selectedReport.statistics.sentiment
                          .positive,
                      ],
                      [
                        "Neutral",
                        selectedReport.statistics.sentiment
                          .neutral,
                      ],
                      [
                        "Negative",
                        selectedReport.statistics.sentiment
                          .negative,
                      ],
                    ]}
                  />

                  <MetricCard
                    title="Priority"
                    rows={[
                      [
                        "High",
                        selectedReport.statistics.priority
                          .high,
                      ],
                      [
                        "Medium",
                        selectedReport.statistics.priority
                          .medium,
                      ],
                      [
                        "Low",
                        selectedReport.statistics.priority
                          .low,
                      ],
                    ]}
                  />

                  <MetricCard
                    title="Urgency"
                    rows={[
                      [
                        "High",
                        selectedReport.statistics.urgency
                          .high,
                      ],
                      [
                        "Medium",
                        selectedReport.statistics.urgency
                          .medium,
                      ],
                      [
                        "Low",
                        selectedReport.statistics.urgency
                          .low,
                      ],
                    ]}
                  />
                </div>
              </section>

              {/* ========================================================= */}
              {/* SENTIMENT SHIFT */}
              {/* ========================================================= */}

              {selectedReport.sentimentAnalysis && (
                <section className="mt-7 print-section">
                  <div className="mb-4 print-heading">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                      Sentiment Intelligence
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      Sentiment Shift
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Comparison with the previous comparable reporting period.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
                    <SentimentShiftCard
                      label="Positive"
                      current={
                        selectedReport.sentimentAnalysis
                          .currentPercentages
                          .positive
                      }
                      previous={
                        selectedReport.sentimentAnalysis
                          .previousPercentages
                          .positive
                      }
                      shift={
                        selectedReport.sentimentAnalysis
                          .shiftPercentagePoints
                          .positive
                      }
                    />

                    <SentimentShiftCard
                      label="Neutral"
                      current={
                        selectedReport.sentimentAnalysis
                          .currentPercentages
                          .neutral
                      }
                      previous={
                        selectedReport.sentimentAnalysis
                          .previousPercentages
                          .neutral
                      }
                      shift={
                        selectedReport.sentimentAnalysis
                          .shiftPercentagePoints
                          .neutral
                      }
                    />

                    <SentimentShiftCard
                      label="Negative"
                      current={
                        selectedReport.sentimentAnalysis
                          .currentPercentages
                          .negative
                      }
                      previous={
                        selectedReport.sentimentAnalysis
                          .previousPercentages
                          .negative
                      }
                      shift={
                        selectedReport.sentimentAnalysis
                          .shiftPercentagePoints
                          .negative
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 print:bg-white">
                    Previous-period comparison uses the same-length period
                    immediately preceding the selected reporting period.
                    Changes are expressed in percentage points.
                  </div>
                </section>
              )}

              {/* ========================================================= */}
              {/* THEMES */}
              {/* ========================================================= */}

              <section className="mt-7 print-section">
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    Theme Intelligence
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Main Customer Themes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Most frequently identified themes within the selected
                    reporting period.
                  </p>
                </div>

                {selectedReport.topThemes.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
                    {selectedReport.topThemes.map(
                      (item, index) => (
                        <div
                          key={item.theme}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 print:bg-white"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                              {index + 1}
                            </span>

                            <span className="truncate text-sm font-semibold text-slate-800">
                              {item.theme}
                            </span>
                          </div>

                          <span className="ml-3 shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            {item.count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyInlineState text="No themes were identified for this reporting period." />
                )}
              </section>

              {/* ========================================================= */}
              {/* CUSTOMER EVIDENCE */}
              {/* ========================================================= */}

              <section className="mt-7 print-allow-break">
                <div className="mb-4 print-heading">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    Customer Evidence
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    High-Priority Feedback
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Representative feedback records requiring attention.
                  </p>
                </div>

                {selectedReport.highPriorityFeedback.length >
                0 ? (
                  <div className="space-y-4">
                    {selectedReport.highPriorityFeedback.map(
                      (item, index) => (
                        <article
                          key={`${item.customer}-${index}`}
                          className="print-no-break rounded-2xl border border-slate-200 bg-white p-5 print:p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-base font-bold text-slate-900">
                                {item.customer}
                              </h3>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.theme && (
                                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                                    {item.theme}
                                  </span>
                                )}

                                {item.sentiment && (
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium capitalize text-slate-600">
                                    {item.sentiment}
                                  </span>
                                )}

                                {item.urgency && (
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium capitalize text-slate-600">
                                    Urgency:{" "}
                                    {item.urgency}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="w-fit shrink-0 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700">
                              High Priority
                            </span>
                          </div>

                          <div className="mt-4 border-l-2 border-slate-300 pl-4">
                            <p className="text-sm leading-6 text-slate-700">
                              “{item.content}”
                            </p>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyInlineState text="No high-priority feedback was identified for this reporting period." />
                )}
              </section>

              {/* ========================================================= */}
              {/* REPORT FOOTER */}
              {/* ========================================================= */}

              <footer className="mt-10 border-t border-slate-200 pt-5 print:mt-7">
                <div className="flex flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Project LOOP
                  </p>

                  <p className="text-[10px] text-slate-400">
                    AI-powered Customer Feedback Intelligence Platform
                  </p>
                </div>
              </footer>
            </>
          )}
        </div>
      </main>
    </>
  );
}

/* ============================================================= */
/* STAT CARD */
/* ============================================================= */

function StatCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: number;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 print:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      {secondary && (
        <p className="mt-1 text-[10px] font-medium text-slate-500">
          {secondary}
        </p>
      )}
    </div>
  );
}

/* ============================================================= */
/* METRIC CARD */
/* ============================================================= */

function MetricCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, number][];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 print:p-5">
      <h3 className="text-base font-bold text-slate-900">
        {title}
      </h3>

      <div className="mt-4 space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 print:bg-white print:px-0"
          >
            <span className="text-sm font-medium text-slate-600">
              {label}
            </span>

            <span className="text-lg font-bold text-slate-900">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================= */
/* SENTIMENT SHIFT CARD */
/* ============================================================= */

function SentimentShiftCard({
  label,
  current,
  previous,
  shift,
}: {
  label: string;
  current: number;
  previous: number;
  shift: number;
}) {
  const sign = shift > 0 ? "+" : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-900">
        {label}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Previous
          </p>

          <p className="mt-1 text-xl font-bold text-slate-800">
            {previous}%
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
            Current
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {current}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
        <span className="text-xs font-semibold text-slate-500">
          Change
        </span>

        <span className="text-sm font-bold text-slate-900">
          {sign}
          {shift} pp
        </span>
      </div>
    </div>
  );
}

/* ============================================================= */
/* EMPTY INLINE STATE */
/* ============================================================= */

function EmptyInlineState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

/* ============================================================= */
/* MARKDOWN REPORT RENDERER */
/* ============================================================= */

function MarkdownReport({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const elements: ReactNode[] = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    /* Horizontal rule */
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      elements.push(
        <hr
          key={`hr-${index}`}
          className="my-6 border-0 border-t border-slate-200"
        />
      );

      index += 1;
      continue;
    }

    /* H1 */
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${index}`}
          className="mb-4 text-2xl font-bold tracking-tight text-slate-900"
        >
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );

      index += 1;
      continue;
    }

    /* H2 */
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${index}`}
          className="mb-3 mt-7 text-xl font-bold text-slate-900"
        >
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );

      index += 1;
      continue;
    }

    /* H3 */
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${index}`}
          className="mb-2 mt-5 text-base font-bold text-slate-800"
        >
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );

      index += 1;
      continue;
    }

    /* Bullet list */
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];

      while (
        index < lines.length &&
        /^[-*]\s+/.test(lines[index].trim())
      ) {
        items.push(
          lines[index]
            .trim()
            .replace(/^[-*]\s+/, "")
        );

        index += 1;
      }

      elements.push(
        <ul
          key={`ul-${index}`}
          className="my-3 list-disc space-y-2 pl-6 text-sm leading-6 text-slate-700"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );

      continue;
    }

    /* Numbered list */
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];

      while (
        index < lines.length &&
        /^\d+\.\s+/.test(lines[index].trim())
      ) {
        items.push(
          lines[index]
            .trim()
            .replace(/^\d+\.\s+/, "")
        );

        index += 1;
      }

      elements.push(
        <ol
          key={`ol-${index}`}
          className="my-3 list-decimal space-y-2 pl-6 text-sm leading-6 text-slate-700"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );

      continue;
    }

    /* Normal paragraph */
    elements.push(
      <p
        key={`p-${index}`}
        className="my-3 text-sm leading-7 text-slate-700"
      >
        {renderInlineMarkdown(line)}
      </p>
    );

    index += 1;
  }

  return (
    <div className="report-narrative text-slate-700">
      {elements}
    </div>
  );
}

/* ============================================================= */
/* INLINE MARKDOWN */
/* ============================================================= */

function renderInlineMarkdown(
  text: string
): ReactNode {
  const parts = text.split(
    /(\*\*[^*]+\*\*)/g
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong
          key={index}
          className="font-bold text-slate-900"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}