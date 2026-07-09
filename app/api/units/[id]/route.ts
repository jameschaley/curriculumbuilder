import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unitUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = unitUpdateSchema.parse(await request.json());
  const { tags, ...unitData } = body;
  const unit = await prisma.unit.update({
    where: { id: params.id },
    data: {
      ...unitData,
      ...(tags
        ? {
            tags: {
              deleteMany: {},
              create: tags.map((tag) => ({ kind: tag.kind, value: tag.value }))
            }
          }
        : {})
    },
    include: { subject: true, yearGroup: true, tags: true }
  });
  return NextResponse.json(unit);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.unit.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
