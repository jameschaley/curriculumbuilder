import { prisma } from "@/lib/db";
import { ensureArray, slugify } from "@/lib/utils";
import {
  CYCLES,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_CLASSES,
  DEFAULT_SCHOOL_NAME,
  SAMPLE_UNITS,
  SCIENCE_MAP,
  SUBJECTS,
  TERM_SLOTS,
  YEAR_GROUPS
} from "@/lib/curriculum/defaults";
import { deriveCurriculumWarnings } from "@/lib/curriculum/rules";
import type {
  CurriculumSnapshot,
  PlannedUnitModeKey,
  SnapshotPlan,
  SnapshotPlannedUnit,
  SnapshotUnit,
  UnitSeed
} from "@/lib/curriculum/types";

function id(prefix: string, value: string) {
  return `${prefix}-${slugify(value)}`;
}

function asStringArray(value: unknown) {
  return ensureArray(value);
}

function scienceYearGroup(title: string) {
  const match = title.match(/(?:Year|Y)\s?(\d)/i);
  return match ? `Year ${match[1]}` : undefined;
}

function scienceTags(title: string) {
  const tags = new Set<string>();
  const lower = title.toLowerCase();
  if (lower.includes("animal")) tags.add("Animals including humans");
  if (lower.includes("everyday material") || lower.includes("materials")) {
    tags.add(lower.includes("y5") ? "Properties and changes of materials" : "Uses of everyday materials");
  }
  if (lower.includes("seasonal")) tags.add("Seasonal changes");
  if (lower.includes("plants")) tags.add("Plants");
  if (lower.includes("living things")) tags.add("Living things and habitats");
  if (lower.includes("rocks")) tags.add("Rocks");
  if (lower.includes("forces")) tags.add("Forces and magnets");
  if (lower.includes("light")) tags.add("Light");
  if (lower.includes("states of matter")) tags.add("States of matter");
  if (lower.includes("electricity")) tags.add("Electricity");
  if (lower.includes("sound")) tags.add("Sound");
  if (lower.includes("earth and space")) tags.add("Earth and Space");
  if (lower.includes("evolution")) tags.add("Evolution and inheritance");
  if (lower.includes("enquiry")) tags.add("Working scientifically");
  return Array.from(tags);
}

function toSnapshotUnit(seed: UnitSeed, index: number): SnapshotUnit {
  const subject = SUBJECTS.find((item) => item.name === seed.subject) ?? SUBJECTS[0];
  const yearGroup = YEAR_GROUPS.find((item) => item.name === seed.yearGroup);
  const writingLadderYears =
    seed.unitType === "writing" && seed.yearGroup === "Year 5"
      ? ["Year 4", "Year 5"]
      : seed.unitType === "writing" && seed.yearGroup === "Year 4"
        ? ["Year 3", "Year 4"]
        : [];
  return {
    id: id("unit", `${seed.title}-${index}`),
    title: seed.title,
    subjectId: id("subject", subject.name),
    subjectName: subject.name,
    subjectColor: subject.color,
    yearGroupId: yearGroup ? id("year-group", yearGroup.name) : null,
    yearGroupName: yearGroup?.name ?? null,
    keyStageOrPhase: seed.keyStageOrPhase ?? yearGroup?.phase ?? null,
    term: seed.term ?? null,
    halfTerm: seed.halfTerm ?? null,
    cycle: seed.cycle ?? null,
    unitType: seed.unitType,
    vocabulary: seed.vocabulary ?? [],
    notes: seed.notes ?? null,
    estimatedLessons: seed.estimatedLessons ?? null,
    estimatedHours: seed.estimatedHours ?? null,
    assessmentEndpointText: seed.assessmentEndpointText ?? null,
    statutoryObjectiveLinks: seed.statutoryObjectiveLinks ?? [],
    repetitionAllowed: seed.repetitionAllowed ?? false,
    repeatType: seed.repeatType ?? null,
    tags: seed.tags,
    outcomeLadders: writingLadderYears.map((name) => ({
      id: id("ladder", `${seed.title}-${name}`),
      yearGroupName: name,
      title: `${name} outcomes`,
      outcomes: [
        `${name} pupils use the shared stimulus with age-appropriate composition expectations.`,
        `${name} pupils edit and improve against the agreed success criteria.`
      ],
      grammar: [
        name === "Year 5" ? "Relative clauses and modal verbs" : "Expanded noun phrases and fronted adverbials"
      ],
      successCriteria: [
        "Clear audience and purpose",
        "Evidence of taught grammar",
        "Independent proofreading"
      ]
    })),
    sourceDocumentName: seed.sourceDocumentName ?? "Seed example",
    sourcePageNumber: seed.sourcePageNumber ?? null
  };
}

