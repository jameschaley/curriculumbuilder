import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectUnitsFromText, extractTextFromUpload } from "@/lib/import/parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a PDF, DOCX, CSV or XLSX file." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawText = await extractTextFromUpload(file.name, buffer);
  const drafts = detectUnitsFromText(rawText, file.name);

  try {
    const document = await prisma.importDocument.create({
      data: {
        fileName: file.name,
        fileType: file.type || file.name.split(".").pop() || "unknown",
        sourceName: file.name,
        rawText,
        status: "draft",
        confidence:
          drafts.reduce((total, draft) => total + draft.confidence, 0) / Math.max(drafts.length, 1),
        importDrafts: {
          create: drafts.map((draft) => ({
            id: draft.id,
            parsedUnitJson: draft,
            status: "needs_review"
          }))
        }
      },
      include: { importDrafts: true }
    });

    return NextResponse.json({
      documentId: document.id,
      fileName: file.name,
      rawTextPreview: rawText.slice(0, 3000),
      drafts: document.importDrafts.map((draft) => ({
        id: draft.id,
        ...(draft.parsedUnitJson as object)
      }))
    });
  } catch {
    return NextResponse.json({
      documentId: `ephemeral-${Date.now()}`,
      fileName: file.name,
      rawTextPreview: rawText.slice(0, 3000),
      drafts
    });
  }
}
