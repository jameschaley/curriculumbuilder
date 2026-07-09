import { getCurriculumSnapshot } from "@/lib/curriculum/snapshot";
import { CurriculumApp, type ViewKey } from "@/components/curriculum-app";

export async function WorkspacePage({ view }: { view: ViewKey }) {
  const snapshot = await getCurriculumSnapshot();
  return <CurriculumApp initialData={snapshot} initialView={view} />;
}
