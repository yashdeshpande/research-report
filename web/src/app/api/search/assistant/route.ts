import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { llmProvider } from "@/lib/llm";
import { searchAssistantRequestSchema } from "@/lib/validation";
import { vectorStore } from "@/lib/vector-store";

type EvidenceItem = {
  id: string;
  score: number;
  sourceType: "REPORT" | "RESEARCH_PLAN" | "INSIGHT";
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  text: string;
  projectName: string;
  sourceLabel: string;
};

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

async function buildEvidence(query: string): Promise<EvidenceItem[]> {
  const embedding = await llmProvider.embed(query);
  const chunks = await vectorStore.search(embedding.vector, { limit: 8 });

  if (chunks.length === 0) {
    return [];
  }

  const projectIds = [...new Set(chunks.map((chunk) => chunk.projectId))];
  const reportIds = [...new Set(chunks.filter((chunk) => chunk.sourceType === "REPORT").map((chunk) => chunk.sourceId))];
  const planIds = [...new Set(chunks.filter((chunk) => chunk.sourceType === "RESEARCH_PLAN").map((chunk) => chunk.sourceId))];
  const insightIds = [...new Set(chunks.filter((chunk) => chunk.sourceType === "INSIGHT").map((chunk) => chunk.sourceId))];

  const [projects, reports, plans, insights] = await Promise.all([
    db.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    }),
    reportIds.length > 0
      ? db.report.findMany({
          where: { id: { in: reportIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    planIds.length > 0
      ? db.researchPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, project: { select: { name: true } } },
        })
      : Promise.resolve([]),
    insightIds.length > 0
      ? db.projectInsight.findMany({
          where: { id: { in: insightIds } },
          select: { id: true, content: true },
        })
      : Promise.resolve([]),
  ]);

  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const reportTitleById = new Map(reports.map((report) => [report.id, report.title]));
  const planLabelById = new Map(plans.map((plan) => [plan.id, `Research Plan (${plan.project.name})`]));
  const insightLabelById = new Map(
    insights.map((insight) => [insight.id, limitText(insight.content, 72)]),
  );

  return chunks.map((chunk) => {
    const sourceLabel =
      chunk.sourceType === "REPORT"
        ? reportTitleById.get(chunk.sourceId) ?? "Report"
        : chunk.sourceType === "RESEARCH_PLAN"
          ? planLabelById.get(chunk.sourceId) ?? "Research Plan"
          : insightLabelById.get(chunk.sourceId) ?? "Insight";

    return {
      id: chunk.id,
      score: chunk.score,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      projectId: chunk.projectId,
      chunkIndex: chunk.chunkIndex,
      text: limitText(chunk.text, 260),
      projectName: projectNameById.get(chunk.projectId) ?? "Unknown Project",
      sourceLabel,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = searchAssistantRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const query = parsedBody.data.message;

    const [projects, reports, insights, productAreas, evidence] = await Promise.all([
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
      buildEvidence(query).catch(() => []),
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
      "",
      "Vector Evidence Chunks:",
      evidence.length > 0
        ? evidence
            .map(
              (item, index) =>
                `${index + 1}. [${item.sourceType}] ${item.sourceLabel} in ${item.projectName} (score ${item.score.toFixed(3)}): ${item.text}`,
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
        evidence,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not search repository: ${message}` }, { status: 500 });
  }
}