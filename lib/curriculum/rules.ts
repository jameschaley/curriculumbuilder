import { normalise, yearGroupNumber } from "@/lib/utils";
import {
  SCIENCE_ENTITLEMENTS,
  WEAK_SCIENCE_PAIRINGS
} from "@/lib/curriculum/defaults";
import type {
  CurriculumSnapshot,
  SnapshotPlannedUnit,
  SnapshotUnit,
  UnitTagInput,
  WarningDraft
} from "@/lib/curriculum/types";

function tagsOf(unit: SnapshotUnit, kind: UnitTagInput["kind"]) {
  return unit.tags
    .filter((tag) => tag.kind === kind)
    .map((tag) => tag.value)
    .filter(Boolean);
}

function overlaps(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalise));
  return left.filter((item) => rightSet.has(normalise(item)));
}

function plannedUnitContext(snapshot: CurriculumSnapshot, planned: SnapshotPlannedUnit) {
  const unit = snapshot.units.find((item) => item.id === planned.unitId);
  const subject = snapshot.subjects.find((item) => item.id === planned.subjectId);
  const classGroup = snapshot.classes.find((item) => item.id === planned.classGroupId);
  const term = snapshot.terms.find((item) => item.id === planned.termSlotId);
  const assignedYearGroups =
    planned.assignedYearGroupIds.length > 0
      ? snapshot.yearGroups.filter((yearGroup) =>
          planned.assignedYearGroupIds.includes(yearGroup.id)
        )
      : classGroup?.yearGroups ?? [];

  return { unit, subject, classGroup, term, assignedYearGroups };
}

function warningKey(warning: WarningDraft) {
  return [
    warning.type,
    warning.severity,
    warning.affectedCohort ?? "",
    warning.subjectId ?? "",
    warning.unitId ?? "",
    normalise(warning.reason)
  ].join("|");
}

function pushUnique(warnings: WarningDraft[], warning: WarningDraft) {
  const key = warningKey(warning);
  if (!warnings.some((existing) => warningKey(existing) === key)) {
    warnings.push(warning);
  }
}

export function deriveCurriculumWarnings(snapshot: CurriculumSnapshot): WarningDraft[] {
  const warnings: WarningDraft[] = [];

  deriveOverlappingCohortWarnings(snapshot, warnings);
  derivePreviousCoverageWarnings(snapshot, warnings);
  deriveScienceEntitlementWarnings(snapshot, warnings);
  deriveWeakSciencePairingWarnings(snapshot, warnings);
  deriveWorkloadWarnings(snapshot, warnings);

  return warnings;
}

function deriveOverlappingCohortWarnings(
  snapshot: CurriculumSnapshot,
  warnings: WarningDraft[]
) {
  const byYearGroup = new Map<string, string[]>();
  for (const classGroup of snapshot.classes) {
    for (const yearGroup of classGroup.yearGroups) {
      const classes = byYearGroup.get(yearGroup.name) ?? [];
      classes.push(classGroup.name);
      byYearGroup.set(yearGroup.name, classes);
    }
  }

  for (const [yearGroupName, classNames] of byYearGroup) {
    if (classNames.length < 2) continue;
    pushUnique(warnings, {
      severity: "INFO",
      type: "WEAK_ALIGNMENT",
      affectedCohort: yearGroupName,
      reason: `${yearGroupName} appears in ${classNames.join(
        " and "
      )}, so coverage must be tracked by cohort as well as class.`,
      suggestedAction:
        "Keep previous coverage records for this cohort and review both class maps before finalising the year."
    });
  }
}

