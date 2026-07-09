import { slugify } from "@/lib/utils";
import type { SubjectPlanningModelKey, UnitSeed } from "@/lib/curriculum/types";

export const DEFAULT_SCHOOL_NAME = "Mixed-Age Curriculum Builder Demo School";
export const DEFAULT_ACADEMIC_YEAR = "2026-2027";

export const YEAR_GROUPS = [
  { name: "Reception", shortName: "R", phase: "EYFS", sortOrder: 0 },
  { name: "Year 1", shortName: "Y1", phase: "Key Stage 1", sortOrder: 1 },
  { name: "Year 2", shortName: "Y2", phase: "Key Stage 1", sortOrder: 2 },
  { name: "Year 3", shortName: "Y3", phase: "Lower Key Stage 2", sortOrder: 3 },
  { name: "Year 4", shortName: "Y4", phase: "Lower Key Stage 2", sortOrder: 4 },
  { name: "Year 5", shortName: "Y5", phase: "Upper Key Stage 2", sortOrder: 5 },
  { name: "Year 6", shortName: "Y6", phase: "Upper Key Stage 2", sortOrder: 6 }
];

export const TERM_SLOTS = [
  { name: "Autumn 1", shortName: "A1", sortOrder: 1 },
  { name: "Autumn 2", shortName: "A2", sortOrder: 2 },
  { name: "Spring 1", shortName: "S1", sortOrder: 3 },
  { name: "Spring 2", shortName: "S2", sortOrder: 4 },
  { name: "Summer 1", shortName: "Su1", sortOrder: 5 },
  { name: "Summer 2", shortName: "Su2", sortOrder: 6 }
];

export const DEFAULT_CLASSES = [
  {
    name: "Reception/Year 1",
    teacherName: "Teacher A",
    yearGroups: ["Reception", "Year 1"],
    notes: "Annual EYFS provision with explicit Year 1 teaching.",
    isProtected: false
  },
  {
    name: "Year 2/Year 3",
    teacherName: "Teacher B",
    yearGroups: ["Year 2", "Year 3"],
    notes: "Mixed-age class with editable Cycle A/B anchors.",
    isProtected: false
  },
  {
    name: "Year 3/Year 4",
    teacherName: "Teacher C",
    yearGroups: ["Year 3", "Year 4"],
    notes: "Overlapping Year 3 cohort requires cohort tracking.",
    isProtected: false
  },
  {
    name: "Year 4/Year 5",
    teacherName: "Teacher D",
    yearGroups: ["Year 4", "Year 5"],
    notes: "Overlapping Year 4 cohort requires cohort tracking.",
    isProtected: false
  },
  {
    name: "Year 6",
    teacherName: "Teacher E",
    yearGroups: ["Year 6"],
    notes: "Single-age protected Year 6 annual plan.",
    isProtected: true
  }
];

export const SUBJECTS = [
  {
    name: "Writing",
    color: "#0f766e",
    defaultUnitType: "writing",
    model: "SHARED_THEME_SEPARATE_OUTCOMES" as SubjectPlanningModelKey,
    rationale:
      "Class anchor with year-specific grammar, spelling, success criteria and outcomes."
  },
  {
    name: "Reading",
    color: "#2563eb",
    defaultUnitType: "reading",
    model: "LEAD_YEAR" as SubjectPlanningModelKey,
    rationale: "Phase-specific reading texts with linked themes where useful."
  },
  {
    name: "Science",
    color: "#16a34a",
    defaultUnitType: "science",
    model: "COHORT_ENTITLEMENT" as SubjectPlanningModelKey,
    rationale:
      "Tracked by actual year-group entitlement, even when pupils sit in mixed-age classes."
  },
  {
    name: "History",
    color: "#b45309",
    defaultUnitType: "history",
    model: "FULL_CYCLE_AB" as SubjectPlanningModelKey,
    rationale: "Class-based Cycle A/B anchor with substantive content checks."
  },
  {
    name: "Geography",
    color: "#0891b2",
    defaultUnitType: "geography",
    model: "FULL_CYCLE_AB" as SubjectPlanningModelKey,
    rationale: "Class-based Cycle A/B anchor with fieldwork progression."
  },
  {
    name: "Art",
    color: "#be185d",
    defaultUnitType: "art",
    model: "FULL_CYCLE_AB" as SubjectPlanningModelKey,
    rationale: "Class-based Cycle A/B with artist, media and technique progression."
  },
  {
    name: "DT",
    color: "#7c3aed",
    defaultUnitType: "DT",
    model: "FULL_CYCLE_AB" as SubjectPlanningModelKey,
    rationale: "Class-based Cycle A/B with make, evaluate and technical knowledge checks."
  }
];

