export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH";

export type SubjectPlanningModelKey =
  | "FULL_CYCLE_AB"
  | "MODIFIED_CYCLE_AB"
  | "LEAD_YEAR"
  | "SHARED_THEME_SEPARATE_OUTCOMES"
  | "SAME_UNIT_DIFFERENT_DEPTH"
  | "PARALLEL_CURRICULUM"
  | "COHORT_ENTITLEMENT"
  | "HYBRID";

export type PlannedUnitModeKey = "SHARED" | "SPLIT_INPUT" | "COHORT_SPECIFIC" | "OVERLAY";

export type JsonMap = Record<string, unknown>;

export type UnitTagInput = {
  kind: "substantive" | "disciplinary" | "vocabulary" | "genre" | "concept";
  value: string;
};

export type UnitSeed = {
  title: string;
  subject: string;
  yearGroup?: string;
  keyStageOrPhase?: string;
  term?: string;
  halfTerm?: string;
  cycle?: string;
  sourceDocumentName?: string;
  sourcePageNumber?: number;
  unitType: string;
  tags: UnitTagInput[];
  vocabulary?: string[];
  notes?: string;
  estimatedLessons?: number;
  estimatedHours?: number;
  assessmentEndpointText?: string;
  statutoryObjectiveLinks?: string[];
  repetitionAllowed?: boolean;
  repeatType?: "genre-only" | "concept repeat" | "substantive-content repeat";
};

export type SnapshotUnit = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  yearGroupId?: string | null;
  yearGroupName?: string | null;
  keyStageOrPhase?: string | null;
  term?: string | null;
  halfTerm?: string | null;
  cycle?: string | null;
  unitType: string;
  vocabulary: string[];
  notes?: string | null;
  estimatedLessons?: number | null;
  estimatedHours?: number | null;
  assessmentEndpointText?: string | null;
  statutoryObjectiveLinks: string[];
  repetitionAllowed: boolean;
  repeatType?: string | null;
  tags: UnitTagInput[];
  outcomeLadders: SnapshotOutcomeLadder[];
  sourceDocumentName?: string | null;
  sourcePageNumber?: number | null;
};

export type SnapshotOutcomeLadder = {
  id: string;
  yearGroupName: string;
  title: string;
  outcomes: string[];
  grammar: string[];
  successCriteria: string[];
};

export type SnapshotSubject = {
  id: string;
  name: string;
  slug: string;
  color: string;
  defaultUnitType?: string | null;
  model: SubjectPlanningModelKey;
  rationale?: string | null;
};

export type SnapshotYearGroup = {
  id: string;
  name: string;
  shortName: string;
  phase: string;
  sortOrder: number;
};

export type SnapshotClassGroup = {
  id: string;
  name: string;
  teacherName?: string | null;
  notes?: string | null;
  isMixedAge: boolean;
  isProtected: boolean;
  yearGroups: SnapshotYearGroup[];
};

export type SnapshotTermSlot = {
  id: string;
  name: string;
  shortName: string;
  sortOrder: number;
};

export type SnapshotCycle = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
};

export type SnapshotPlan = {
  id: string;
  name: string;
  academicYearId: string;
  cycleId?: string | null;
};

export type SnapshotPlannedUnit = {
  id: string;
  curriculumPlanId: string;
  unitId: string;
  classGroupId: string;
  subjectId: string;
  termSlotId: string;
  cycleId?: string | null;
  mode: PlannedUnitModeKey;
  assignedYearGroupIds: string[];
  position: number;
  notes?: string | null;
};

export type SnapshotPreviousCoverage = {
  id: string;
  academicYearId: string;
  cohortYearGroupId: string;
  cohortYearGroupName: string;
  classGroupId?: string | null;
  classGroupName?: string | null;
  subjectId: string;
  subjectName: string;
  unitTitle: string;
  contentTags: string[];
  coverageStatus: string;
  assessmentConfidence: string;
  notes?: string | null;
};

export type SnapshotWarning = {
  id: string;
  academicYearId: string;
  severity: Severity;
  type: string;
  affectedCohort?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  unitId?: string | null;
  reason: string;
  suggestedAction: string;
  dismissedAt?: string | null;
  overrideNote?: string | null;
};

export type CurriculumSnapshot = {
  school: {
    id: string;
    name: string;
    designNotes?: string | null;
  };
  academicYear: {
    id: string;
    label: string;
  };
  subjects: SnapshotSubject[];
  yearGroups: SnapshotYearGroup[];
  classes: SnapshotClassGroup[];
  terms: SnapshotTermSlot[];
  cycles: SnapshotCycle[];
  plans: SnapshotPlan[];
  units: SnapshotUnit[];
  plannedUnits: SnapshotPlannedUnit[];
  previousCoverage: SnapshotPreviousCoverage[];
  warnings: SnapshotWarning[];
  settings: {
    autosaveEnabled: boolean;
    importConfidenceFloor: number;
    theme: string;
  };
  source: "database" | "fallback";
};

export type WarningDraft = Omit<SnapshotWarning, "id" | "academicYearId"> & {
  academicYearId?: string;
};
