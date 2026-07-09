import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import type { CurriculumSnapshot } from "@/lib/curriculum/types";

export const runtime = "nodejs";

async function clearCurriculumData() {
  await prisma.plannedUnit.deleteMany({});
  await prisma.warning.deleteMany({});
  await prisma.previousCoverage.deleteMany({});
  await prisma.outcomeLadder.deleteMany({});
  await prisma.assessmentEndpoint.deleteMany({});
  await prisma.unitTag.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.subjectModel.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.classYearGroup.deleteMany({});
  await prisma.classGroup.deleteMany({});
  await prisma.curriculumPlan.deleteMany({});
  await prisma.cycle.deleteMany({});
  await prisma.termSlot.deleteMany({});
  await prisma.yearGroup.deleteMany({});
  await prisma.importDraft.deleteMany({});
  await prisma.importDocument.deleteMany({});
  await prisma.academicYear.deleteMany({});
  await prisma.school.deleteMany({});
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a curriculum map JSON file." }, { status: 400 });
  }

  let parsed: CurriculumSnapshot;
  try {
    parsed = JSON.parse(await file.text()) as CurriculumSnapshot;
  } catch {
    return NextResponse.json({ error: "The uploaded file is not valid JSON." }, { status: 400 });
  }

  await clearCurriculumData();

  const school = await prisma.school.create({
    data: {
      name: parsed.school.name,
      designNotes: parsed.school.designNotes ?? null
    }
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      label: parsed.academicYear.label,
      schoolId: school.id
    }
  });

  const yearGroups = await Promise.all(
    parsed.yearGroups.map((yearGroup) =>
      prisma.yearGroup.create({
        data: {
          id: yearGroup.id,
          name: yearGroup.name,
          shortName: yearGroup.shortName,
          phase: yearGroup.phase,
          sortOrder: yearGroup.sortOrder
        }
      })
    )
  );

  const subjects = await Promise.all(
    parsed.subjects.map((subject) =>
      prisma.subject.create({
        data: {
          id: subject.id,
          name: subject.name,
          slug: subject.slug,
          color: subject.color,
          defaultUnitType: subject.defaultUnitType ?? null,
          subjectModel: {
            create: {
              model: subject.model,
              rationale: subject.rationale ?? null
            }
          }
        }
      })
    )
  );

  const terms = await Promise.all(
    parsed.terms.map((term) =>
      prisma.termSlot.create({
        data: {
          id: term.id,
          name: term.name,
          shortName: term.shortName,
          sortOrder: term.sortOrder
        }
      })
    )
  );

  const cycles = await Promise.all(
    parsed.cycles.map((cycle) =>
      prisma.cycle.create({
        data: {
          id: cycle.id,
          name: cycle.name,
          description: cycle.description ?? null,
          sortOrder: cycle.sortOrder
        }
      })
    )
  );

  const curriculumPlans = await Promise.all(
    parsed.plans.map((plan) =>
      prisma.curriculumPlan.create({
        data: {
          id: plan.id,
          name: plan.name,
          academicYearId: academicYear.id,
          cycleId: plan.cycleId ?? null
        }
      })
    )
  );

  const classGroups = await Promise.all(
    parsed.classes.map((classGroup) =>
      prisma.classGroup.create({
        data: {
          id: classGroup.id,
          name: classGroup.name,
          teacherName: classGroup.teacherName ?? null,
          notes: classGroup.notes ?? null,
          isMixedAge: classGroup.isMixedAge,
          isProtected: classGroup.isProtected,
          academicYearId: academicYear.id,
          yearGroups: {
            create: classGroup.yearGroups.map((yearGroup) => ({
              yearGroupId: yearGroups.find((entry) => entry.name === yearGroup.name)?.id ?? yearGroup.id
            }))
          }
        }
      })
    )
  );

  const subjectLookup = new Map(subjects.map((subject) => [subject.name, subject.id]));
  const yearGroupLookup = new Map(yearGroups.map((yearGroup) => [yearGroup.name, yearGroup.id]));

  const createdUnits = await Promise.all(
    parsed.units.map((unit) =>
      prisma.unit.create({
        data: {
          id: unit.id,
          title: unit.title,
          subjectId: subjectLookup.get(unit.subjectName) ?? unit.subjectId,
          yearGroupId: yearGroupLookup.get(unit.yearGroupName ?? "") ?? unit.yearGroupId ?? null,
          keyStageOrPhase: unit.keyStageOrPhase ?? null,
          term: unit.term ?? null,
          halfTerm: unit.halfTerm ?? null,
          cycle: unit.cycle ?? null,
          unitType: unit.unitType,
          vocabulary: unit.vocabulary ?? [],
          notes: unit.notes ?? null,
          estimatedLessons: unit.estimatedLessons ?? null,
          estimatedHours: unit.estimatedHours ?? null,
          assessmentEndpointText: unit.assessmentEndpointText ?? null,
          statutoryObjectiveLinks: unit.statutoryObjectiveLinks ?? [],
          repetitionAllowed: unit.repetitionAllowed ?? false,
          repeatType: unit.repeatType ?? null,
          tags: {
            create: unit.tags.map((tag) => ({ kind: tag.kind, value: tag.value }))
          }
        }
      })
    )
  );

  const unitLookup = new Map(createdUnits.map((unit) => [unit.id, unit.id]));
  await Promise.all(
    parsed.plannedUnits.map((planned) =>
      prisma.plannedUnit.create({
        data: {
          id: planned.id,
          curriculumPlanId: curriculumPlans.find((plan) => plan.cycleId === planned.cycleId)?.id ?? curriculumPlans[0]?.id ?? academicYear.id,
          unitId: unitLookup.get(planned.unitId) ?? planned.unitId,
          classGroupId: classGroups.find((classGroup) => classGroup.id === planned.classGroupId)?.id ?? planned.classGroupId,
          subjectId: subjectLookup.get(parsed.subjects.find((subject) => subject.id === planned.subjectId)?.name ?? "") ?? planned.subjectId,
          termSlotId: terms.find((term) => term.id === planned.termSlotId)?.id ?? planned.termSlotId,
          cycleId: cycles.find((cycle) => cycle.id === planned.cycleId)?.id ?? planned.cycleId ?? null,
          mode: planned.mode,
          assignedYearGroupIds: planned.assignedYearGroupIds ?? [],
          position: planned.position,
          notes: planned.notes ?? null
        }
      })
    )
  );

  await prisma.userSettings.create({
    data: {
      schoolId: school.id,
      defaultAcademicYearId: academicYear.id,
      autosaveEnabled: true,
      importConfidenceFloor: 0.45,
      theme: "system"
    }
  });

  return NextResponse.json({ ok: true, imported: parsed.plannedUnits.length });
}
