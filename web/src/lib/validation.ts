import { z } from "zod";

const reportStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const insightStatusSchema = z.enum(["PENDING_REVIEW", "APPROVED", "REVISED", "REJECTED"]);
const idSchema = z.string().trim().min(1).max(64);

export const productAreaCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).optional().nullable(),
  createdById: idSchema,
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional().nullable(),
  productAreaId: idSchema,
  createdById: idSchema,
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
});

export const reportCreateSchema = z.object({
  title: z.string().trim().min(2).max(240),
  notes: z.string().trim().max(15000).optional().nullable(),
  fileUrl: z.string().min(1).max(2048),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  projectId: idSchema,
  createdById: idSchema,
});

export const researcherCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  avatarUrl: z.string().trim().url().optional().nullable(),
});

export const productAreaUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const projectUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    productAreaId: idSchema.optional(),
    startDate: z.string().date().optional().nullable(),
    endDate: z.string().date().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const reportUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(240).optional(),
    notes: z.string().trim().max(15000).optional().nullable(),
    fileUrl: z.string().min(1).max(2048).optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    fileSize: z.number().int().nonnegative().optional().nullable(),
    status: reportStatusSchema.optional(),
    publishedAt: z.string().datetime().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const researchPlanUpdateSchema = z.object({
  content: z.any(),
  researcherId: idSchema,
  fileUrl: z.string().min(1).max(2048).optional().nullable(),
  fileName: z.string().trim().min(1).max(255).optional().nullable(),
  fileSize: z.number().int().nonnegative().optional().nullable(),
});

export const projectInsightCreateSchema = z.object({
  content: z.string().trim().min(10).max(15000),
  generatedFromReportId: idSchema,
});

export const projectInsightReviewSchema = z.object({
  status: insightStatusSchema.refine((value) => value !== "PENDING_REVIEW", {
    message: "Review status must be APPROVED, REVISED, or REJECTED",
  }),
  reviewedById: idSchema,
  editorNotes: z.string().trim().max(5000).optional().nullable(),
});

export const projectChatRequestSchema = z.object({
  researcherId: idSchema,
  message: z.string().trim().min(2).max(5000),
});

export const searchAssistantRequestSchema = z.object({
  message: z.string().trim().min(2).max(5000),
});

export const indexingProcessSchema = z.object({
  limit: z.number().int().min(1).max(20).optional(),
});
