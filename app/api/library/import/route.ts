import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import type { CurriculumSnapshot } from "@/lib/curriculum/types";

export const runtime = "nodejs";

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a JSON library file." }, { status: 400 });
  }

  let parsed: CurriculumSnapshot;
  try {
    const text = await file.text();
    parsed = JSON.parse(text) as CurriculumSnapshot;
  } catch {
    return NextResponse.json({ error: "The uploaded file is not valid JSON." }, { status: 400 });
  }

  const snapshot = await getCurriculumSnapshot();
  const existingUnits = new Set(snapshot.units.map((unit) => unit.title.toLowerCase()));

  const imported: Array<{ title: string; created: boolean }> = [];

  for (const unit of parsed.units ?? []) {
    const title = unit.title?.trim();
    if (!title || existingUnits.has(title.toLowerCase())) continue;

    const subject = snapshot.subjects.find((item) => item.name === unit.subjectName);
    if (!subject) continue;

    const yearGroup = snapshot.yearGroups.find((item) => item.name === unit.yearGroupName);
    const unitType = unit.unitType ?? "unit";
    const tags = (unit.tags ?? []).map((tag) => ({ kind: tag.kind, value: tag.value }));

    await prisma.unit.create({
      data: {
        title,
        subjectId: subject.id,
        yearGroupId: yearGroup?.id ?? null,
        keyStageOrPhase: unit.keyStageOrPhase ?? null,
        term: unit.halfTerm ?? null,
        halfTerm: unit.halfTerm ?? null,
        cycle: unit.cycle ?? null,
        unitType,
        vocabulary: unit.vocabulary ?? [],
        notes: unit.notes ?? null,
        estimatedLessons: unit.estimatedLessons ?? null,
        estimatedHours: unit.estimatedHours ?? null,
        assessmentEndpointText: unit.assessmentEndpointText ?? null,
        statutoryObjectiveLinks: unit.statutoryObjectiveLinks ?? [],
        repetitionAllowed: unit.repetitionAllowed ?? false,
        repeatType: unit.repeatType ?? null,
        tags: {
          create: tags
        }
      }
    });

    existingUnits.add(title.toLowerCase());
    imported.push({ title, created: true });
  }

  return NextResponse.json({
    imported,
    count: imported.length,
    fileName: file.name
  });
}
