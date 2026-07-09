import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import { previousCoverageSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCurriculumSnapshot();
  return NextResponse.json(snapshot.previousCoverage);
}

export async function POST(request: Request) {
  const snapshot = await getCurriculumSnapshot();
  const records = previousCoverageSchema.array().parse((await request.json()).records ?? []);
  const created = [];
  for (const record of records) {
    const status = await prisma.coverageStatus.findUnique({
      where: { key: record.coverageStatus }
    });
    if (!status) throw new Error(`Missing coverage status ${record.coverageStatus}`);
    created.push(
      await prisma.previousCoverage.create({
        data: {
          academicYearId: snapshot.academicYear.id,
          cohortYearGroupId: record.cohortYearGroupId,
          classGroupId: record.classGroupId,
          subjectId: record.subjectId,
          unitTitle: record.unitTitle,
          contentTags: record.contentTags,
          coverageStatusId: status.id,
          assessmentConfidence: record.assessmentConfidence,
          notes: record.notes
        }
      })
    );
  }
  return NextResponse.json({ records: created });
}
