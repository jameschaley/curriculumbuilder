import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import { warningOverrideSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCurriculumSnapshot();
  return NextResponse.json(snapshot.warnings);
}

export async function PATCH(request: Request) {
  const parsed = warningOverrideSchema.parse(await request.json());
  const warning = await prisma.warning.update({
    where: { id: parsed.id },
    data: {
      dismissedAt: new Date(),
      overrideNote: parsed.overrideNote
    }
  });
  return NextResponse.json(warning);
}
