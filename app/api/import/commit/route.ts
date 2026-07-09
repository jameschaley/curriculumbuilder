import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { unitDraftSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const documentId = typeof body.documentId === "string" ? body.documentId : undefined;
  const drafts = unitDraftSchema.array().parse(body.drafts ?? []);

  try {
    const created = [];
    for (const draft of drafts) {
      const subject = await prisma.subject.upsert({
        where: { slug: slugify(draft.subject) },
        update: {},
        create: {
          name: draft.subject,
          slug: slugify(draft.subject),
          color: "#475569",
          defaultUnitType: draft.unitType,
          subjectModel: {
            create: {
              model: "HYBRID",
              rationale: "Imported subject; choose the model that matches the school's intent."
            }
          }
        }
      });

      const yearGroup = draft.yearGroup
        ? await prisma.yearGroup.findFirst({ where: { name: draft.yearGroup } })
        : null;

      const unit = await prisma.unit.create({
        data: {
          title: draft.title,
          subjectId: subject.id,
          yearGroupId: yearGroup?.id,
          keyStageOrPhase: draft.keyStageOrPhase,
          term: draft.term,
          halfTerm: draft.halfTerm,
          cycle: draft.cycle,
          sourceDocumentName: draft.sourceDocumentName,
          sourcePageNumber: draft.sourcePageNumber,
          unitType: draft.unitType,
          vocabulary: draft.vocabulary,
          notes: draft.notes,
          estimatedLessons: draft.estimatedLessons,
          estimatedHours: draft.estimatedHours,
          assessmentEndpointText: draft.assessmentEndpointText,
          statutoryObjectiveLinks: draft.statutoryObjectiveLinks,
          repetitionAllowed: draft.repetitionAllowed,
          repeatType: draft.repeatType,
          importDocumentId: documentId?.startsWith("ephemeral") ? undefined : documentId,
          tags: {
            create: [
              ...draft.substantiveTags.map((value) => ({ kind: "substantive", value })),
              ...draft.disciplinaryTags.map((value) => ({ kind: "disciplinary", value })),
              ...draft.vocabulary.map((value) => ({ kind: "vocabulary", value }))
            ]
          }
        },
        include: { subject: true, yearGroup: true, tags: true }
      });
      created.push(unit);
    }

    if (documentId && !documentId.startsWith("ephemeral")) {
      await prisma.importDocument.update({
        where: { id: documentId },
        data: { status: "committed" }
      });
    }

    return NextResponse.json({ units: created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save imported units. Check the database migration has run."
      },
      { status: 400 }
    );
  }
}