export function buildFallbackSnapshot(): CurriculumSnapshot {
  const subjects = SUBJECTS.map((subject) => ({
    id: id("subject", subject.name),
    name: subject.name,
    slug: slugify(subject.name),
    color: subject.color,
    defaultUnitType: subject.defaultUnitType,
    model: subject.model,
    rationale: subject.rationale
  }));

  const yearGroups = YEAR_GROUPS.map((yearGroup) => ({
    id: id("year-group", yearGroup.name),
    ...yearGroup
  }));

  const classes = DEFAULT_CLASSES.map((classGroup) => ({
    id: id("class", classGroup.name),
    name: classGroup.name,
    teacherName: classGroup.teacherName,
    notes: classGroup.notes,
    isMixedAge: classGroup.yearGroups.length > 1,
    isProtected: classGroup.isProtected,
    yearGroups: classGroup.yearGroups
      .map((name) => yearGroups.find((yearGroup) => yearGroup.name === name))
      .filter(Boolean) as typeof yearGroups
  }));

  const terms = TERM_SLOTS.map((term) => ({ id: id("term", term.name), ...term }));
  const cycles = CYCLES.map((cycle) => ({ id: id("cycle", cycle.name), ...cycle }));
  const plans: SnapshotPlan[] = cycles.map((cycle) => ({
    id: id("plan", cycle.name),
    name: `${cycle.name} curriculum plan`,
    academicYearId: id("academic-year", DEFAULT_ACADEMIC_YEAR),
    cycleId: cycle.id
  }));

  const sampleUnits = SAMPLE_UNITS.map(toSnapshotUnit);
  const scienceSubject = subjects.find((subject) => subject.name === "Science")!;
  const scienceUnits: SnapshotUnit[] = SCIENCE_MAP.flatMap((classMap) =>
    classMap.slots.map((title, index) => {
      const yearGroupName = scienceYearGroup(title);
      const yearGroup = yearGroups.find((item) => item.name === yearGroupName);
      const tags = scienceTags(title).map((value) => ({
        kind: "substantive" as const,
        value
      }));
      return {
        id: id("unit", `science-${classMap.className}-${title}-${index}`),
        title,
        subjectId: scienceSubject.id,
        subjectName: scienceSubject.name,
        subjectColor: scienceSubject.color,
        yearGroupId: yearGroup?.id ?? null,
        yearGroupName: yearGroup?.name ?? null,
        keyStageOrPhase: yearGroup?.phase ?? "Science entitlement",
        term: null,
        halfTerm: TERM_SLOTS[index]?.name ?? null,
        cycle: "Annual",
        unitType: "science",
        vocabulary: scienceTags(title),
        notes: title.includes("+")
          ? "Split input may be needed; track by actual year-group entitlement."
          : "Cohort entitlement science unit.",
        estimatedLessons: 6,
        estimatedHours: null,
        assessmentEndpointText: "Evidence entitlement coverage and working scientifically routines.",
        statutoryObjectiveLinks: scienceTags(title),
        repetitionAllowed: title.toLowerCase().includes("retrieval"),
        repeatType: null,
        tags,
        outcomeLadders: [],
        sourceDocumentName: "Seed science model",
        sourcePageNumber: null
      };
    })
  );

  const units = [...sampleUnits, ...scienceUnits];
  const planByCycle = new Map(plans.map((plan) => [plan.cycleId, plan]));
  const annualCycle = cycles.find((cycle) => cycle.name === "Annual")!;
  const annualPlan = planByCycle.get(annualCycle.id)!;

  const plannedUnits: SnapshotPlannedUnit[] = [];
  for (const classMap of SCIENCE_MAP) {
    const classGroup = classes.find((item) => item.name === classMap.className);
    if (!classGroup) continue;
    classMap.slots.forEach((title, index) => {
      const unit = units.find(
        (item) => item.subjectName === "Science" && item.title === title
      );
      const term = terms[index];
      if (!unit || !term) return;
      plannedUnits.push({
        id: id("planned", `${classMap.className}-${title}-${term.name}`),
        curriculumPlanId: annualPlan.id,
        unitId: unit.id,
        classGroupId: classGroup.id,
        subjectId: scienceSubject.id,
        termSlotId: term.id,
        cycleId: annualCycle.id,
        mode: title.includes("+") ? "SPLIT_INPUT" : "COHORT_SPECIFIC",
        assignedYearGroupIds: classGroup.yearGroups.map((yearGroup) => yearGroup.id),
        position: index,
        notes: title.includes("+") ? "Split input recommended." : null
      });
    });
  }

  const placement: Record<string, { className: string; term: string }> = {
    "Journey Narrative: River Rescue": { className: "Year 3/Year 4", term: "Autumn 1" },
    "Persuasive Writing: Protect Our Park": { className: "Year 4/Year 5", term: "Spring 2" },
    "Reading Study: Myths and Quests": { className: "Year 3/Year 4", term: "Autumn 2" },
    "Ancient Greece": { className: "Year 3/Year 4", term: "Autumn 1" },
    "Ancient Greece: Legacy and Democracy": { className: "Year 4/Year 5", term: "Autumn 1" },
    "Rivers and the Water Cycle": { className: "Year 3/Year 4", term: "Spring 1" },
    "Stone Age Settlements": { className: "Year 2/Year 3", term: "Autumn 1" },
    "Great Fire of London": { className: "Year 2/Year 3", term: "Autumn 1" },
    "Local Area Fieldwork": { className: "Year 2/Year 3", term: "Summer 1" },
    "Mixed Media Portraits": { className: "Year 3/Year 4", term: "Summer 1" },
    "Structures: Pavilions": { className: "Year 4/Year 5", term: "Spring 2" }
  };

  for (const unit of sampleUnits) {
    const place = placement[unit.title];
    const classGroup = place ? classes.find((item) => item.name === place.className) : null;
    const term = place ? terms.find((item) => item.name === place.term) : null;
    const cycle = cycles.find((item) => item.name === unit.cycle) ?? annualCycle;
    const plan = planByCycle.get(cycle.id) ?? annualPlan;
    if (!classGroup || !term || !plan) continue;
    plannedUnits.push({
      id: id("planned", `${unit.title}-${classGroup.name}-${term.name}`),
      curriculumPlanId: plan.id,
      unitId: unit.id,
      classGroupId: classGroup.id,
      subjectId: unit.subjectId,
      termSlotId: term.id,
      cycleId: cycle.id,
      mode: unit.unitType === "writing" ? "OVERLAY" : "SHARED",
      assignedYearGroupIds: classGroup.yearGroups.map((yearGroup) => yearGroup.id),
      position: plannedUnits.length,
      notes: unit.unitType === "writing" ? "Year-specific grammar and outcome ladders required." : null
    });
  }

  const history = subjects.find((subject) => subject.name === "History")!;
  const writing = subjects.find((subject) => subject.name === "Writing")!;
  const coverageStatus = {
    fully: "fully_covered",
    partially: "partially_covered"
  };

  const previousCoverage = [
    {
      id: id("previous", "year-4-ancient-greece"),
      academicYearId: id("academic-year", DEFAULT_ACADEMIC_YEAR),
      cohortYearGroupId: id("year-group", "Year 4"),
      cohortYearGroupName: "Year 4",
      classGroupId: id("class", "Year 3/Year 4"),
      classGroupName: "Year 3/Year 4",
      subjectId: history.id,
      subjectName: history.name,
      unitTitle: "Ancient Greece",
      contentTags: ["Ancient Greece", "civilisation", "chronology"],
      coverageStatus: coverageStatus.fully,
      assessmentConfidence: "medium",
      notes: "Imported example from previous-year map."
    },
    {
      id: id("previous", "year-3-stone-age"),
      academicYearId: id("academic-year", DEFAULT_ACADEMIC_YEAR),
      cohortYearGroupId: id("year-group", "Year 3"),
      cohortYearGroupName: "Year 3",
      classGroupId: id("class", "Year 2/Year 3"),
      classGroupName: "Year 2/Year 3",
      subjectId: history.id,
      subjectName: history.name,
      unitTitle: "Stone Age Settlements",
      contentTags: ["Stone Age", "settlement", "chronology"],
      coverageStatus: coverageStatus.partially,
      assessmentConfidence: "low",
      notes: "Partial coverage; revisit chronology."
    },
    {
      id: id("previous", "year-5-persuasive-writing"),
      academicYearId: id("academic-year", DEFAULT_ACADEMIC_YEAR),
      cohortYearGroupId: id("year-group", "Year 5"),
      cohortYearGroupName: "Year 5",
      classGroupId: id("class", "Year 4/Year 5"),
      classGroupName: "Year 4/Year 5",
      subjectId: writing.id,
      subjectName: writing.name,
      unitTitle: "Persuasive Speech",
      contentTags: ["persuasion", "audience"],
      coverageStatus: coverageStatus.fully,
      assessmentConfidence: "high",
      notes: "Genre repeat is acceptable if expectations rise."
    }
  ];

  const snapshot: CurriculumSnapshot = {
    school: {
      id: id("school", DEFAULT_SCHOOL_NAME),
      name: DEFAULT_SCHOOL_NAME,
      designNotes:
        "A flexible model for mixed-age, overlapping cohorts and subject-specific curriculum design."
    },
    academicYear: {
      id: id("academic-year", DEFAULT_ACADEMIC_YEAR),
      label: DEFAULT_ACADEMIC_YEAR
    },
    subjects,
    yearGroups,
    classes,
    terms,
    cycles,
    plans,
    units,
    plannedUnits,
    previousCoverage,
    warnings: [],
    settings: {
      autosaveEnabled: true,
      importConfidenceFloor: 0.45,
      theme: "system"
    },
    source: "fallback"
  };

  snapshot.warnings = deriveCurriculumWarnings(snapshot).map((warning, index) => ({
    id: id("warning", `${warning.type}-${warning.reason}-${index}`),
    academicYearId: snapshot.academicYear.id,
    ...warning
  }));

  return snapshot;
}

