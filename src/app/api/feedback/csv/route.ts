import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { hasRole, requireUser } from "../../../../lib/authz";

const csvRowSchema = z.object({
  customer: z.string().trim().min(1),
  message: z.string().trim().min(1),
  source: z.string().trim().min(1),
  sentiment: z.string().trim().optional(),
  theme: z.string().trim().optional(),
  priority: z.string().trim().optional(),
});

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());

  return values;
}

function parseCSV(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(
      "CSV must contain a header row and at least one data row."
    );
  }

  const headers = parseCSVLine(lines[0]).map((header) =>
    header.toLowerCase().trim()
  );

  return lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);

    const row: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });

    return {
      rowNumber: index + 2,
      data: {
        customer:
          row.customer ||
          row.customerlabel ||
          row.customer_name ||
          "",
        message:
          row.message ||
          row.content ||
          row.feedback ||
          "",
        source:
          row.source ||
          row.channel ||
          "",
        sentiment: row.sentiment || undefined,
        theme: row.theme || undefined,
        priority: row.priority || undefined,
      },
    };
  });
}

export async function POST(request: Request) {
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

    if (!hasRole(user.role, ["ADMIN", "ANALYST"])) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "CSV file is required",
        },
        { status: 400 }
      );
    }

    if (
      file.type !== "text/csv" &&
      !file.name.toLowerCase().endsWith(".csv")
    ) {
      return NextResponse.json(
        {
          error: "Only CSV files are supported",
        },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const rows = parseCSV(csvText);

    const importedRows: Array<{
      customer: string;
      message: string;
      source: string;
      sentiment?: string;
      theme?: string;
      priority?: string;
    }> = [];

    const failures: Array<{
      row: number;
      error: string;
    }> = [];

    for (const item of rows) {
      const result = csvRowSchema.safeParse(item.data);

      if (!result.success) {
        failures.push({
          row: item.rowNumber,
          error: "Customer, message, and source are required.",
        });

        continue;
      }

      importedRows.push(result.data);
    }

    if (importedRows.length > 0) {
      await prisma.feedback.createMany({
        data: importedRows.map((item) => ({
          customerLabel: item.customer,
          content: item.message,
          channel: item.source,
          sentiment: item.sentiment || null,
          theme: item.theme || null,
          priority: item.priority || null,
          workspaceId: user.workspaceId,
        })),
      });
    }

    return NextResponse.json(
      {
        message: "CSV processed successfully",
        imported: importedRows.length,
        failed: failures.length,
        failures,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CSV import error:", error);

    return NextResponse.json(
      {
        error: "Failed to process CSV file",
      },
      { status: 500 }
    );
  }
}