export const CYCLES = [
  {
    name: "Cycle A",
    description: "Default anchor: Y2/3 Y3-heavy, Y3/4 Y4-heavy, Y4/5 Y5-heavy.",
    sortOrder: 1
  },
  {
    name: "Cycle B",
    description: "Default anchor: Y2/3 Y2-heavy, Y3/4 Y3-heavy, Y4/5 Y4-heavy.",
    sortOrder: 2
  },
  {
    name: "Annual",
    description: "Single-year or entitlement-led provision, including science and Year 6.",
    sortOrder: 3
  }
];

export const SCIENCE_MAP = [
  {
    className: "Reception/Year 1",
    slots: [
      "Year 1 Animals including humans",
      "Year 1 Everyday materials",
      "Year 1 Seasonal changes",
      "Year 1 Plants",
      "Seasonal changes revisit",
      "Seasonal review and enquiry"
    ]
  },
  {
    className: "Year 2/Year 3",
    slots: [
      "Y2 Animals + Y3 Animals",
      "Y2 Materials + Y3 Rocks",
      "Y2 Plants + Y3 Plants",
      "Y2 Living things and habitats + Y3 Forces and magnets",
      "Y2 seasonal/weather retrieval + Y3 Light",
      "enquiry, assessment and catch-up"
    ]
  },
  {
    className: "Year 3/Year 4",
    slots: [
      "Y3 Animals + Y4 Animals",
      "Y3 Rocks + Y4 States of matter",
      "Y3 Plants + Y4 Living things",
      "Y3 Forces + Y4 Electricity",
      "Y3 Light + Y4 Sound",
      "enquiry, assessment and catch-up"
    ]
  },
  {
    className: "Year 4/Year 5",
    slots: [
      "Y4 Animals + Y5 Animals",
      "Y4 States of matter + Y5 Materials",
      "Y4 Living things + Y5 Living things",
      "Y4 Electricity + Y5 Forces",
      "Y4 Sound + Y5 Earth and Space",
      "enquiry, assessment and catch-up"
    ]
  },
  {
    className: "Year 6",
    slots: [
      "Y6 Living things",
      "Y6 Electricity",
      "Y6 Animals including humans",
      "retrieval, enquiry and assessment",
      "Y6 Light",
      "Y6 Evolution"
    ]
  }
];

export const WEAK_SCIENCE_PAIRINGS = [
  {
    className: "Year 2/Year 3",
    term: "Spring 2",
    pairing: "Y2 Living things and habitats + Y3 Forces and magnets",
    action: "Use short split inputs and shared working scientifically routines only."
  },
  {
    className: "Year 4/Year 5",
    term: "Summer 1",
    pairing: "Y4 Sound + Y5 Earth and Space",
    action: "Avoid forcing one concept; use split teaching and shared enquiry habits."
  }
];

export const SCIENCE_ENTITLEMENTS = [
  { yearGroup: "Year 1", titles: ["Animals including humans", "Everyday materials", "Seasonal changes", "Plants"] },
  { yearGroup: "Year 2", titles: ["Animals including humans", "Uses of everyday materials", "Plants", "Living things and habitats"] },
  { yearGroup: "Year 3", titles: ["Animals including humans", "Rocks", "Plants", "Forces and magnets", "Light"] },
  { yearGroup: "Year 4", titles: ["Animals including humans", "States of matter", "Living things and habitats", "Electricity", "Sound"] },
  { yearGroup: "Year 5", titles: ["Animals including humans", "Properties and changes of materials", "Living things and their habitats", "Forces", "Earth and Space"] },
  { yearGroup: "Year 6", titles: ["Living things and their habitats", "Electricity", "Animals including humans", "Light", "Evolution and inheritance"] }
];

