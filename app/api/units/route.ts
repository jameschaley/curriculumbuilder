import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import { unitUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCurriculumSnapshot();
  return NextResponse.json(snapshot.units);
}

export async function POST(request: Request) {
  const body = unitUpdateSchema
    .extend({
      title: unitUpdateSchema.shape.title.unwrap(),
      subjectId: unitUpdateSchema.shape.subjectId.unwrap(),
      unitType: unitUpdateSchema.shape.unitType.unwrap()
    })
    .parse(await request.json());

  const unit = await prisma.unit.create({
    data: {
      title: body.title,
      subjectId: body.subjectId,
      yearGroupId: body.yearGroupId,
      keyStageOrPhase: body.keyStageOrPhase,
      term: body.term,
      halfTerm: body.halfTerm,
      cycle: body.cycle,
      unitType: body.unitType,
      vocabulary: body.vocabulary ?? [],
      notes: body.notes,
      estimatedLessons: body.estimatedLessons,
      estimatedHours: body.estimatedHours,
      assessmentEndpointText: body.assessmentEndpointText,
      statutoryObjectiveLinks: body.statutoryObjectiveLinks ?? [],
      repetitionAllowed: body.repetitionAllowed ?? false,
      repeatType: body.repeatType,
      tags: {
        create: body.tags?.map((tag) => ({ kind: tag.kind, value: tag.value })) ?? []
      }
    },
    include: { subject: true, yearGroup: true, tags: true }
  });
  return NextResponse.json(unit);
}
