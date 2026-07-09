import { ensureArray, slugify } from "@/lib/utils";
import { SUBJECTS, TERM_SLOTS, YEAR_GROUPS } from "@/lib/curriculum/defaults";
import { unitDraftSchema } from "@/lib/validation";

export type ParsedImportUnit = ReturnType<typeof unitDraftSchema.parse>;

function bufferToText(buffer: Buffer) {
  return buffer.toString("utf8").replace(/\u0000/g, " ");
}

async function pdfToText(buffer: Buffer) {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const result = await pdfParse(buffer);
  return result.text as string;
}

async function docxToText(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function xlsxToText(buffer: Buffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet);
  }).join("\n");
}

export async function extractTextFromUpload(fileName: string, buffer: Buffer) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return pdfToText(buffer);
  if (extension === "docx") return docxToText(buffer);
  if (extension === "xlsx" || extension === "xls") return xlsxToText(buffer);
  return bufferToText(buffer);
}

function detectSubject(line: string, currentSubject?: string) {
  const subject = SUBJECTS.find((item) =>
    new RegExp(`\\b${item.name}\\b`, "i").test(line)
  );
  return subject?.name ?? currentSubject ?? "Writing";
}

function detectYearGroup(line: string) {
  const yearGroup = YEAR_GROUPS.find((item) => {
    if (item.name === "Reception") return /\breception\b|\beyfs\b/i.test(line);
    return new RegExp(`\\bY${item.sortOrder}\\b|\\bYear\\s*${item.sortOrder}\\b`, "i").test(line);
  });
  return yearGroup?.name;
}

function detectTerm(line: string) {
  const term = TERM_SLOTS.find((slot) =>
    new RegExp(slot.name.replace(" ", "\\s*"), "i").test(line)
  );
  return term?.name;
}

function detectTags(line: string) {
  const knownContent = [
    "Ancient Egypt",
    "Ancient Greece",
    "Rocks",
    "Forces",
    "Forces and magnets",
    "The Great Fire of London",
    "Stone Age",
    "Romans",
    "Rivers",
    "Earth and Space",
    "Plants",
    "Light",
    "Sound",
    "Electricity",
    "States of matter",
    "Living things",
    "fieldwork",
    "chronology",
    "fair testing",
    "retrieval",
    "inference"
  ];
  const substantive = knownContent.filter((tag) =>
    line.toLowerCase().includes(tag.toLowerCase())
  );
  const disciplinary = ["chronology", "fieldwork", "fair testing", "retrieval", "inference"].filter(
    (tag) => line.toLowerCase().includes(tag)
  );
  return { substantive, disciplinary };
}

function cleanTitle(line: string) {
  return line
    .replace(/^\s*[-*\d.)]+\s*/, "")
    .replace(/\b(Autumn|Spring|Summer)\s*[12]\b/gi, "")
    .replace(/\bY\d\b|\bYear\s*\d\b/gi, "")
    .replace(/\bWriting|Reading|Science|History|Geography|Art|DT\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function detectUnitsFromText(rawText: string, sourceDocumentName: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 3);

  let currentSubject = "Writing";
  const drafts = [];

  for (const line of lines) {
    currentSubject = detectSubject(line, currentSubject);
    const yearGroup = detectYearGroup(line);
    const halfTerm = detectTerm(line);
    const tags = detectTags(line);
    const title = cleanTitle(line);
    const looksLikeUnit =
      title.length >= 5 &&
      (yearGroup ||
        halfTerm ||
        tags.substantive.length > 0 ||
        /unit|text|topic|enquiry|study|sequence/i.test(line));

    if (!looksLikeUnit) continue;

    drafts.push(
      unitDraftSchema.parse({
        id: `draft-${slugify(title)}-${drafts.length}`,
        title,
        subject: currentSubject,
        yearGroup,
        keyStageOrPhase: YEAR_GROUPS.find((item) => item.name === yearGroup)?.phase,
        term: halfTerm?.split(" ")[0],
        halfTerm,
        cycle: /cycle\s*a/i.test(line) ? "Cycle A" : /cycle\s*b/i.test(line) ? "Cycle B" : null,
        sourceDocumentName,
        sourcePageNumber: null,
        unitType: SUBJECTS.find((item) => item.name === currentSubject)?.defaultUnitType ?? "unit",
        substantiveTags: tags.substantive,
        disciplinaryTags: tags.disciplinary,
        vocabulary: [],
        notes: "Auto-detected from upload. Review before saving.",
        estimatedLessons: null,
        estimatedHours: null,
        assessmentEndpointText: null,
        statutoryObjectiveLinks: [],
        repetitionAllowed: false,
        repeatType: null,
        confidence: yearGroup && (halfTerm || tags.substantive.length > 0) ? 0.72 : 0.48
      })
    );
  }

  if (drafts.length === 0) {
    drafts.push(
      unitDraftSchema.parse({
        id: "draft-manual-unit",
        title: lines[0] ?? "Untitled imported unit",
        subject: "Writing",
        yearGroup: null,
        keyStageOrPhase: null,
        term: null,
        halfTerm: null,
        cycle: null,
        sourceDocumentName,
        sourcePageNumber: null,
        unitType: "unit",
        substantiveTags: [],
        disciplinaryTags: [],
        vocabulary: [],
        notes: "Parsing did not confidently detect units. Edit this draft or add units manually.",
        estimatedLessons: null,
        estimatedHours: null,
        assessmentEndpointText: null,
        statutoryObjectiveLinks: [],
        repetitionAllowed: false,
        repeatType: null,
        confidence: 0.2
      })
    );
  }

  return drafts.slice(0, 80).map((draft) => ({
    ...draft,
    vocabulary: ensureArray(draft.vocabulary),
    substantiveTags: ensureArray(draft.substantiveTags),
    disciplinaryTags: ensureArray(draft.disciplinaryTags)
  }));
}
