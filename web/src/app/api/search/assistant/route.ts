import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { llmProvider } from "@/lib/llm";

const searchAssistantSchema = z.object({
  message: z.string().trim().min(2).max(5000),
});

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = searchAssistantSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const query = parsedBody.data.message;

    const [projects, reports, insights, productAreas] = await Promise.all([
      db.project.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          productArea: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 5,
      }),
      db.report.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { notes: { contains: query } },
            { fileName: { contains: query } },
          ],
        },
        select: {
          id: true,
          title: true,
          notes: true,
          fileName: true,
          status: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 5,
      }),
      db.projectInsight.findMany({
        where: {
          content: { contains: query },
        },
        select: {
          id: true,
          content: true,
          status: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          generatedFromReport: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: 8,
      }),
      db.productArea.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        take: 5,
      }),
    ]);

    const contextBlock = [
      "You can search across the full repository, including projects, reports, insights, and product areas.",
      "Tags are not implemented in the current data model yet, so do not invent tag matches.",
      "",
      "Matched Projects:",
      projects.length > 0
        ? projects
            .map(
              (project, index) =>
                `${index + 1}. ${project.name} (${project.productArea.name})${project.description ? ` - ${limitText(project.description, 160)}` : ""}`,
            )
            .join("\n")
        : "None",
      "",
      "Matched Reports:",
      reports.length > 0
        ? reports
            .map(
              (report, index) =>
                `${index + 1}. ${report.title} [${report.status}] in ${report.project.name} (${report.fileName})${report.notes ? ` - ${limitText(report.notes, 160)}` : ""}`,
            )
            .join("\n")
        : "None",
      "",
      "Matched Insights:",
      insights.length > 0
        ? insights
            .map(
              (insight, index) =>
                `${index + 1}. ${limitText(insight.content, 220)} [${insight.status}] in ${insight.project.name} from ${insight.generatedFromReport.title}`,
            )
            .join("\n")
        : "None",
      "",
      "Matched Product Areas:",
      productAreas.length > 0
        ? productAreas
            .map(
              (area, index) =>
                `${index + 1}. ${area.name}${area.description ? ` - ${limitText(area.description, 160)}` : ""}`,
            )
            .join("\n")
        : "None",
    ].join("\n");

    const result = await llmProvider.chat([
      {
        role: "system",
        content:
          "You are the global assistant for a research repository. Help users search anything in the repository. Answer only from the provided context. If the repository does not contain evidence for part of the request, say so plainly. Mention that tags are not available yet when a user asks about tags.",
      },
      {
        role: "system",
        content: `Repository search context:\n${contextBlock}`,
      },
      {
        role: "user",
        content: query,
      },
    ]);

    return NextResponse.json({
      data: {
        reply: result.text.trim() || "I could not find enough repository context to answer that.",
        matches: {
          projects,
          reports,
          insights,
          productAreas,
          tags: [],
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not search repository: ${message}` }, { status: 500 });
  }
}