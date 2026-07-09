import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import type { CurriculumSnapshot } from "@/lib/curriculum/types";

function rowsToSheet(rows: Record<string, unknown>[]) {
  return XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
}

export function buildJsonBackup(snapshot: CurriculumSnapshot) {
  return Buffer.from(JSON.stringify(snapshot, null, 2), "utf8");
}

export function buildExcelWorkbook(snapshot: CurriculumSnapshot) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      snapshot.units.map((unit) => ({
        Title: unit.title,
        Subject: unit.subjectName,
        "Year group": unit.yearGroupName,
        "Half term": unit.halfTerm,
        Cycle: unit.cycle,
        "Unit type": unit.unitType,
        "Substantive tags": unit.tags
          .filter((tag) => tag.kind === "substantive")
          .map((tag) => tag.value)
          .join(", "),
        "Disciplinary tags": unit.tags
          .filter((tag) => tag.kind === "disciplinary")
          .map((tag) => tag.value)
          .join(", "),
        Vocabulary: unit.vocabulary.join(", "),
        Notes: unit.notes
      }))
    ),
    "Units"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      snapshot.classes.map((classGroup) => ({
        Class: classGroup.name,
        Teacher: classGroup.teacherName,
        "Year groups": classGroup.yearGroups.map((item) => item.shortName).join("/"),
        "Mixed age": classGroup.isMixedAge ? "Yes" : "No",
        Notes: classGroup.notes
      }))
    ),
    "Classes"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(snapshot.cycles.map((cycle) => ({ Cycle: cycle.name, Notes: cycle.description }))),
    "Cycles"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      snapshot.previousCoverage.map((record) => ({
        Cohort: record.cohortYearGroupName,
        Class: record.classGroupName,
        Subject: record.subjectName,
        Unit: record.unitTitle,
        Tags: record.contentTags.join(", "),
        Status: record.coverageStatus,
        Confidence: record.assessmentConfidence,
        Notes: record.notes
      }))
    ),
    "Previous coverage"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      snapshot.plannedUnits.map((planned) => {
        const unit = snapshot.units.find((item) => item.id === planned.unitId);
        const classGroup = snapshot.classes.find((item) => item.id === planned.classGroupId);
        const term = snapshot.terms.find((item) => item.id === planned.termSlotId);
        const cycle = snapshot.cycles.find((item) => item.id === planned.cycleId);
        return {
          Class: classGroup?.name,
          Term: term?.name,
          Cycle: cycle?.name,
          Subject: unit?.subjectName,
          Unit: unit?.title,
          Mode: planned.mode,
          "Assigned cohorts": planned.assignedYearGroupIds
            .map((yearGroupId) => snapshot.yearGroups.find((item) => item.id === yearGroupId)?.shortName)
            .filter(Boolean)
            .join("/")
        };
      })
    ),
    "Proposed coverage"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      snapshot.warnings.map((warning) => ({
        Severity: warning.severity,
        Type: warning.type,
        Cohort: warning.affectedCohort,
        Subject: warning.subjectName,
        Reason: warning.reason,
        Action: warning.suggestedAction,
        Override: warning.overrideNote
      }))
    ),
    "Warnings"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      snapshot.plannedUnits
        .filter((planned) => snapshot.subjects.find((subject) => subject.id === planned.subjectId)?.name === "Science")
        .map((planned) => {
          const unit = snapshot.units.find((item) => item.id === planned.unitId);
          const classGroup = snapshot.classes.find((item) => item.id === planned.classGroupId);
          const term = snapshot.terms.find((item) => item.id === planned.termSlotId);
          return {
            Class: classGroup?.name,
            Term: term?.name,
            Unit: unit?.title,
            Mode: planned.mode
          };
        })
    ),
    "Science entitlement"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      snapshot.subjects.map((subject) => ({
        Subject: subject.name,
        Model: subject.model,
        Rationale: subject.rationale
      }))
    ),
    "Subject models"
  );

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function paragraph(text: string, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold })],
    spacing: { after: 120 }
  });
}