export async function getCurriculumSnapshot(): Promise<CurriculumSnapshot> {
  try {
    const school = await prisma.school.findFirst({
      orderBy: { createdAt: "asc" },
      include: { userSettings: true }
    });
    if (!school) return buildFallbackSnapshot();

    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: school.userSettings?.defaultAcademicYearId ?? undefined
      }
    });

    const selectedAcademicYear =
      academicYear ??
      (await prisma.academicYear.findFirst({
        where: { schoolId: school.id },
        orderBy: { label: "desc" }
      }));

    if (!selectedAcademicYear) return buildFallbackSnapshot();

    const [
      yearGroups,
      subjects,
      classes,
      terms,
      cycles,
      plans,
      units,
      plannedUnits,
      previousCoverage,
      warnings
    ] = await Promise.all([
      prisma.yearGroup.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.subject.findMany({
        include: { subjectModel: true },
        orderBy: { name: "asc" }
      }),
      prisma.classGroup.findMany({
        where: { academicYearId: selectedAcademicYear.id },
        include: {
          yearGroups: {
            include: { yearGroup: true }
          }
        },
        orderBy: { name: "asc" }
      }),
      prisma.termSlot.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.cycle.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.curriculumPlan.findMany({
        where: { academicYearId: selectedAcademicYear.id }
      }),
      prisma.unit.findMany({
        include: {
          subject: true,
          yearGroup: true,
          tags: true,
          outcomeLadders: { include: { yearGroup: true } }
        },
        orderBy: { title: "asc" }
      }),
      prisma.plannedUnit.findMany({
        where: { curriculumPlan: { academicYearId: selectedAcademicYear.id } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }]
      }),
      prisma.previousCoverage.findMany({
        where: { academicYearId: selectedAcademicYear.id },
        include: {
          cohortYearGroup: true,
          classGroup: true,
          subject: true,
          coverageStatus: true
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.warning.findMany({
        where: { academicYearId: selectedAcademicYear.id },
        include: { subject: true },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }]
      })
    ]);

    return {
      school: {
        id: school.id,
        name: school.name,
        designNotes: school.designNotes
      },
      academicYear: {
        id: selectedAcademicYear.id,
        label: selectedAcademicYear.label
      },
      yearGroups,
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        color: subject.color,
        defaultUnitType: subject.defaultUnitType,
        model: subject.subjectModel?.model ?? "HYBRID",
        rationale: subject.subjectModel?.rationale ?? null
      })),
      classes: classes.map((classGroup) => ({
        id: classGroup.id,
        name: classGroup.name,
        teacherName: classGroup.teacherName,
        notes: classGroup.notes,
        isMixedAge: classGroup.isMixedAge,
        isProtected: classGroup.isProtected,
        yearGroups: classGroup.yearGroups
          .map((join) => join.yearGroup)
          .sort((left, right) => left.sortOrder - right.sortOrder)
      })),
      terms,
      cycles,
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        academicYearId: plan.academicYearId,
        cycleId: plan.cycleId
      })),
      units: units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        subjectId: unit.subjectId,
        subjectName: unit.subject.name,
        subjectColor: unit.subject.color,
        yearGroupId: unit.yearGroupId,
        yearGroupName: unit.yearGroup?.name ?? null,
        keyStageOrPhase: unit.keyStageOrPhase,
        term: unit.term,
        halfTerm: unit.halfTerm,
        cycle: unit.cycle,
        unitType: unit.unitType,
        vocabulary: asStringArray(unit.vocabulary),
        notes: unit.notes,
        estimatedLessons: unit.estimatedLessons,
        estimatedHours: unit.estimatedHours,
        assessmentEndpointText: unit.assessmentEndpointText,
        statutoryObjectiveLinks: asStringArray(unit.statutoryObjectiveLinks),
        repetitionAllowed: unit.repetitionAllowed,
        repeatType: unit.repeatType,
        tags: unit.tags.map((tag) => ({
          kind: tag.kind as SnapshotUnit["tags"][number]["kind"],
          value: tag.value
        })),
        outcomeLadders: unit.outcomeLadders.map((ladder) => ({
          id: ladder.id,
          yearGroupName: ladder.yearGroup.name,
          title: ladder.title,
          outcomes: asStringArray(ladder.outcomes),
          grammar: asStringArray(ladder.grammar),
          successCriteria: asStringArray(ladder.successCriteria)
        })),
        sourceDocumentName: unit.sourceDocumentName,
        sourcePageNumber: unit.sourcePageNumber
      })),
      plannedUnits: plannedUnits.map((planned) => ({
        id: planned.id,
        curriculumPlanId: planned.curriculumPlanId,
        unitId: planned.unitId,
        classGroupId: planned.classGroupId,
        subjectId: planned.subjectId,
        termSlotId: planned.termSlotId,
        cycleId: planned.cycleId,
        mode: planned.mode as PlannedUnitModeKey,
        assignedYearGroupIds: asStringArray(planned.assignedYearGroupIds),
        position: planned.position,
        notes: planned.notes
      })),
      previousCoverage: previousCoverage.map((record) => ({
        id: record.id,
        academicYearId: record.academicYearId,
        cohortYearGroupId: record.cohortYearGroupId,
        cohortYearGroupName: record.cohortYearGroup.name,
        classGroupId: record.classGroupId,
        classGroupName: record.classGroup?.name ?? null,
        subjectId: record.subjectId,
        subjectName: record.subject.name,
        unitTitle: record.unitTitle,
        contentTags: asStringArray(record.contentTags),
        coverageStatus: record.coverageStatus.key,
        assessmentConfidence: record.assessmentConfidence,
        notes: record.notes
      })),
      warnings: warnings.map((warning) => ({
        id: warning.id,
        academicYearId: warning.academicYearId,
        severity: warning.severity,
        type: warning.type,
        affectedCohort: warning.affectedCohort,
        subjectId: warning.subjectId,
        subjectName: warning.subject?.name ?? null,
        unitId: warning.unitId,
        reason: warning.reason,
        suggestedAction: warning.suggestedAction,
        dismissedAt: warning.dismissedAt?.toISOString() ?? null,
        overrideNote: warning.overrideNote
      })),
      settings: {
        autosaveEnabled: school.userSettings?.autosaveEnabled ?? true,
        importConfidenceFloor: school.userSettings?.importConfidenceFloor ?? 0.45,
        theme: school.userSettings?.theme ?? "system"
      },
      source: "database"
    };
  } catch (error) {
    console.error("Falling back to seed snapshot", error);
    return buildFallbackSnapshot();
  }
}
