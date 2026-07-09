import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import { deriveCurriculumWarnings } from "@/lib/curriculum/rules";

export const runtime = "nodejs";

export async function POST() {
  const snapshot = await getCurriculumSnapshot();
  const warnings = deriveCurriculumWarnings(snapshot);

  try {
    await prisma.warning.deleteMany({
      where: {
        academicYearId: snapshot.academicYear.id,
        dismissedAt: null
      }
    });
    await prisma.warning.createMany({
      data: warnings.map((warning) => ({
        academicYearId: snapshot.academicYear.id,
        severity: warning.severity,
        type: warning.type as never,
        affectedCohort: warning.affectedCohort,
        subjectId: warning.subjectId,
        unitId: warning.unitId,
        reason: warning.reason,
        suggestedAction: warning.suggestedAction
      }))
    });
  } catch {
    return NextResponse.json({ warnings });
  }

  return NextResponse.json({ warnings });
}