function derivePreviousCoverageWarnings(
  snapshot: CurriculumSnapshot,
  warnings: WarningDraft[]
) {
  for (const planned of snapshot.plannedUnits) {
    const { unit, subject, classGroup, term, assignedYearGroups } = plannedUnitContext(
      snapshot,
      planned
    );
    if (!unit || !subject || !classGroup || !term) continue;

    const substantiveTags = tagsOf(unit, "substantive");
    const conceptTags = tagsOf(unit, "concept");
    const genreTags = tagsOf(unit, "genre");

    for (const yearGroup of assignedYearGroups) {
      const previousMatches = snapshot.previousCoverage.filter(
        (record) =>
          record.cohortYearGroupId === yearGroup.id &&
          record.subjectId === subject.id &&
          record.coverageStatus !== "missed"
      );

      for (const previous of previousMatches) {
        const sharedSubstantive = overlaps(substantiveTags, previous.contentTags);
        const sharedConcept = overlaps(conceptTags, previous.contentTags);
        const sameTitle = normalise(previous.unitTitle) === normalise(unit.title);
        const isGenreOnly =
          unit.repeatType === "genre-only" ||
          (unit.unitType === "writing" &&
            genreTags.length > 0 &&
            sharedSubstantive.length === 0);

        if (sameTitle && sharedSubstantive.length > 0) {
          pushUnique(warnings, {
            severity: "HIGH",
            type: "EXACT_DUPLICATE",
            affectedCohort: yearGroup.name,
            subjectId: subject.id,
            subjectName: subject.name,
            unitId: unit.id,
            reason: `${yearGroup.name} is scheduled to study ${unit.title} in ${classGroup.name} ${term.name}, but this cohort already studied matching content last year.`,
            suggestedAction:
              "Move the unit, change the substantive content, or override only if leaders agree this is intentional retrieval."
          });
        } else if (sharedSubstantive.length > 0 && !isGenreOnly) {
          pushUnique(warnings, {
            severity: "HIGH",
            type: "LIKELY_DUPLICATE",
            affectedCohort: yearGroup.name,
            subjectId: subject.id,
            subjectName: subject.name,
            unitId: unit.id,
            reason: `${yearGroup.name} is scheduled to study ${unit.title}, but previous coverage already included ${sharedSubstantive.join(
              ", "
            )}. This may be a substantive-content repeat.`,
            suggestedAction:
              "Check whether the new unit genuinely extends knowledge, or select a different anchor."
          });
        } else if (sharedConcept.length > 0) {
          pushUnique(warnings, {
            severity: "MEDIUM",
            type: "POSSIBLE_DUPLICATE",
            affectedCohort: yearGroup.name,
            subjectId: subject.id,
            subjectName: subject.name,
            unitId: unit.id,
            reason: `${unit.title} revisits the concept ${sharedConcept.join(
              ", "
            )} for ${yearGroup.name}.`,
            suggestedAction:
              "Keep if progression is explicit; add notes showing how expectations increase."
          });
        } else if (isGenreOnly) {
          pushUnique(warnings, {
            severity: "LOW",
            type: "ACCEPTABLE_REPEAT",
            affectedCohort: yearGroup.name,
            subjectId: subject.id,
            subjectName: subject.name,
            unitId: unit.id,
            reason: `${unit.title} repeats a writing genre without repeating the same substantive content.`,
            suggestedAction:
              "Keep the genre repeat and make the year-specific outcomes visible in the unit editor."
          });
        }
      }

      const cohortNumber = yearGroupNumber(yearGroup.name);
      const unitYearNumber = yearGroupNumber(unit.yearGroupName);
      if (
        cohortNumber !== null &&
        unitYearNumber !== null &&
        unitYearNumber > cohortNumber
      ) {
        pushUnique(warnings, {
          severity: "MEDIUM",
          type: "EARLY_ENCOUNTER",
          affectedCohort: yearGroup.name,
          subjectId: subject.id,
          subjectName: subject.name,
          unitId: unit.id,
          reason: `${yearGroup.name} pupils are accessing a ${unit.yearGroupName} anchor: ${unit.title}.`,
          suggestedAction:
            "Mark this as an early encounter and ensure it is not repeated later as entirely new learning."
        });
      }
    }
  }
}

