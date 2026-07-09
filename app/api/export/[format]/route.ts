import { NextResponse } from "next/server";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import {
  buildExcelWorkbook,
  buildJsonBackup,
  buildPdfReport,
  buildWordDocument
} from "@/lib/export/builders";

export const runtime = "nodejs";

const contentTypes = {
  json: "application/json",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf"
};

export async function GET(
  _request: Request,
  { params }: { params: { format: "json" | "excel" | "word" | "pdf" } }
) {
  const snapshot = await getCurriculumSnapshot();
  const format = params.format;
  let body: Buffer;
  let fileName: string;

  if (format === "json") {
    body = buildJsonBackup(snapshot);
    fileName = "mixed-age-curriculum-backup.json";
  } else if (format === "excel") {
    body = buildExcelWorkbook(snapshot);
    fileName = "mixed-age-curriculum-workbook.xlsx";
  } else if (format === "word") {
    body = await buildWordDocument(snapshot);
    fileName = "mixed-age-curriculum-report.docx";
  } else if (format === "pdf") {
    body = await buildPdfReport(snapshot);
    fileName = "mixed-age-curriculum-report.pdf";
  } else {
    return NextResponse.json({ error: "Unsupported export format." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentTypes[format],
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
