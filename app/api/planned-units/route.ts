import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { plannedUnitUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const parsed = plannedUnitUpdateSchema.parse(await request.json());
  const { id, ...data } = parsed;
  const updated = await prisma.plannedUnit.update({
    where: { id },
    data
  });
  return NextResponse.json(updated);
}
