import { prisma } from "@/lib/db";
import { buildFallbackSnapshot } from "@/lib/curriculum/snapshot";
import { CYCLES, DEFAULT_ACADEMIC_YEAR, DEFAULT_SCHOOL_NAME } from "@/lib/curriculum/defaults";
import { slugify } from "@/lib/utils";

async function resetDatabase() {
  await prisma.warning.deleteMany();
  await prisma.previousCoverage.deleteMany();
  await prisma.coverageStatus.deleteMany();
  await prisma.plannedUnit.deleteMany();
  await prisma.curriculumPlan.deleteMany();
  await prisma.assessmentEndpoint.deleteMany();
  await prisma.outcomeLadder.deleteMany();
  await prisma.unitTag.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.importDraft.deleteMany();
  await prisma.importDocument.deleteMany();
  await prisma.subjectModel.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classYearGroup.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.termSlot.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.yearGroup.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.school.deleteMany();
}

async function main() {
  const snapshot = buildFallbackSnapshot();
  await resetDatabase();

  await prisma.school.create({
    data: {
      id: snapshot.school.id,
      name: DEFAULT_SCHOOL_NAME,
      designNotes: snapshot.school.designNotes,
      academicYears: {
        create: {
          id: snapshot.academicYear.id,
          label: DEFAULT_ACADEMIC_YEAR
        }
      }
    }
  });

  await prisma.userSettings.create({
    data: {
      schoolId: snapshot.school.id,
      defaultAcademicYearId: snapshot.academicYear.id,
      autosaveEnabled: true,
      importConfidenceFloor: 0.45,
      theme: "system"
    }
  });

  for (const yearGroup of snapshot.yearGroups) {
    await prisma.yearGroup.create({
      data: yearGroup
    });
  }

  for (const term of snapshot.terms) {
    await prisma.termSlot.create({
      data: term
    });
  }

  for (const cycle of snapshot.cycles) {
    await prisma.cycle.create({
      data: cycle
    });
  }

  for (const subject of snapshot.subjects) {
    await prisma.subject.create({
      data: {
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        color: subject.color,
        defaultUnitType: subject.defaultUnitType,
        subjectModel: {
          create: {
            model: subject.model,
            rationale: subject.rationale,
            configuration: {
              editable: true,
              source: "seed",
              subjectSpecific: true
            }
          }
        }
      }
    });
  }

  for (const classGroup of snapshot.classes) {
    await prisma.classGroup.create({
      data: {
        id: classGroup.id,
        name: classGroup.name,
        teacherName: classGroup.teacherName,
        notes: classGroup.notes,
        isMixedAge: classGroup.isMixedAge,
        isProtected: classGroup.isProtected,
        academicYearId: snapshot.academicYear.id,
        yearGroups: {
          create: classGroup.yearGroups.map((yearGroup) => ({
            yearGroupId: yearGroup.id
          }))
        }
      }
    });
  }

  for (const plan of snapshot.plans) {
    await prisma.curriculumPlan.create({
      data: {
        id: plan.id,
        name: plan.name,
        academicYearId: plan.academicYearId,
        cycleId: plan.cycleId,
        notes: CYCLES.find((cycle) => slugify(cycle.name) === plan.id.replace("plan-", ""))?.description
      }
    });
  }

  for (const unit of snapshot.units) {
    await prisma.unit.create({
      data: {
        id: unit.id,
        title: unit.title,
        subjectId: unit.subjectId,
        yearGroupId: unit.yearGroupId,
        keyStageOrPhase: unit.keyStageOrPhase,
        term: unit.term,
        halfTerm: unit.halfTerm,
        cycle: unit.cycle,
        sourceDocumentName: unit.sourceDocumentName,
        sourcePageNumber: unit.sourcePageNumber,
        unitType: unit.unitType,
        vocabulary: unit.vocabulary,
        notes: unit.notes,
        estimatedLessons: unit.estimatedLessons,
        estimatedHours: unit.estimatedHours,
        assessmentEndpointText: unit.assessmentEndpointText,
        statutoryObjectiveLinks: unit.statutoryObjectiveLinks,
        repetitionAllowed: unit.repetitionAllowed,
        repeatType: unit.repeatType,
        tags: {
          create: unit.tags.map((tag) => ({
            kind: tag.kind,
            value: tag.value
          }))
        },
        outcomeLadders: {
          create: unit.outcomeLadders.map((ladder) => {
            const yearGroup = snapshot.yearGroups.find(
              (item) => item.name === ladder.yearGroupName
            );
            if (!yearGroup) {
              throw new Error(`Missing year group for ladder ${ladder.title}`);
            }
            return {
              id: ladder.id,
              yearGroupId: yearGroup.id,
              title: ladder.title,
              outcomes: ladder.outcomes,
              grammar: ladder.grammar,
              successCriteria: ladder.successCriteria
            };
          })
        }
      }
    });

    if (unit.assessmentEndpointText) {
      await prisma.assessmentEndpoint.create({
        data: {
          unitId: unit.id,
          subjectId: unit.subjectId,
          title: unit.assessmentEndpointText,
          criteria: unit.statutoryObjectiveLinks,
          notes: "Seeded from unit endpoint text."
        }
      });
    }
  }

  for (const planned of snapshot.plannedUnits) {
    await prisma.plannedUnit.create({
      data: {
        id: planned.id,
        curriculumPlanId: planned.curriculumPlanId,
        unitId: planned.unitId,
        classGroupId: planned.classGroupId,
        subjectId: planned.subjectId,
        termSlotId: planned.termSlotId,
        cycleId: planned.cycleId,
        mode: planned.mode,
        assignedYearGroupIds: planned.assignedYearGroupIds,
        position: planned.position,
        notes: planned.notes
      }
    });
  }

  const coverageStatuses = [
    {
      key: "fully_covered",
      label: "Fully covered",
      description: "The cohort completed the core teaching and assessment."
    },
    {
      key: "partially_covered",
      label: "Partially covered",
      description: "The cohort met some content, but follow-up may be needed."
    },
    {
      key: "missed",
      label: "Missed",
      description: "The cohort did not cover this content."
    }
  ];

  for (const status of coverageStatuses) {
    await prisma.coverageStatus.create({ data: status });
  }

  const statusByKey = new Map(
    (await prisma.coverageStatus.findMany()).map((status) => [status.key, status.id])
  );

  for (const record of snapshot.previousCoverage) {
    await prisma.previousCoverage.create({
      data: {
        id: record.id,
        academicYearId: record.academicYearId,
        cohortYearGroupId: record.cohortYearGroupId,
        classGroupId: record.classGroupId,
        subjectId: record.subjectId,
        unitTitle: record.unitTitle,
        contentTags: record.contentTags,
        coverageStatusId: statusByKey.get(record.coverageStatus)!,
        assessmentConfidence: record.assessmentConfidence,
        notes: record.notes
      }
    });
  }

  for (const warning of snapshot.warnings) {
    await prisma.warning.create({
      data: {
        id: warning.id,
        academicYearId: snapshot.academicYear.id,
        severity: warning.severity,
        type: warning.type as never,
        affectedCohort: warning.affectedCohort,
        subjectId: warning.subjectId,
        unitId: warning.unitId,
        reason: warning.reason,
        suggestedAction: warning.suggestedAction,
        dismissedAt: warning.dismissedAt ? new Date(warning.dismissedAt) : null,
        overrideNote: warning.overrideNote
      }
    });
  }

  console.log(
    `Seeded ${snapshot.classes.length} classes, ${snapshot.units.length} units, ${snapshot.plannedUnits.length} planned units and ${snapshot.warnings.length} warnings.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