export const CYCLE_ANCHORS = [
  {
    cycle: "Cycle A",
    className: "Year 2/Year 3",
    anchor: "Y3-heavy anchor",
    examples: ["Stone Age Settlements", "European Region Study", "Mechanical Posters"]
  },
  {
    cycle: "Cycle A",
    className: "Year 3/Year 4",
    anchor: "Y4-heavy anchor",
    examples: ["Ancient Greece", "Rivers and the Water Cycle", "Mixed Media Portraits"]
  },
  {
    cycle: "Cycle A",
    className: "Year 4/Year 5",
    anchor: "Y5-heavy anchor",
    examples: ["Early Islamic Civilisation", "Trade and Resources", "Structures: Pavilions"]
  },
  {
    cycle: "Cycle B",
    className: "Year 2/Year 3",
    anchor: "Y2-heavy anchor",
    examples: ["Great Fire of London", "Local Area Fieldwork", "Textiles: Puppets"]
  },
  {
    cycle: "Cycle B",
    className: "Year 3/Year 4",
    anchor: "Y3-heavy anchor",
    examples: ["Romans in Britain", "Mountains and Volcanoes", "Printing and Pattern"]
  },
  {
    cycle: "Cycle B",
    className: "Year 4/Year 5",
    anchor: "Y4-heavy anchor",
    examples: ["Ancient Greece", "Contrasting European Region", "Food: Seasonal Soup"]
  }
];

