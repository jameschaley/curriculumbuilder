import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import { subjectModelUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCurriculumSnapshot();
  return NextResponse.json(snapshot.subjects);
}

export async function PATCH(request: Request) {
  const parsed = subjectModelUpdateSchema.parse(await request.json());
  const model = await prisma.subjectModel.upsert({
    where: { subjectId: parsed.subjectId },
    update: {
      model: parsed.model,
      rationale: parsed.rationale
    },
    create: {
      subjectId: parsed.subjectId,
      model: parsed.model,
      rationale: parsed.rationale
    }
  });
  return NextResponse.json(model);
}
