import { z } from "zod";

export const unitDraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  subject: z.string().min(1),
  yearGroup: z.string().optional().nullable(),
  keyStageOrPhase: z.string().optional().nullable(),
  term: z.string().optional().nullable(),
  halfTerm: z.string().optional().nullable(),
  cycle: z.string().optional().nullable(),
  sourceDocumentName: z.string().optional().nullable(),
  sourcePageNumber: z.number().optional().nullable(),
  unitType: z.string().default("unit"),
  substantiveTags: z.array(z.string()).default([]),
  disciplinaryTags: z.array(z.string()).default([]),
  vocabulary: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  estimatedLessons: z.number().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  assessmentEndpointText: z.string().optional().nullable(),
  statutoryObjectiveLinks: z.array(z.string()).default([]),
  repetitionAllowed: z.boolean().default(false),
  repeatType: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).default(0.5)
});

export const unitUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subjectId: z.string().optional(),
  yearGroupId: z.string().nullable().optional(),
  keyStageOrPhase: z.string().nullable().optional(),
  term: z.string().nullable().optional(),
  halfTerm: z.string().nullable().optional(),
  cycle: z.string().nullable().optional(),
  unitType: z.string().optional(),
  vocabulary: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  estimatedLessons: z.number().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  assessmentEndpointText: z.string().nullable().optional(),
  statutoryObjectiveLinks: z.array(z.string()).optional(),
  repetitionAllowed: z.boolean().optional(),
  repeatType: z.string().nullable().optional(),
  tags: z
    .array(
      z.object({
        kind: z.string(),
        value: z.string()
      })
    )
    .optional()
});

export const classUpdateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  teacherName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  yearGroupIds: z.array(z.string()).min(1),
  isProtected: z.boolean().default(false)
});

export const plannedUnitUpdateSchema = z.object({
  id: z.string(),
  classGroupId: z.string().optional(),
  termSlotId: z.string().optional(),
  mode: z.enum(["SHARED", "SPLIT_INPUT", "COHORT_SPECIFIC", "OVERLAY"]).optional(),
  assignedYearGroupIds: z.array(z.string()).optional(),
  position: z.number().optional(),
  notes: z.string().nullable().optional()
});

export const previousCoverageSchema = z.object({
  cohortYearGroupId: z.string(),
  classGroupId: z.string().optional().nullable(),
  subjectId: z.string(),
  unitTitle: z.string().min(1),
  contentTags: z.array(z.string()).default([]),
  coverageStatus: z.enum(["fully_covered", "partially_covered", "missed"]),
  assessmentConfidence: z.string().default("unknown"),
  notes: z.string().optional().nullable()
});

export const warningOverrideSchema = z.object({
  id: z.string(),
  overrideNote: z.string().min(3)
});

export const subjectModelUpdateSchema = z.object({
  subjectId: z.string(),
  model: z.enum([
    "FULL_CYCLE_AB",
    "MODIFIED_CYCLE_AB",
    "LEAD_YEAR",
    "SHARED_THEME_SEPARATE_OUTCOMES",
    "SAME_UNIT_DIFFERENT_DEPTH",
    "PARALLEL_CURRICULUM",
    "COHORT_ENTITLEMENT",
    "HYBRID"
  ]),
  rationale: z.string().optional().nullable()
});