export const SAMPLE_UNITS: UnitSeed[] = [
  {
    title: "Journey Narrative: River Rescue",
    subject: "Writing",
    yearGroup: "Year 4",
    keyStageOrPhase: "Lower Key Stage 2",
    term: "Autumn",
    halfTerm: "Autumn 1",
    cycle: "Cycle A",
    unitType: "writing",
    tags: [
      { kind: "genre", value: "narrative" },
      { kind: "disciplinary", value: "expanded noun phrases" },
      { kind: "substantive", value: "rivers" }
    ],
    vocabulary: ["meander", "source", "rescue"],
    estimatedLessons: 15,
    assessmentEndpointText: "Independent journey narrative with year-specific success criteria.",
    repetitionAllowed: true,
    repeatType: "genre-only"
  },
  {
    title: "Persuasive Writing: Protect Our Park",
    subject: "Writing",
    yearGroup: "Year 5",
    keyStageOrPhase: "Upper Key Stage 2",
    term: "Spring",
    halfTerm: "Spring 2",
    cycle: "Cycle A",
    unitType: "writing",
    tags: [
      { kind: "genre", value: "persuasion" },
      { kind: "disciplinary", value: "modal verbs" },
      { kind: "substantive", value: "local environment" }
    ],
    vocabulary: ["proposal", "impact", "community"],
    estimatedLessons: 12,
    repetitionAllowed: true,
    repeatType: "genre-only"
  },
  {
    title: "Reading Study: Myths and Quests",
    subject: "Reading",
    yearGroup: "Year 4",
    keyStageOrPhase: "Lower Key Stage 2",
    halfTerm: "Autumn 2",
    cycle: "Cycle A",
    unitType: "reading",
    tags: [
      { kind: "substantive", value: "myths" },
      { kind: "disciplinary", value: "inference" },
      { kind: "disciplinary", value: "retrieval" }
    ],
    vocabulary: ["quest", "hero", "evidence"],
    estimatedLessons: 18
  },
  {
    title: "Ancient Greece",
    subject: "History",
    yearGroup: "Year 4",
    keyStageOrPhase: "Lower Key Stage 2",
    halfTerm: "Autumn 1",
    cycle: "Cycle A",
    unitType: "history",
    tags: [
      { kind: "substantive", value: "Ancient Greece" },
      { kind: "concept", value: "civilisation" },
      { kind: "disciplinary", value: "chronology" }
    ],
    vocabulary: ["democracy", "polis", "legacy"],
    estimatedLessons: 10,
    assessmentEndpointText: "Explain Greek influence using evidence and chronology."
  },
  {
    title: "Ancient Greece: Legacy and Democracy",
    subject: "History",
    yearGroup: "Year 5",
    keyStageOrPhase: "Upper Key Stage 2",
    halfTerm: "Autumn 1",
    cycle: "Cycle B",
    unitType: "history",
    tags: [
      { kind: "substantive", value: "Ancient Greece" },
      { kind: "concept", value: "civilisation" },
      { kind: "disciplinary", value: "source interpretation" }
    ],
    vocabulary: ["legacy", "democracy", "interpretation"],
    estimatedLessons: 10,
    assessmentEndpointText: "Evaluate the legacy of Greek ideas and institutions."
  },
  {
    title: "Rivers and the Water Cycle",
    subject: "Geography",
    yearGroup: "Year 4",
    keyStageOrPhase: "Lower Key Stage 2",
    halfTerm: "Spring 1",
    cycle: "Cycle A",
    unitType: "geography",
    tags: [
      { kind: "substantive", value: "rivers" },
      { kind: "concept", value: "water cycle" },
      { kind: "disciplinary", value: "fieldwork" }
    ],
    vocabulary: ["source", "tributary", "evaporation"],
    estimatedLessons: 8
  },
  {
    title: "Stone Age Settlements",
    subject: "History",
    yearGroup: "Year 3",
    keyStageOrPhase: "Lower Key Stage 2",
    halfTerm: "Autumn 1",
    cycle: "Cycle A",
    unitType: "history",
    tags: [
      { kind: "substantive", value: "Stone Age" },
      { kind: "concept", value: "settlement" },
      { kind: "disciplinary", value: "chronology" }
    ],
    vocabulary: ["settlement", "archaeology", "evidence"],
    estimatedLessons: 9
  },
  {
    title: "Great Fire of London",
    subject: "History",
    yearGroup: "Year 2",
    keyStageOrPhase: "Key Stage 1",
    halfTerm: "Autumn 1",
    cycle: "Cycle B",
    unitType: "history",
    tags: [
      { kind: "substantive", value: "The Great Fire of London" },
      { kind: "disciplinary", value: "historical evidence" },
      { kind: "concept", value: "change" }
    ],
    vocabulary: ["source", "diary", "rebuild"],
    estimatedLessons: 8
  },
  {
    title: "Local Area Fieldwork",
    subject: "Geography",
    yearGroup: "Year 2",
    keyStageOrPhase: "Key Stage 1",
    halfTerm: "Summer 1",
    cycle: "Cycle B",
    unitType: "geography",
    tags: [
      { kind: "substantive", value: "local area" },
      { kind: "disciplinary", value: "fieldwork" },
      { kind: "concept", value: "place" }
    ],
    vocabulary: ["route", "map", "observe"],
    estimatedLessons: 6
  },
  {
    title: "Mixed Media Portraits",
    subject: "Art",
    yearGroup: "Year 4",
    keyStageOrPhase: "Lower Key Stage 2",
    halfTerm: "Summer 1",
    cycle: "Cycle A",
    unitType: "art",
    tags: [
      { kind: "substantive", value: "portraiture" },
      { kind: "disciplinary", value: "mixed media" },
      { kind: "concept", value: "identity" }
    ],
    vocabulary: ["layer", "composition", "texture"],
    estimatedLessons: 6
  },
  {
    title: "Structures: Pavilions",
    subject: "DT",
    yearGroup: "Year 5",
    keyStageOrPhase: "Upper Key Stage 2",
    halfTerm: "Spring 2",
    cycle: "Cycle A",
    unitType: "DT",
    tags: [
      { kind: "substantive", value: "structures" },
      { kind: "disciplinary", value: "make" },
      { kind: "disciplinary", value: "evaluate" }
    ],
    vocabulary: ["frame", "stability", "prototype"],
    estimatedLessons: 6
  }
];

export function subjectSlug(name: string) {
  return slugify(name);
}
