import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { llmProvider } from "@/lib/llm";
import { projectChatRequestSchema } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().min(1),
});

function toPlainText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainText(item)).filter(Boolean).join("\n");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.text === "string") {
      return record.text;
    }

    const keys = Object.keys(record).filter((key) => key !== "type" && key !== "attrs");
    return keys
      .map((key) => toPlainText(record[key]))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function buildContextBlock(input: {
  projectName: string;
  insights: Array<{ status: string; content: string; reportTitle: string }>;
  researchPlanText: string;
}) {
  const approved = input.insights.filter((insight) => insight.status === "APPROVED");
  const revised = input.insights.filter((insight) => insight.status === "REVISED");
  const pending = input.insights.filter((insight) => insight.status === "PENDING_REVIEW");

  const approvedBlock =
    approved.length > 0
      ? approved
          .slice(0, 8)
          .map((insight, index) => `${index + 1}. ${insight.content} (Source: ${insight.reportTitle})`)
          .join("\n")
      : "None";

  const revisedBlock =
    revised.length > 0
      ? revised
          .slice(0, 6)
          .map((insight, index) => `${index + 1}. ${insight.content} (Source: ${insight.reportTitle})`)
          .join("\n")
      : "None";

  const pendingBlock =
    pending.length > 0
      ? pending
          .slice(0, 4)
          .map((insight, index) => `${index + 1}. ${insight.content} (Source: ${insight.reportTitle})`)
          .join("\n")
      : "None";

  const planSnippet = input.researchPlanText.trim() || "No research plan content available.";

  return [
    `Project: ${input.projectName}`,
    "",
    "Approved Insights (highest confidence):",
    approvedBlock,
    "",
    "Revised Insights (needs caution):",
    revisedBlock,
    "",
    "Pending Review Insights (drafts, low confidence):",
    pendingBlock,
    "",
    "Research Plan Content:",
    planSnippet.slice(0, 6000),
  ].join("\n");
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  const project = await db.project.findUnique({
    where: { id: parsedParams.data.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const messages = await db.chatMessage.findMany({
    where: { projectId: parsedParams.data.id },
    include: {
      researcher: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ data: messages });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsedBody = projectChatRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const [project, researcher, researchPlan, insights, priorMessages] = await Promise.all([
      db.project.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true, name: true },
      }),
      db.researcher.findUnique({
        where: { id: parsedBody.data.researcherId },
        select: { id: true, name: true },
      }),
      db.researchPlan.findUnique({
        where: { projectId: parsedParams.data.id },
        select: { content: true },
      }),
      db.projectInsight.findMany({
        where: { projectId: parsedParams.data.id },
        include: {
          generatedFromReport: {
            select: { title: true },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 30,
      }),
      db.chatMessage.findMany({
        where: { projectId: parsedParams.data.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!researcher) {
      return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
    }

    const researchPlanText = toPlainText(researchPlan?.content);
    const contextBlock = buildContextBlock({
      projectName: project.name,
      researchPlanText,
      insights: insights.map((insight) => ({
        status: insight.status,
        content: insight.content,
        reportTitle: insight.generatedFromReport.title,
      })),
    });

    const orderedPrior = [...priorMessages].reverse();

    const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content:
          "You are a research assistant for a product research repository. Use only provided project context. Prioritize approved insights. Use revised and pending insights only with caution labels. If context is insufficient, clearly say so and suggest next data to collect.",
      },
      {
        role: "system",
        content: `Project retrieval context:\n${contextBlock}`,
      },
      ...orderedPrior.map((message) => ({
        role: message.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: message.content,
      })),
      {
        role: "user",
        content: parsedBody.data.message,
      },
    ];

    const llmResult = await llmProvider.chat(llmMessages);
    const assistantText = llmResult.text.trim() || "I could not generate a response for this question.";

    const saved = await db.$transaction(async (tx) => {
      const userMessage = await tx.chatMessage.create({
        data: {
          projectId: parsedParams.data.id,
          researcherId: researcher.id,
          role: "USER",
          content: parsedBody.data.message,
        },
      });

      const assistantMessage = await tx.chatMessage.create({
        data: {
          projectId: parsedParams.data.id,
          researcherId: researcher.id,
          role: "ASSISTANT",
          content: assistantText,
        },
      });

      return { userMessage, assistantMessage };
    });

    return NextResponse.json({
      data: {
        reply: saved.assistantMessage,
        userMessage: saved.userMessage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not process chat: ${message}` }, { status: 500 });
  }
}
