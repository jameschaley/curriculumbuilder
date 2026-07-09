import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import { classUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCurriculumSnapshot();
  return NextResponse.json(snapshot.classes);
}

export async function POST(request: Request) {
  const snapshot = await getCurriculumSnapshot();
  const parsed = classUpdateSchema.parse(await request.json());
  const created = await prisma.classGroup.create({
    data: {
      name: parsed.name,
      teacherName: parsed.teacherName,
      notes: parsed.notes,
      isMixedAge: parsed.yearGroupIds.length > 1,
      isProtected: parsed.isProtected,
      academicYearId: snapshot.academicYear.id,
      yearGroups: {
        create: parsed.yearGroupIds.map((yearGroupId) => ({ yearGroupId }))
      }
    },
    include: { yearGroups: { include: { yearGroup: true } } }
  });
  return NextResponse.json(created);
}

export async function PATCH(request: Request) {
  const parsed = classUpdateSchema.extend({ id: classUpdateSchema.shape.id.unwrap() }).parse(await request.json());
  const updated = await prisma.classGroup.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      teacherName: parsed.teacherName,
      notes: parsed.notes,
      isMixedAge: parsed.yearGroupIds.length > 1,
      isProtected: parsed.isProtected,
      yearGroups: {
        deleteMany: {},
        create: parsed.yearGroupIds.map((yearGroupId) => ({ yearGroupId }))
      }
    },
    include: { yearGroups: { include: { yearGroup: true } } }
  });
  return NextResponse.json(updated);
}
