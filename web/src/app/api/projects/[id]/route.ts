import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { projectUpdateSchema } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  const item = await db.project.findUnique({
    where: { id: parsedParams.data.id },
    include: {
      productArea: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      researchPlan: {
        select: {
          id: true,
          updatedAt: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
          lastEditedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: {
          reports: true,
          insights: true,
          documentChunks: true,
          chatMessages: true,
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ data: item });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsedBody = projectUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await db.project.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true, startDate: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (parsedBody.data.productAreaId) {
      const productArea = await db.productArea.findUnique({
        where: { id: parsedBody.data.productAreaId },
        select: { id: true },
      });

      if (!productArea) {
        return NextResponse.json(
          { error: "Referenced Product Area does not exist" },
          { status: 404 },
        );
      }
    }

    const startDate =
      parsedBody.data.startDate === undefined
        ? undefined
        : parsedBody.data.startDate === null
          ? null
          : new Date(parsedBody.data.startDate);

    const endDate =
      parsedBody.data.endDate === undefined
        ? undefined
        : parsedBody.data.endDate === null
          ? null
          : new Date(parsedBody.data.endDate);

    const effectiveStartDate =
      startDate === undefined
        ? existing.startDate
        : startDate === null
          ? undefined
          : startDate;

    const effectiveEndDate = endDate === undefined ? undefined : endDate === null ? undefined : endDate;

    if (effectiveStartDate && effectiveEndDate && effectiveEndDate < effectiveStartDate) {
      return NextResponse.json(
        { error: "endDate must be the same as or later than startDate" },
        { status: 400 },
      );
    }

    const updated = await db.project.update({
      where: { id: parsedParams.data.id },
      data: {
        name: parsedBody.data.name,
        description: parsedBody.data.description,
        productAreaId: parsedBody.data.productAreaId,
        startDate,
        endDate,
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Could not update Project" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  const project = await db.project.findUnique({
    where: { id: parsedParams.data.id },
    select: {
      researchPlan: {
        select: { id: true },
      },
      _count: {
        select: {
          reports: true,
          insights: true,
          documentChunks: true,
          chatMessages: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const hasDependencies =
    project._count.reports > 0 ||
    project._count.insights > 0 ||
    project._count.documentChunks > 0 ||
    project._count.chatMessages > 0 ||
    !!project.researchPlan;

  if (hasDependencies) {
    return NextResponse.json(
      {
        error: "Project cannot be deleted while linked data still exists",
        dependencies: {
          reports: project._count.reports,
          insights: project._count.insights,
          documentChunks: project._count.documentChunks,
          chatMessages: project._count.chatMessages,
          researchPlan: project.researchPlan ? 1 : 0,
        },
      },
      { status: 409 },
    );
  }

  await db.project.delete({
    where: { id: parsedParams.data.id },
  });

  return NextResponse.json({ success: true });
}