function deriveScienceEntitlementWarnings(
  snapshot: CurriculumSnapshot,
  warnings: WarningDraft[]
) {
  const science = snapshot.subjects.find((subject) => subject.name === "Science");
  if (!science) return;

  for (const entitlement of SCIENCE_ENTITLEMENTS) {
    const yearGroup = snapshot.yearGroups.find(
      (item) => item.name === entitlement.yearGroup
    );
    if (!yearGroup) continue;

    const plannedScienceUnits = snapshot.plannedUnits
      .filter((planned) => planned.subjectId === science.id)
      .filter((planned) => {
        const { unit, assignedYearGroups } = plannedUnitContext(snapshot, planned);
        return (
          assignedYearGroups.some((assigned) => assigned.id === yearGroup.id) ||
          unit?.yearGroupId === yearGroup.id
        );
      })
      .map((planned) => snapshot.units.find((unit) => unit.id === planned.unitId))
      .filter((unit): unit is SnapshotUnit => Boolean(unit));

    const plannedText = plannedScienceUnits
      .map((unit) => [unit.title, ...tagsOf(unit, "substantive")].join(" "))
      .join(" ");

    for (const requiredTitle of entitlement.titles) {
      if (!normalise(plannedText).includes(normalise(requiredTitle))) {
        pushUnique(warnings, {
          severity: requiredTitle === "Earth and Space" ? "HIGH" : "MEDIUM",
          type: "GAP",
          affectedCohort: yearGroup.name,
          subjectId: science.id,
          subjectName: science.name,
          reason: `${yearGroup.name} science entitlement is missing ${requiredTitle}.`,
          suggestedAction:
            "Add a cohort-specific science unit or adjust the science entitlement map."
        });
      }
    }
  }
}

function deriveWeakSciencePairingWarnings(
  snapshot: CurriculumSnapshot,
  warnings: WarningDraft[]
) {
  const science = snapshot.subjects.find((subject) => subject.name === "Science");
  if (!science) return;

  for (const weakPairing of WEAK_SCIENCE_PAIRINGS) {
    const planned = snapshot.plannedUnits.find((item) => {
      const { unit, classGroup, term } = plannedUnitContext(snapshot, item);
      return (
        item.subjectId === science.id &&
        classGroup?.name === weakPairing.className &&
        term?.name === weakPairing.term &&
        unit?.title === weakPairing.pairing
      );
    });

    if (!planned) continue;
    const { unit, classGroup, term, assignedYearGroups } = plannedUnitContext(
      snapshot,
      planned
    );
    if (!unit || !classGroup || !term) continue;

    pushUnique(warnings, {
      severity: "MEDIUM",
      type: "WEAK_ALIGNMENT",
      affectedCohort: assignedYearGroups.map((item) => item.shortName).join("/"),
      subjectId: science.id,
      subjectName: science.name,
      unitId: unit.id,
      reason: `${classGroup.name} ${term.name} pairs ${weakPairing.pairing}, which has weak conceptual alignment.`,
      suggestedAction: weakPairing.action
    });
  }
}

function deriveWorkloadWarnings(snapshot: CurriculumSnapshot, warnings: WarningDraft[]) {
  for (const classGroup of snapshot.classes) {
    for (const term of snapshot.terms) {
      const splitBlocks = snapshot.plannedUnits.filter(
        (planned) =>
          planned.classGroupId === classGroup.id &&
          planned.termSlotId === term.id &&
          ["SPLIT_INPUT", "COHORT_SPECIFIC", "OVERLAY"].includes(planned.mode)
      );

      if (splitBlocks.length >= 4) {
        pushUnique(warnings, {
          severity: "LOW",
          type: "WORKLOAD_RISK",
          affectedCohort: classGroup.yearGroups.map((item) => item.shortName).join("/"),
          reason: `${classGroup.name} has ${splitBlocks.length} split or overlay blocks in ${term.name}.`,
          suggestedAction:
            "Review whether any units can use a shared anchor with clearer year-specific outcomes."
        });
      }
    }
  }
}
