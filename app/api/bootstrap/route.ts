import { NextResponse } from "next/server";
import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCurriculumSnapshot();
  return NextResponse.json(snapshot);
}