function heading(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 }
  });
}

function simpleTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              children: [paragraph(header, true)]
            })
        )
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [paragraph(cell ?? "")]
                })
            )
          })
      )
    ]
  });
}

export async function buildWordDocument(snapshot: CurriculumSnapshot) {
  const warningRows = snapshot.warnings.slice(0, 20).map((warning) => [
    warning.severity,
    warning.affectedCohort ?? "",
    warning.subjectName ?? "",
    warning.reason,
    warning.suggestedAction
  ]);

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Mixed-Age Curriculum Builder",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER
          }),
          paragraph(`${snapshot.school.name} - ${snapshot.academicYear.label}`),
          paragraph(
            snapshot.school.designNotes ??
              "Flexible curriculum planning for mixed-age and overlapping cohorts."
          ),
          heading("School Structure"),
          simpleTable(
            ["Class", "Teacher", "Year groups", "Notes"],
            snapshot.classes.map((classGroup) => [
              classGroup.name,
              classGroup.teacherName ?? "",
              classGroup.yearGroups.map((yearGroup) => yearGroup.shortName).join("/"),
              classGroup.notes ?? ""
            ])
          ),
          heading("Subject Model Rationale"),
          simpleTable(
            ["Subject", "Model", "Rationale"],
            snapshot.subjects.map((subject) => [
              subject.name,
              subject.model.replace(/_/g, " "),
              subject.rationale ?? ""
            ])
          ),
          heading("Science Model"),
          simpleTable(
            ["Class", "Term", "Unit", "Mode"],
            snapshot.plannedUnits
              .filter((planned) => snapshot.subjects.find((subject) => subject.id === planned.subjectId)?.name === "Science")
              .map((planned) => {
                const unit = snapshot.units.find((item) => item.id === planned.unitId);
                const classGroup = snapshot.classes.find((item) => item.id === planned.classGroupId);
                const term = snapshot.terms.find((item) => item.id === planned.termSlotId);
                return [classGroup?.name ?? "", term?.name ?? "", unit?.title ?? "", planned.mode];
              })
          ),
          heading("Duplication Warnings"),
          simpleTable(["Severity", "Cohort", "Subject", "Reason", "Action"], warningRows),
          heading("Leadership Monitoring Actions"),
          paragraph("Review high-severity warnings before publishing Cycle A/B maps."),
          paragraph("Check previous-year coverage for overlapping cohorts in Year 3 and Year 4."),
          paragraph("Confirm science entitlement coverage remains cohort-specific.")
        ]
      }
    ]
  });

  return Buffer.from(await Packer.toBuffer(document));
}

export async function buildPdfReport(snapshot: CurriculumSnapshot) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;

  const drawLine = (text: string, size = 10, isBold = false) => {
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 790;
    }
    page.drawText(text.slice(0, 110), {
      x: 48,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.08, 0.12, 0.18)
    });
    y -= size + 8;
  };

  drawLine("Mixed-Age Curriculum Builder", 18, true);
  drawLine(`${snapshot.school.name} - ${snapshot.academicYear.label}`, 11);
  y -= 8;
  drawLine("School structure", 13, true);
  snapshot.classes.forEach((classGroup) => {
    drawLine(
      `${classGroup.name}: ${classGroup.yearGroups.map((yearGroup) => yearGroup.shortName).join("/")} - ${classGroup.teacherName ?? ""}`
    );
  });
  y -= 8;
  drawLine("Warnings", 13, true);
  snapshot.warnings.slice(0, 35).forEach((warning) => {
    drawLine(`${warning.severity}: ${warning.reason}`);
  });
  y -= 8;
  drawLine("Subject models", 13, true);
  snapshot.subjects.forEach((subject) => {
    drawLine(`${subject.name}: ${subject.model.replace(/_/g, " ")}`);
  });

  return Buffer.from(await pdf.save());
}
