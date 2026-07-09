"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  ClipboardList,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Gauge,
  GraduationCap,
  History,
  LayoutDashboard,
  Library,
  PanelLeft,
  RefreshCcw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Upload,
  X
} from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CurriculumSnapshot,
  PlannedUnitModeKey,
  SnapshotClassGroup,
  SnapshotPlannedUnit,
  SnapshotSubject,
  SnapshotUnit,
  SnapshotWarning,
  SubjectPlanningModelKey
} from "@/lib/curriculum/types";
import { cn, ensureArray, formatPercent, toSentence } from "@/lib/utils";

export type ViewKey =
  | "dashboard"
  | "import"
  | "structure"
  | "map"
  | "cycles"
  | "science"
  | "previous"
  | "warnings"
  | "units"
  | "models"
  | "exports"
  | "settings";

type ImportDraft = {
  id?: string;
  title: string;
  subject: string;
  yearGroup?: string | null;
  keyStageOrPhase?: string | null;
  term?: string | null;
  halfTerm?: string | null;
  cycle?: string | null;
  sourceDocumentName?: string | null;
  sourcePageNumber?: number | null;
  unitType: string;
  substantiveTags: string[];
  disciplinaryTags: string[];
  vocabulary: string[];
  notes?: string | null;
  estimatedLessons?: number | null;
  estimatedHours?: number | null;
  assessmentEndpointText?: string | null;
  statutoryObjectiveLinks: string[];
  repetitionAllowed: boolean;
  repeatType?: string | null;
  confidence: number;
};

const navItems: Array<{
  view: ViewKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { view: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { view: "import", label: "Import Curriculum", href: "/import", icon: Upload },
  { view: "structure", label: "School Structure", href: "/structure", icon: GraduationCap },
  { view: "map", label: "Curriculum Map", href: "/map", icon: Boxes },
  { view: "cycles", label: "Cycle A/B Planner", href: "/cycles", icon: RefreshCcw },
  { view: "science", label: "Science Planner", href: "/science", icon: FlaskConical },
  { view: "previous", label: "Previous Coverage", href: "/previous-coverage", icon: History },
  { view: "warnings", label: "Duplication & Gaps", href: "/warnings", icon: ShieldAlert },
  { view: "units", label: "Units Library", href: "/units", icon: Library },
  { view: "models", label: "Subject Models", href: "/models", icon: BookOpen },
  { view: "exports", label: "Exports", href: "/exports", icon: FileDown },
  { view: "settings", label: "Settings", href: "/settings", icon: Settings }
];

const planningModels: Array<{ value: SubjectPlanningModelKey; label: string }> = [
  { value: "FULL_CYCLE_AB", label: "Full Cycle A/B" },
  { value: "MODIFIED_CYCLE_AB", label: "Modified Cycle A/B" },
  { value: "LEAD_YEAR", label: "Lead-year model" },
  { value: "SHARED_THEME_SEPARATE_OUTCOMES", label: "Shared theme, separate outcomes" },
  { value: "SAME_UNIT_DIFFERENT_DEPTH", label: "Same unit, different depth" },
  { value: "PARALLEL_CURRICULUM", label: "Parallel curriculum" },
  { value: "COHORT_ENTITLEMENT", label: "Cohort-entitlement model" },
  { value: "HYBRID", label: "Hybrid model" }
];

const severityTone = {
  INFO: "info",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
} as const;

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function tagValues(unit: SnapshotUnit, kind: string) {
  return unit.tags.filter((tag) => tag.kind === kind).map((tag) => tag.value);
}

function plannedUnitDetails(data: CurriculumSnapshot, planned: SnapshotPlannedUnit) {
  return {
    unit: data.units.find((unit) => unit.id === planned.unitId),
    classGroup: data.classes.find((classGroup) => classGroup.id === planned.classGroupId),
    subject: data.subjects.find((subject) => subject.id === planned.subjectId),
    term: data.terms.find((term) => term.id === planned.termSlotId),
    cycle: data.cycles.find((cycle) => cycle.id === planned.cycleId)
  };
}

function warningsForUnit(data: CurriculumSnapshot, unitId: string) {
  return data.warnings.filter((warning) => warning.unitId === unitId && !warning.dismissedAt);
}

export function CurriculumApp({
  initialData,
  initialView
}: {
  initialData: CurriculumSnapshot;
  initialView: ViewKey;
}) {
  const [data, setData] = React.useState(initialData);
  const [status, setStatus] = React.useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = React.useState<SnapshotUnit | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  async function refresh() {
    const snapshot = await jsonFetch<CurriculumSnapshot>("/api/bootstrap");
    setData(snapshot);
  }

  async function recalculateWarnings() {
    setStatus("Recalculating warnings...");
    await jsonFetch("/api/warnings/recalculate", { method: "POST" });
    await refresh();
    setStatus("Warnings refreshed");
  }

  const activeItem = navItems.find((item) => item.view === initialView) ?? navItems[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r bg-white/92 lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Mixed-Age</p>
                  <p className="text-sm text-muted-foreground">Curriculum Builder</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.view === initialView;
                return (
                  <Link
                    key={item.view}
                    href={item.href}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-700 hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>{data.source === "database" ? "SQLite workspace" : "Demo snapshot"}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-white/94 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                  onClick={() => setMobileNavOpen((open) => !open)}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-lg font-semibold">{activeItem.label}</h1>
                    <Badge tone={data.source === "database" ? "success" : "medium"}>
                      {data.academicYear.label}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{data.school.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status ? <span className="hidden text-sm text-muted-foreground md:inline">{status}</span> : null}
                <Button variant="outline" onClick={recalculateWarnings}>
                  <RefreshCcw className="h-4 w-4" />
                  Refresh warnings
                </Button>
              </div>
            </div>
          </header>

          {mobileNavOpen ? (
            <div className="border-b bg-white p-3 lg:hidden">
              <div className="grid gap-2 sm:grid-cols-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.view}
                      href={item.href}
                      className={cn(
                        "flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium",
                        item.view === initialView
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-slate-700"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="school-grid flex-1 p-4 lg:p-6">
            {initialView === "dashboard" ? (
              <DashboardView data={data} />
            ) : initialView === "import" ? (
              <ImportView data={data} refresh={refresh} setStatus={setStatus} />
            ) : initialView === "structure" ? (
              <StructureView data={data} setData={setData} setStatus={setStatus} />
            ) : initialView === "map" ? (
              <CurriculumMapView
                data={data}
                setData={setData}
                setStatus={setStatus}
                onEditUnit={setSelectedUnit}
              />
            ) : initialView === "cycles" ? (
              <CyclePlannerView data={data} />
            ) : initialView === "science" ? (
              <SciencePlannerView data={data} onEditUnit={setSelectedUnit} />
            ) : initialView === "previous" ? (
              <PreviousCoverageView data={data} refresh={refresh} setStatus={setStatus} />
            ) : initialView === "warnings" ? (
              <WarningsView data={data} refresh={refresh} setStatus={setStatus} />
            ) : initialView === "units" ? (
              <UnitsLibraryView
                data={data}
                setData={setData}
                setStatus={setStatus}
                onEditUnit={setSelectedUnit}
              />
            ) : initialView === "models" ? (
              <SubjectModelsView data={data} setData={setData} setStatus={setStatus} />
            ) : initialView === "exports" ? (
              <ExportsView data={data} />
            ) : (
              <SettingsView data={data} />
            )}
          </div>
        </main>
      </div>

      <UnitEditorDialog
        data={data}
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onSaved={(unit) => {
          setData((current) => ({
            ...current,
            units: current.units.map((item) => (item.id === unit.id ? unit : item))
          }));
          setSelectedUnit(null);
          setStatus("Unit saved");
        }}
      />
    </div>
  );
  return (
    <>
      {/* existing rendered board is already returned above; keep for layout consistency */}
      {/* The board markup was returned above; render AddUnitDialog alongside via portal-like placement */}
      <AddUnitDialog
        open={Boolean(addSlot)}
        onClose={() => setAddSlot(null)}
        search={addSearch}
        setSearch={setAddSearch}
        units={data.units}
        onAdd={async (id: string) => {
          await addUnitToSlot(id);
        }}
        onCreate={async () => {
          await createAndAddNewUnit();
        }}
      />
    </>
  );
}


// Add unit dialog for ClassBoard
// Rendered inside ClassBoard via addSlot state
function AddUnitDialog({
  open,
  onClose,
  search,
  setSearch,
  units,
  onAdd,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  search: string;
  setSearch: (s: string) => void;
  units: SnapshotUnit[];
  onAdd: (unitId: string) => Promise<void>;
  onCreate: () => Promise<void>;
}) {
  const matches = units.filter((u) => {
    const text = [u.title, u.subjectName, u.yearGroupName, ...u.tags.map((t) => t.value)].join(" ").toLowerCase();
    return text.includes(search.toLowerCase());
  });
  return (
    <Dialog
      open={open}
      title="Add unit to slot"
      description="Search the library or create a new unit to add to this slot"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onCreate}>Create & add new unit</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search units..." />
        <div className="max-h-64 overflow-auto">
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching units</p>
          ) : (
            <div className="space-y-2">
              {matches.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{u.title}</p>
                    <p className="text-sm text-muted-foreground">{u.subjectName} — {u.yearGroupName}</p>
                  </div>
                  <div>
                    <Button size="sm" onClick={() => onAdd(u.id)}>
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function DashboardView({ data }: { data: CurriculumSnapshot }) {
  const activeWarnings = data.warnings.filter((warning) => !warning.dismissedAt);
  const highWarnings = activeWarnings.filter((warning) => warning.severity === "HIGH").length;
  const splitBlocks = data.plannedUnits.filter((planned) =>
    ["SPLIT_INPUT", "COHORT_SPECIFIC", "OVERLAY"].includes(planned.mode)
  ).length;

  const subjectCoverage = data.subjects.map((subject) => {
    const unitCount = data.units.filter((unit) => unit.subjectId === subject.id).length;
    const plannedCount = new Set(
      data.plannedUnits
        .filter((planned) => planned.subjectId === subject.id)
        .map((planned) => planned.unitId)
    ).size;
    return {
      subject: subject.name,
      coverage: unitCount ? Math.round((plannedCount / unitCount) * 100) : 0,
      fill: subject.color
    };
  });

  const warningsBySeverity = ["HIGH", "MEDIUM", "LOW", "INFO"].map((severity) => ({
    severity,
    count: activeWarnings.filter((warning) => warning.severity === severity).length
  }));

  const termLoad = data.terms.map((term) => ({
    term: term.shortName,
    units: data.plannedUnits.filter((planned) => planned.termSlotId === term.id).length
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Boxes} label="Planned units" value={data.plannedUnits.length} />
        <MetricCard icon={ShieldAlert} label="Active warnings" value={activeWarnings.length} />
        <MetricCard icon={AlertTriangle} label="High severity" value={highWarnings} />
        <MetricCard icon={Gauge} label="Split blocks" value={splitBlocks} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Coverage By Subject</CardTitle>
            <CardDescription>Scheduled units as a share of the library</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectCoverage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => formatPercent(Number(value))} />
                <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
                  {subjectCoverage.map((entry) => (
                    <Cell key={entry.subject} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warning Severity</CardTitle>
            <CardDescription>Current rules engine output</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={warningsBySeverity}
                  dataKey="count"
                  nameKey="severity"
                  innerRadius={52}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {warningsBySeverity.map((entry) => (
                    <Cell
                      key={entry.severity}
                      fill={
                        entry.severity === "HIGH"
                          ? "#e11d48"
                          : entry.severity === "MEDIUM"
                            ? "#d97706"
                            : entry.severity === "LOW"
                              ? "#059669"
                              : "#0284c7"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit Load By Half Term</CardTitle>
          <CardDescription>Whole-school scheduled blocks</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={termLoad}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="term" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="units" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {activeWarnings.slice(0, 6).map((warning) => (
          <WarningPanel key={warning.id} warning={warning} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WarningPanel({ warning }: { warning: SnapshotWarning }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{warning.subjectName ?? warning.type}</CardTitle>
          <Badge tone={severityTone[warning.severity]}>{warning.severity}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{warning.reason}</p>
        <p className="mt-3 text-sm text-muted-foreground">{warning.suggestedAction}</p>
      </CardContent>
    </Card>
  );
}

function ImportView({
  data,
  refresh,
  setStatus
}: {
  data: CurriculumSnapshot;
  refresh: () => Promise<void>;
  setStatus: (status: string | null) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [documentId, setDocumentId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<ImportDraft[]>([]);
  const [rawPreview, setRawPreview] = React.useState("");

  async function upload() {
    if (!file) return;
    setStatus("Uploading curriculum map...");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/import", { method: "POST", body: formData });
    const result = await response.json();
    setDocumentId(result.documentId);
    setDrafts(result.drafts ?? []);
    setRawPreview(result.rawTextPreview ?? "");
    setStatus("Import review ready");
  }

  async function commit() {
    setStatus("Saving imported units...");
    await jsonFetch("/api/import/commit", {
      method: "POST",
      body: JSON.stringify({ documentId, drafts })
    });
    await refresh();
    setStatus("Imported units saved");
  }

  function updateDraft(index: number, patch: Partial<ImportDraft>) {
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft))
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Upload Base Curriculum</CardTitle>
          <CardDescription>PDF, DOCX, CSV, XLS or XLSX</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              type="file"
              accept=".pdf,.docx,.csv,.xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button onClick={upload} disabled={!file}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {drafts.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Import Review</CardTitle>
                <CardDescription>{drafts.length} editable draft units</CardDescription>
              </div>
              <Button onClick={commit}>
                <Save className="h-4 w-4" />
                Save units
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Title</th>
                    <th className="p-2">Subject</th>
                    <th className="p-2">Year</th>
                    <th className="p-2">Half term</th>
                    <th className="p-2">Cycle</th>
                    <th className="p-2">Content tags</th>
                    <th className="p-2">Skill tags</th>
                    <th className="p-2">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft, index) => (
                    <tr key={draft.id ?? index} className="border-b align-top">
                      <td className="p-2">
                        <Input
                          value={draft.title}
                          onChange={(event) => updateDraft(index, { title: event.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={draft.subject}
                          onChange={(event) => updateDraft(index, { subject: event.target.value })}
                        >
                          {data.subjects.map((subject) => (
                            <option key={subject.id} value={subject.name}>
                              {subject.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select
                          value={draft.yearGroup ?? ""}
                          onChange={(event) =>
                            updateDraft(index, { yearGroup: event.target.value || null })
                          }
                        >
                          <option value="">Unassigned</option>
                          {data.yearGroups.map((yearGroup) => (
                            <option key={yearGroup.id} value={yearGroup.name}>
                              {yearGroup.shortName}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select
                          value={draft.halfTerm ?? ""}
                          onChange={(event) =>
                            updateDraft(index, {
                              halfTerm: event.target.value || null,
                              term: event.target.value.split(" ")[0] || null
                            })
                          }
                        >
                          <option value="">Unassigned</option>
                          {data.terms.map((term) => (
                            <option key={term.id} value={term.name}>
                              {term.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select
                          value={draft.cycle ?? ""}
                          onChange={(event) => updateDraft(index, { cycle: event.target.value || null })}
                        >
                          <option value="">None</option>
                          {data.cycles.map((cycle) => (
                            <option key={cycle.id} value={cycle.name}>
                              {cycle.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-2">
                        <Textarea
                          className="min-h-16"
                          value={draft.substantiveTags.join(", ")}
                          onChange={(event) =>
                            updateDraft(index, {
                              substantiveTags: ensureArray(event.target.value)
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Textarea
                          className="min-h-16"
                          value={draft.disciplinaryTags.join(", ")}
                          onChange={(event) =>
                            updateDraft(index, {
                              disciplinaryTags: ensureArray(event.target.value)
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Badge tone={draft.confidence > 0.65 ? "success" : "medium"}>
                          {formatPercent(draft.confidence * 100)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {rawPreview ? (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Text</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs text-slate-50 scrollbar-thin">
              {rawPreview}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StructureView({
  data,
  setData,
  setStatus
}: {
  data: CurriculumSnapshot;
  setData: React.Dispatch<React.SetStateAction<CurriculumSnapshot>>;
  setStatus: (status: string | null) => void;
}) {
  const [classes, setClasses] = React.useState(data.classes);

  function updateClass(idValue: string, patch: Partial<SnapshotClassGroup>) {
    setClasses((current) =>
      current.map((classGroup) =>
        classGroup.id === idValue ? { ...classGroup, ...patch } : classGroup
      )
    );
  }

  function toggleYearGroup(classId: string, yearGroupId: string) {
    setClasses((current) =>
      current.map((classGroup) => {
        if (classGroup.id !== classId) return classGroup;
        const exists = classGroup.yearGroups.some((yearGroup) => yearGroup.id === yearGroupId);
        const nextYearGroups = exists
          ? classGroup.yearGroups.filter((yearGroup) => yearGroup.id !== yearGroupId)
          : [
              ...classGroup.yearGroups,
              data.yearGroups.find((yearGroup) => yearGroup.id === yearGroupId)!
            ].sort((left, right) => left.sortOrder - right.sortOrder);
        return { ...classGroup, yearGroups: nextYearGroups, isMixedAge: nextYearGroups.length > 1 };
      })
    );
  }

  async function saveClass(classGroup: SnapshotClassGroup) {
    setStatus("Saving class...");
    const body = {
      id: classGroup.id.startsWith("new-") ? undefined : classGroup.id,
      name: classGroup.name,
      teacherName: classGroup.teacherName,
      notes: classGroup.notes,
      yearGroupIds: classGroup.yearGroups.map((yearGroup) => yearGroup.id),
      isProtected: classGroup.isProtected
    };
    if (body.id) {
      await jsonFetch("/api/classes", { method: "PATCH", body: JSON.stringify(body) });
    } else {
      await jsonFetch("/api/classes", { method: "POST", body: JSON.stringify(body) });
    }
    const snapshot = await jsonFetch<CurriculumSnapshot>("/api/bootstrap");
    setData(snapshot);
    setClasses(snapshot.classes);
    setStatus("Class saved");
  }

  const overlapWarnings = data.warnings.filter(
    (warning) => warning.type === "WEAK_ALIGNMENT" && warning.reason.includes("appears in")
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {classes.map((classGroup) => (
          <Card key={classGroup.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Input
                  value={classGroup.name}
                  onChange={(event) => updateClass(classGroup.id, { name: event.target.value })}
                  className="font-semibold"
                />
                <Button size="icon" variant="outline" aria-label="Save class" onClick={() => saveClass(classGroup)}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Teacher"
                value={classGroup.teacherName ?? ""}
                onChange={(event) => updateClass(classGroup.id, { teacherName: event.target.value })}
              />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {data.yearGroups.map((yearGroup) => {
                  const checked = classGroup.yearGroups.some((item) => item.id === yearGroup.id);
                  return (
                    <button
                      key={yearGroup.id}
                      type="button"
                      className={cn(
                        "flex min-h-9 items-center justify-center rounded-md border px-2 text-sm transition",
                        checked ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted"
                      )}
                      onClick={() => toggleYearGroup(classGroup.id, yearGroup.id)}
                    >
                      {yearGroup.shortName}
                    </button>
                  );
                })}
              </div>
              <Textarea
                value={classGroup.notes ?? ""}
                onChange={(event) => updateClass(classGroup.id, { notes: event.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <Badge tone={classGroup.isMixedAge ? "medium" : "success"}>
                  {classGroup.isMixedAge ? "Mixed age" : "Single age"}
                </Badge>
                {classGroup.isProtected ? <Badge tone="info">Protected</Badge> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() =>
          setClasses((current) => [
            ...current,
            {
              id: `new-${Date.now()}`,
              name: "New class",
              teacherName: "",
              notes: "",
              isMixedAge: false,
              isProtected: false,
              yearGroups: [data.yearGroups[0]]
            }
          ])
        }
      >
        <GraduationCap className="h-4 w-4" />
        Add class
      </Button>

      {overlapWarnings.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {overlapWarnings.map((warning) => (
            <WarningPanel key={warning.id} warning={warning} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CurriculumMapView({
  data,
  setData,
  setStatus,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  setData: React.Dispatch<React.SetStateAction<CurriculumSnapshot>>;
  setStatus: (status: string | null) => void;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  React.useEffect(() => {
    const handler = () => {
      (async () => {
        try {
          setStatus("Refreshing map...");
          const snapshot = await jsonFetch<CurriculumSnapshot>("/api/bootstrap");
          setData(snapshot);
        } catch (err) {
          // noop
        } finally {
          setStatus(null);
        }
      })();
    };
    window.addEventListener("curriculum:refresh", handler as EventListener);
    return () => window.removeEventListener("curriculum:refresh", handler as EventListener);
  }, [setData, setStatus]);

  const [mode, setMode] = React.useState<
    "whole" | "class" | "year" | "subject" | "cycle-a" | "cycle-b" | "science" | "previous" | "warnings"
  >("class");
  const [classId, setClassId] = React.useState(data.classes[0]?.id ?? "");
  const [yearGroupId, setYearGroupId] = React.useState(data.yearGroups[2]?.id ?? data.yearGroups[0]?.id ?? "");
  const [subjectId, setSubjectId] = React.useState(data.subjects[0]?.id ?? "");

  async function movePlannedUnit(event: DragEndEvent) {
    const plannedId = event.active.data.current?.plannedId as string | undefined;
    const overData = event.over?.data.current as
      | { classGroupId: string; termSlotId: string }
      | undefined;
    if (!plannedId || !overData) return;

    setData((current) => ({
      ...current,
      plannedUnits: current.plannedUnits.map((planned) =>
        planned.id === plannedId
          ? {
              ...planned,
              classGroupId: overData.classGroupId,
              termSlotId: overData.termSlotId
            }
          : planned
      )
    }));
    setStatus("Moving unit...");
    await jsonFetch("/api/planned-units", {
      method: "PATCH",
      body: JSON.stringify({
        id: plannedId,
        classGroupId: overData.classGroupId,
        termSlotId: overData.termSlotId
      })
    });
    setStatus("Map updated");
  }

  const selectedClass = data.classes.find((classGroup) => classGroup.id === classId) ?? data.classes[0];
  const selectedSubject = data.subjects.find((subject) => subject.id === subjectId) ?? data.subjects[0];
  const selectedYearGroup =
    data.yearGroups.find((yearGroup) => yearGroup.id === yearGroupId) ?? data.yearGroups[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          ["whole", "Whole school"],
          ["class", "Class"],
          ["year", "Year group"],
          ["subject", "Subject"],
          ["cycle-a", "Cycle A"],
          ["cycle-b", "Cycle B"],
          ["science", "Science"],
          ["previous", "Previous"],
          ["warnings", "Warnings"]
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={mode === value ? "default" : "outline"}
            onClick={() => setMode(value as typeof mode)}
          >
            {label}
          </Button>
        ))}
      </div>

      {mode === "class" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Class View</CardTitle>
                <CardDescription>Subjects by half term</CardDescription>
              </div>
              <Select value={classId} onChange={(event) => setClassId(event.target.value)} className="md:w-64">
                {data.classes.map((classGroup) => (
                  <option key={classGroup.id} value={classGroup.id}>
                    {classGroup.name}
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selectedClass ? (
              <DndContext onDragEnd={movePlannedUnit}>
                <ClassBoard
                  data={data}
                  classGroup={selectedClass}
                  onEditUnit={onEditUnit}
                />
              </DndContext>
            ) : null}
          </CardContent>
        </Card>
      ) : mode === "whole" ? (
        <WholeSchoolOverview data={data} onEditUnit={onEditUnit} />
      ) : mode === "year" ? (
        <YearGroupView
          data={data}
          yearGroup={selectedYearGroup}
          onYearGroupChange={setYearGroupId}
          onEditUnit={onEditUnit}
        />
      ) : mode === "subject" ? (
        <SubjectView
          data={data}
          subject={selectedSubject}
          onSubjectChange={setSubjectId}
          onEditUnit={onEditUnit}
        />
      ) : mode === "cycle-a" || mode === "cycle-b" ? (
        <CycleFilteredMap data={data} cycleName={mode === "cycle-a" ? "Cycle A" : "Cycle B"} />
      ) : mode === "science" ? (
        <SciencePlannerView data={data} onEditUnit={onEditUnit} />
      ) : mode === "previous" ? (
        <PreviousCoverageMini data={data} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.warnings.map((warning) => (
            <WarningPanel key={warning.id} warning={warning} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassBoard({
  data,
  classGroup,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  classGroup: SnapshotClassGroup;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  const [addSlot, setAddSlot] = React.useState<{ classGroupId: string; termSlotId: string } | null>(null);
  const [addSearch, setAddSearch] = React.useState("");

  async function addUnitToSlot(unitId: string) {
    if (!addSlot) return;
    const { classGroupId, termSlotId } = addSlot;
    await jsonFetch("/api/planned-units", {
      method: "POST",
      body: JSON.stringify({
        unitId,
        classGroupId,
        termSlotId,
        subjectId: data.units.find((u) => u.id === unitId)?.subjectId ?? data.subjects[0]?.id,
        mode: "SHARED",
        assignedYearGroupIds:
          data.classes.find((c) => c.id === classGroupId)?.yearGroups.map((y) => y.id) ?? [],
        position:
          data.plannedUnits.filter((planned) => planned.classGroupId === classGroupId && planned.termSlotId === termSlotId).length,
        notes: null
      })
    });
    const snapshot = await jsonFetch<CurriculumSnapshot>("/api/bootstrap");
    // update parent data via event - mutate local for immediacy
    // (CurriculumMapView will re-render when parent data updates because snapshot is fetched there)
    // but here we just close the dialog and rely on parent to refresh when needed
    setAddSlot(null);
    // update global snapshot by navigating parent refresh: use window.location hack to trigger reload? Instead, call an event.
    // Simpler: request parent to refresh by dispatching a custom event that CurriculumMapView listens to.
    window.dispatchEvent(new CustomEvent("curriculum:refresh"));
  }

  async function createAndAddNewUnit() {
    if (!addSlot) return;
    const subjectId = data.subjects[0]?.id;
    if (!subjectId) return;
    const unit = await jsonFetch<SnapshotUnit>("/api/units", {
      method: "POST",
      body: JSON.stringify({
        title: "New editable unit",
        subjectId,
        unitType: "unit",
        vocabulary: [],
        statutoryObjectiveLinks: [],
        repetitionAllowed: false,
        tags: []
      })
    });
    await addUnitToSlot(unit.id);
  }

  return (
    <>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[1100px]">
        <div className="grid grid-cols-[160px_repeat(6,minmax(145px,1fr))] border-b text-sm font-medium text-muted-foreground">
          <div className="p-2">Subject</div>
          {data.terms.map((term) => (
            <div key={term.id} className="p-2">
              {term.name}
            </div>
          ))}
        </div>
        {data.subjects.map((subject) => (
          <div
            key={subject.id}
            className="grid min-h-36 grid-cols-[160px_repeat(6,minmax(145px,1fr))] border-b"
          >
            <div className="flex items-center gap-2 p-2 text-sm font-semibold">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              {subject.name}
            </div>
            {data.terms.map((term) => {
              const planned = data.plannedUnits.filter(
                (item) =>
                  item.classGroupId === classGroup.id &&
                  item.subjectId === subject.id &&
                  item.termSlotId === term.id
              );
              return (
                <BoardCell
                  key={`${subject.id}-${term.id}`}
                  data={data}
                  classGroupId={classGroup.id}
                  termSlotId={term.id}
                  plannedUnits={planned}
                  onEditUnit={onEditUnit}
                  onOpenAddSlot={(slot) => setAddSlot(slot)}
                />
              );
            })}
          </div>
        ))}
        </div>
      </div>
      <AddUnitDialog
        open={Boolean(addSlot)}
        onClose={() => setAddSlot(null)}
        search={addSearch}
        setSearch={setAddSearch}
        units={data.units}
        onAdd={async (id: string) => {
          await addUnitToSlot(id);
        }}
        onCreate={async () => {
          await createAndAddNewUnit();
        }}
      />
    </>
  );
}

function BoardCell({
  data,
  classGroupId,
  termSlotId,
  plannedUnits,
  onEditUnit
  ,
  onOpenAddSlot
}: {
  data: CurriculumSnapshot;
  classGroupId: string;
  termSlotId: string;
  plannedUnits: SnapshotPlannedUnit[];
  onEditUnit: (unit: SnapshotUnit) => void;
  onOpenAddSlot: (slot: { classGroupId: string; termSlotId: string }) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${classGroupId}:${termSlotId}`,
    data: { classGroupId, termSlotId }
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-36 border-l bg-white/72 p-2 transition",
        isOver ? "bg-secondary" : "hover:bg-slate-50"
      )}
    >
      <div className="space-y-2">
        {plannedUnits.length === 0 ? (
          <div className="flex items-center justify-center">
            <Button size="sm" onClick={() => onOpenAddSlot({ classGroupId, termSlotId })}>
              + Add unit
            </Button>
          </div>
        ) : (
          plannedUnits.map((planned) => {
            const unit = data.units.find((item) => item.id === planned.unitId);
            if (!unit) return null;
            return (
              <DraggableUnitCard
                key={planned.id}
                data={data}
                planned={planned}
                unit={unit}
                onEditUnit={onEditUnit}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function DraggableUnitCard({
  data,
  planned,
  unit,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  planned: SnapshotPlannedUnit;
  unit: SnapshotUnit;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: planned.id,
    data: { plannedId: planned.id }
  });
  const style = {
    transform: CSS.Translate.toString(transform)
  };
  const warnings = warningsForUnit(data, unit.id);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-white p-2 text-left shadow-sm transition",
        isDragging ? "z-20 opacity-70 shadow-soft" : ""
      )}
    >
      <button
        type="button"
        className="w-full cursor-grab text-left"
        {...listeners}
        {...attributes}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug">{unit.title}</p>
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: unit.subjectColor }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge tone="muted">{planned.mode.replace(/_/g, " ")}</Badge>
          {warnings.slice(0, 2).map((warning) => (
            <Badge key={warning.id} tone={severityTone[warning.severity]}>
              {warning.type.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      </button>
      <Button className="mt-2 w-full" variant="ghost" size="sm" onClick={() => onEditUnit(unit)}>
        <FileText className="h-4 w-4" />
        Edit
      </Button>
    </div>
  );
}

function WholeSchoolOverview({
  data,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Whole-School Overview</CardTitle>
        <CardDescription>Class blocks by half term</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Class</th>
                {data.terms.map((term) => (
                  <th key={term.id} className="p-2">
                    {term.shortName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.classes.map((classGroup) => (
                <tr key={classGroup.id} className="border-b align-top">
                  <td className="p-2 font-semibold">{classGroup.name}</td>
                  {data.terms.map((term) => {
                    const planned = data.plannedUnits.filter(
                      (item) => item.classGroupId === classGroup.id && item.termSlotId === term.id
                    );
                    return (
                      <td key={term.id} className="p-2">
                        <div className="space-y-2">
                          {planned.slice(0, 4).map((item) => {
                            const unit = data.units.find((unitItem) => unitItem.id === item.unitId);
                            if (!unit) return null;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className="block w-full rounded-md border bg-white px-2 py-1 text-left text-xs hover:bg-muted"
                                onClick={() => onEditUnit(unit)}
                              >
                                <span
                                  className="mr-1 inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: unit.subjectColor }}
                                />
                                {unit.title}
                              </button>
                            );
                          })}
                          {planned.length > 4 ? (
                            <Badge tone="muted">+{planned.length - 4} more</Badge>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function YearGroupView({
  data,
  yearGroup,
  onYearGroupChange,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  yearGroup: CurriculumSnapshot["yearGroups"][number];
  onYearGroupChange: (id: string) => void;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  const planned = data.plannedUnits.filter((item) => item.assignedYearGroupIds.includes(yearGroup.id));
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Year-Group View</CardTitle>
            <CardDescription>{yearGroup.name}</CardDescription>
          </div>
          <Select value={yearGroup.id} onChange={(event) => onYearGroupChange(event.target.value)} className="md:w-48">
            {data.yearGroups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {planned.map((item) => {
            const { unit, classGroup, term } = plannedUnitDetails(data, item);
            if (!unit) return null;
            return (
              <button
                key={item.id}
                type="button"
                className="rounded-lg border bg-white p-3 text-left shadow-sm hover:bg-muted"
                onClick={() => onEditUnit(unit)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{unit.title}</p>
                  <Badge tone="muted">{term?.shortName}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{classGroup?.name}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tagValues(unit, "substantive").slice(0, 3).map((tag) => (
                    <Badge key={tag} tone="info">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectView({
  data,
  subject,
  onSubjectChange,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  subject: SnapshotSubject;
  onSubjectChange: (id: string) => void;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  const planned = data.plannedUnits.filter((item) => item.subjectId === subject.id);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Subject View</CardTitle>
            <CardDescription>{subject.name}</CardDescription>
          </div>
          <Select value={subject.id} onChange={(event) => onSubjectChange(event.target.value)} className="md:w-56">
            {data.subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {planned.map((item) => {
            const { unit, classGroup, term, cycle } = plannedUnitDetails(data, item);
            if (!unit) return null;
            return (
              <button
                key={item.id}
                type="button"
                className="rounded-lg border bg-white p-3 text-left shadow-sm hover:bg-muted"
                onClick={() => onEditUnit(unit)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{unit.title}</p>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {classGroup?.name} · {term?.name} · {cycle?.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone="muted">{item.mode.replace(/_/g, " ")}</Badge>
                  {warningsForUnit(data, unit.id).slice(0, 1).map((warning) => (
                    <Badge key={warning.id} tone={severityTone[warning.severity]}>
                      {warning.severity}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CycleFilteredMap({ data, cycleName }: { data: CurriculumSnapshot; cycleName: string }) {
  const cycle = data.cycles.find((item) => item.name === cycleName);
  const planned = data.plannedUnits.filter((item) => item.cycleId === cycle?.id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{cycleName}</CardTitle>
        <CardDescription>{cycle?.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {data.classes.map((classGroup) => (
            <div key={classGroup.id} className="rounded-lg border bg-white p-3">
              <h3 className="font-semibold">{classGroup.name}</h3>
              <div className="mt-3 space-y-2">
                {planned
                  .filter((item) => item.classGroupId === classGroup.id)
                  .map((item) => {
                    const unit = data.units.find((unitItem) => unitItem.id === item.unitId);
                    const term = data.terms.find((termItem) => termItem.id === item.termSlotId);
                    return (
                      <div key={item.id} className="rounded-md border p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span>{unit?.title}</span>
                          <Badge tone="muted">{term?.shortName}</Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CyclePlannerView({ data }: { data: CurriculumSnapshot }) {
  const cycleA = data.cycles.find((cycle) => cycle.name === "Cycle A");
  const cycleB = data.cycles.find((cycle) => cycle.name === "Cycle B");
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {[cycleA, cycleB].map((cycle) => (
          <Card key={cycle?.id ?? "missing"}>
            <CardHeader>
              <CardTitle>{cycle?.name}</CardTitle>
              <CardDescription>{cycle?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.classes.map((classGroup) => {
                  const planned = data.plannedUnits.filter(
                    (item) => item.classGroupId === classGroup.id && item.cycleId === cycle?.id
                  );
                  return (
                    <div key={classGroup.id} className="rounded-lg border bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{classGroup.name}</p>
                        <Badge tone={classGroup.isProtected ? "info" : "muted"}>
                          {classGroup.yearGroups.map((yearGroup) => yearGroup.shortName).join("/")}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {planned.map((item) => {
                          const unit = data.units.find((unitItem) => unitItem.id === item.unitId);
                          return unit ? (
                            <Badge key={item.id} tone="default">
                              {unit.title}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SciencePlannerView({
  data,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  const science = data.subjects.find((subject) => subject.name === "Science");
  const scienceWarnings = data.warnings.filter((warning) => warning.subjectName === "Science");
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Science Entitlement</CardTitle>
          <CardDescription>{science?.rationale}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Class</th>
                  {data.terms.map((term) => (
                    <th key={term.id} className="p-2">
                      {term.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.classes.map((classGroup) => (
                  <tr key={classGroup.id} className="border-b align-top">
                    <td className="p-2 font-semibold">{classGroup.name}</td>
                    {data.terms.map((term) => {
                      const planned = data.plannedUnits.find(
                        (item) =>
                          item.classGroupId === classGroup.id &&
                          item.termSlotId === term.id &&
                          item.subjectId === science?.id
                      );
                      const unit = planned ? data.units.find((item) => item.id === planned.unitId) : null;
                      const warnings = unit ? warningsForUnit(data, unit.id) : [];
                      return (
                        <td key={term.id} className="p-2">
                          {unit ? (
                            <button
                              type="button"
                              className="w-full rounded-lg border bg-white p-2 text-left hover:bg-muted"
                              onClick={() => onEditUnit(unit)}
                            >
                              <p className="font-medium">{unit.title}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                <Badge tone="muted">{planned?.mode.replace(/_/g, " ")}</Badge>
                                {warnings.map((warning) => (
                                  <Badge key={warning.id} tone={severityTone[warning.severity]}>
                                    {warning.type.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            </button>
                          ) : (
                            <Badge tone="medium">Gap</Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {scienceWarnings.map((warning) => (
          <WarningPanel key={warning.id} warning={warning} />
        ))}
      </div>
    </div>
  );
}

function PreviousCoverageMini({ data }: { data: CurriculumSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous Coverage View</CardTitle>
        <CardDescription>{data.previousCoverage.length} records</CardDescription>
      </CardHeader>
      <CardContent>
        <PreviousCoverageTable data={data} />
      </CardContent>
    </Card>
  );
}

function PreviousCoverageView({
  data,
  refresh,
  setStatus
}: {
  data: CurriculumSnapshot;
  refresh: () => Promise<void>;
  setStatus: (status: string | null) => void;
}) {
  const [bulk, setBulk] = React.useState("");

  function parseBulk() {
    return bulk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [cohortName, className, subjectName, unitTitle, tags, status, confidence, notes] =
          line.split(/\t|,/).map((item) => item.trim());
        const yearGroup = data.yearGroups.find(
          (item) => item.name.toLowerCase() === cohortName?.toLowerCase() || item.shortName.toLowerCase() === cohortName?.toLowerCase()
        );
        const classGroup = data.classes.find(
          (item) => item.name.toLowerCase() === className?.toLowerCase()
        );
        const subject = data.subjects.find(
          (item) => item.name.toLowerCase() === subjectName?.toLowerCase()
        );
        if (!yearGroup || !subject || !unitTitle) return null;
        return {
          cohortYearGroupId: yearGroup.id,
          classGroupId: classGroup?.id ?? null,
          subjectId: subject.id,
          unitTitle,
          contentTags: ensureArray(tags),
          coverageStatus:
            status === "missed"
              ? "missed"
              : status === "partial" || status === "partially_covered"
                ? "partially_covered"
                : "fully_covered",
          assessmentConfidence: confidence || "unknown",
          notes: notes || null
        };
      })
      .filter(Boolean);
  }

  async function saveBulk() {
    const records = parseBulk();
    setStatus("Saving previous coverage...");
    await jsonFetch("/api/previous-coverage", {
      method: "POST",
      body: JSON.stringify({ records })
    });
    await refresh();
    setBulk("");
    setStatus("Previous coverage saved");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Paste</CardTitle>
          <CardDescription>Cohort, class, subject, unit, tags, status, confidence, notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={bulk}
            onChange={(event) => setBulk(event.target.value)}
            placeholder="Year 4, Year 3/Year 4, History, Ancient Greece, Ancient Greece; civilisation, fully_covered, medium, secure"
          />
          <Button onClick={saveBulk} disabled={!bulk.trim()}>
            <Save className="h-4 w-4" />
            Save records
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Previous Coverage Records</CardTitle>
          <CardDescription>{data.previousCoverage.length} cohort records</CardDescription>
        </CardHeader>
        <CardContent>
          <PreviousCoverageTable data={data} />
        </CardContent>
      </Card>
    </div>
  );
}

function PreviousCoverageTable({ data }: { data: CurriculumSnapshot }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2">Cohort</th>
            <th className="p-2">Class</th>
            <th className="p-2">Subject</th>
            <th className="p-2">Unit</th>
            <th className="p-2">Tags</th>
            <th className="p-2">Status</th>
            <th className="p-2">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {data.previousCoverage.map((record) => (
            <tr key={record.id} className="border-b">
              <td className="p-2 font-medium">{record.cohortYearGroupName}</td>
              <td className="p-2">{record.classGroupName}</td>
              <td className="p-2">{record.subjectName}</td>
              <td className="p-2">{record.unitTitle}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-1">
                  {record.contentTags.map((tag) => (
                    <Badge key={tag} tone="info">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="p-2">{record.coverageStatus.replace(/_/g, " ")}</td>
              <td className="p-2">{record.assessmentConfidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarningsView({
  data,
  refresh,
  setStatus
}: {
  data: CurriculumSnapshot;
  refresh: () => Promise<void>;
  setStatus: (status: string | null) => void;
}) {
  const [severity, setSeverity] = React.useState("ALL");
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const warnings = data.warnings.filter(
    (warning) => severity === "ALL" || warning.severity === severity
  );

  async function overrideWarning(warning: SnapshotWarning) {
    setStatus("Saving override...");
    await jsonFetch("/api/warnings", {
      method: "PATCH",
      body: JSON.stringify({ id: warning.id, overrideNote: notes[warning.id] })
    });
    await refresh();
    setStatus("Override saved");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-48">
          <option value="ALL">All severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </Select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {warnings.map((warning) => (
          <Card key={warning.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm">{warning.type.replace(/_/g, " ")}</CardTitle>
                <Badge tone={severityTone[warning.severity]}>{warning.severity}</Badge>
              </div>
              <CardDescription>
                {warning.affectedCohort ?? "Whole school"} · {warning.subjectName ?? "All subjects"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{warning.reason}</p>
              <p className="text-sm text-muted-foreground">{warning.suggestedAction}</p>
              {warning.dismissedAt ? (
                <Badge tone="success">Overridden: {warning.overrideNote}</Badge>
              ) : (
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    value={notes[warning.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [warning.id]: event.target.value }))
                    }
                    placeholder="Override note"
                  />
                  <Button
                    variant="outline"
                    disabled={(notes[warning.id] ?? "").trim().length < 3}
                    onClick={() => overrideWarning(warning)}
                  >
                    <Check className="h-4 w-4" />
                    Override
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UnitsLibraryView({
  data,
  setData,
  setStatus,
  onEditUnit
}: {
  data: CurriculumSnapshot;
  setData: React.Dispatch<React.SetStateAction<CurriculumSnapshot>>;
  setStatus: (status: string | null) => void;
  onEditUnit: (unit: SnapshotUnit) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [subject, setSubject] = React.useState("ALL");
  const [selectedUnitForPlacement, setSelectedUnitForPlacement] = React.useState<SnapshotUnit | null>(null);
  const [placementClassId, setPlacementClassId] = React.useState(data.classes[0]?.id ?? "");
  const [placementTermId, setPlacementTermId] = React.useState(data.terms[0]?.id ?? "");
  const [placementMode, setPlacementMode] = React.useState<PlannedUnitModeKey>("SHARED");
  const [placementNotes, setPlacementNotes] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"title" | "subject" | "year" | "cycle" | "tags" | "warnings">("title");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const filtered = data.units.filter((unit) => {
    const text = [unit.title, unit.subjectName, unit.yearGroupName, ...unit.tags.map((tag) => tag.value)]
      .join(" ")
      .toLowerCase();
    return text.includes(search.toLowerCase()) && (subject === "ALL" || unit.subjectId === subject);
  });

  const sorted = React.useMemo(() => {
    const copy = [...filtered];
    function fieldValue(unit: SnapshotUnit, key: string) {
      switch (key) {
        case "title":
          return unit.title ?? "";
        case "subject":
          return unit.subjectName ?? "";
        case "year":
          return unit.yearGroupName ?? "";
        case "cycle":
          return unit.cycle ?? "";
        case "tags":
          return unit.tags.map((t) => t.value).join(", ") ?? "";
        default:
          return "";
      }
    }

    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "warnings") {
        const wa = warningsForUnit(data, a.id).length;
        const wb = warningsForUnit(data, b.id).length;
        return (wa - wb) * dir;
      }
      const va = String(fieldValue(a, sortBy)).toLowerCase();
      const vb = String(fieldValue(b, sortBy)).toLowerCase();
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * dir;
    });
    return copy;
  }, [filtered, sortBy, sortDir, data]);

  async function createManualUnit() {
    const subjectId = data.subjects[0]?.id;
    if (!subjectId) return;
    setStatus("Creating unit...");
    await jsonFetch("/api/units", {
      method: "POST",
      body: JSON.stringify({
        title: "New editable unit",
        subjectId,
        unitType: "unit",
        vocabulary: [],
        statutoryObjectiveLinks: [],
        repetitionAllowed: false,
        tags: []
      })
    });
    const snapshot = await jsonFetch<CurriculumSnapshot>("/api/bootstrap");
    setData(snapshot);
    setStatus("Unit created");
  }

  async function addToCurriculum(unit: SnapshotUnit) {
    if (!placementClassId || !placementTermId) {
      setStatus("Choose a class and half term first");
      return;
    }

    setStatus("Adding unit to curriculum...");
    await jsonFetch("/api/planned-units", {
      method: "POST",
      body: JSON.stringify({
        unitId: unit.id,
        classGroupId: placementClassId,
        termSlotId: placementTermId,
        subjectId: unit.subjectId,
        mode: placementMode,
        assignedYearGroupIds: data.classes.find((classGroup) => classGroup.id === placementClassId)?.yearGroups.map((yearGroup) => yearGroup.id) ?? [],
        position: data.plannedUnits.filter((planned) => planned.classGroupId === placementClassId && planned.termSlotId === placementTermId).length,
        notes: placementNotes || null
      })
    });
    const snapshot = await jsonFetch<CurriculumSnapshot>("/api/bootstrap");
    setData(snapshot);
    setSelectedUnitForPlacement(null);
    setPlacementNotes("");
    setStatus("Unit added to curriculum");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Units Library</CardTitle>
              <CardDescription>{filtered.length} visible units</CardDescription>
            </div>
            <Button onClick={createManualUnit}>
              <FileText className="h-4 w-4" />
              Add unit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_420px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search units, tags, subjects"
              />
            </div>
            <div className="flex gap-2">
              <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option value="ALL">All subjects</option>
              {data.subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="title">Sort: Title</option>
                <option value="subject">Sort: Subject</option>
                <option value="year">Sort: Year</option>
                <option value="cycle">Sort: Cycle</option>
                <option value="tags">Sort: Tags</option>
                <option value="warnings">Sort: Warnings</option>
              </Select>
              <Select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Unit</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Year</th>
                  <th className="p-2">Cycle</th>
                  <th className="p-2">Tags</th>
                  <th className="p-2">Warnings</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((unit) => (
                  <tr key={unit.id} className="border-b align-top">
                    <td className="p-2 font-medium">{unit.title}</td>
                    <td className="p-2">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: unit.subjectColor }}
                      />
                      {unit.subjectName}
                    </td>
                    <td className="p-2">{unit.yearGroupName}</td>
                    <td className="p-2">{unit.cycle}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {unit.tags.slice(0, 4).map((tag) => (
                          <Badge key={`${tag.kind}-${tag.value}`} tone="muted">
                            {tag.value}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {warningsForUnit(data, unit.id).map((warning) => (
                          <Badge key={warning.id} tone={severityTone[warning.severity]}>
                            {warning.severity}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedUnitForPlacement(unit)}>
                          <Boxes className="h-4 w-4" />
                          Add to curriculum
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEditUnit(unit)}>
                          <FileText className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedUnitForPlacement)}
        title="Add unit to curriculum"
        description="Choose where this unit should appear in the curriculum map."
        onOpenChange={(open) => {
          if (!open) setSelectedUnitForPlacement(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedUnitForPlacement(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUnitForPlacement && addToCurriculum(selectedUnitForPlacement)}
              disabled={!placementClassId || !placementTermId}
            >
              Add to curriculum
            </Button>
          </div>
        }
      >
        {selectedUnitForPlacement ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Unit</p>
              <p className="text-sm text-muted-foreground">{selectedUnitForPlacement.title}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <Select value={placementClassId} onChange={(event) => setPlacementClassId(event.target.value)}>
                  {data.classes.map((classGroup) => (
                    <option key={classGroup.id} value={classGroup.id}>
                      {classGroup.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Half term</label>
                <Select value={placementTermId} onChange={(event) => setPlacementTermId(event.target.value)}>
                  {data.terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Placement mode</label>
                <Select
                  value={placementMode}
                  onChange={(event) => setPlacementMode(event.target.value as PlannedUnitModeKey)}
                >
                  <option value="SHARED">Shared</option>
                  <option value="SPLIT_INPUT">Split input</option>
                  <option value="COHORT_SPECIFIC">Cohort specific</option>
                  <option value="OVERLAY">Overlay</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={placementNotes}
                  onChange={(event) => setPlacementNotes(event.target.value)}
                  placeholder="Optional placement notes"
                />
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function SubjectModelsView({
  data,
  setData,
  setStatus
}: {
  data: CurriculumSnapshot;
  setData: React.Dispatch<React.SetStateAction<CurriculumSnapshot>>;
  setStatus: (status: string | null) => void;
}) {
  const [subjects, setSubjects] = React.useState(data.subjects);

  function updateSubject(idValue: string, patch: Partial<SnapshotSubject>) {
    setSubjects((current) =>
      current.map((subject) => (subject.id === idValue ? { ...subject, ...patch } : subject))
    );
  }

  async function saveSubject(subject: SnapshotSubject) {
    setStatus("Saving subject model...");
    await jsonFetch("/api/subject-models", {
      method: "PATCH",
      body: JSON.stringify({
        subjectId: subject.id,
        model: subject.model,
        rationale: subject.rationale
      })
    });
    setData((current) => ({
      ...current,
      subjects: current.subjects.map((item) => (item.id === subject.id ? subject : item))
    }));
    setStatus("Subject model saved");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {subjects.map((subject) => (
        <Card key={subject.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                <CardTitle>{subject.name}</CardTitle>
              </div>
              <Button size="icon" variant="outline" aria-label="Save subject model" onClick={() => saveSubject(subject)}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={subject.model}
              onChange={(event) =>
                updateSubject(subject.id, { model: event.target.value as SubjectPlanningModelKey })
              }
            >
              {planningModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </Select>
            <Textarea
              value={subject.rationale ?? ""}
              onChange={(event) => updateSubject(subject.id, { rationale: event.target.value })}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExportsView({ data }: { data: CurriculumSnapshot }) {
  const exports = [
    {
      href: "/api/export/word",
      title: "Word document",
      description: "Leadership report and curriculum maps",
      icon: FileText
    },
    {
      href: "/api/export/excel",
      title: "Excel workbook",
      description: "Units, classes, cycles, coverage and warnings",
      icon: FileSpreadsheet
    },
    {
      href: "/api/export/pdf",
      title: "PDF report",
      description: "Shareable overview of warnings and models",
      icon: FileDown
    },
    {
      href: "/api/export/json",
      title: "JSON backup",
      description: "Full workspace backup for reimport",
      icon: Download
    }
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {exports.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href}>
              <CardHeader>
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={item.href}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Export
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Export Contents</CardTitle>
          <CardDescription>
            {data.units.length} units, {data.classes.length} classes, {data.warnings.length} warnings
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function SettingsView({ data }: { data: CurriculumSnapshot }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>{data.school.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border bg-white p-3">
            <span className="text-sm font-medium">Autosave</span>
            <Badge tone={data.settings.autosaveEnabled ? "success" : "muted"}>
              {data.settings.autosaveEnabled ? "On" : "Off"}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-white p-3">
            <span className="text-sm font-medium">Import confidence floor</span>
            <Badge tone="info">{formatPercent(data.settings.importConfidenceFloor * 100)}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-white p-3">
            <span className="text-sm font-medium">Data source</span>
            <Badge tone={data.source === "database" ? "success" : "medium"}>
              {data.source}
            </Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Editable Dimensions</CardTitle>
          <CardDescription>
            {data.subjects.length} subjects, {data.yearGroups.length} year groups, {data.terms.length} half terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.subjects.map((subject) => (
              <Badge key={subject.id} tone="muted">
                {subject.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UnitEditorDialog({
  data,
  unit,
  onClose,
  onSaved
}: {
  data: CurriculumSnapshot;
  unit: SnapshotUnit | null;
  onClose: () => void;
  onSaved: (unit: SnapshotUnit) => void;
}) {
  const [draft, setDraft] = React.useState<SnapshotUnit | null>(unit);
  const [tab, setTab] = React.useState("overview");

  React.useEffect(() => {
    setDraft(unit);
    setTab("overview");
  }, [unit]);

  if (!draft) {
    return (
      <Dialog open={false} title="Unit editor" onOpenChange={onClose}>
        <div />
      </Dialog>
    );
  }

  function patch(patchValue: Partial<SnapshotUnit>) {
    setDraft((current) => (current ? { ...current, ...patchValue } : current));
  }

  function updateTag(kind: string, value: string) {
    const currentDraft = draft;
    if (!currentDraft) return;
    patch({
      tags: [
        ...currentDraft.tags.filter((tag) => tag.kind !== kind),
        ...ensureArray(value).map((tagValue) => ({
          kind: kind as SnapshotUnit["tags"][number]["kind"],
          value: tagValue
        }))
      ]
    });
  }

  async function save() {
    const currentDraft = draft;
    if (!currentDraft) return;
    const saved = await jsonFetch<SnapshotUnit>(`/api/units/${currentDraft.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: currentDraft.title,
        subjectId: currentDraft.subjectId,
        yearGroupId: currentDraft.yearGroupId,
        keyStageOrPhase: currentDraft.keyStageOrPhase,
        term: currentDraft.term,
        halfTerm: currentDraft.halfTerm,
        cycle: currentDraft.cycle,
        unitType: currentDraft.unitType,
        vocabulary: currentDraft.vocabulary,
        notes: currentDraft.notes,
        estimatedLessons: currentDraft.estimatedLessons,
        estimatedHours: currentDraft.estimatedHours,
        assessmentEndpointText: currentDraft.assessmentEndpointText,
        statutoryObjectiveLinks: currentDraft.statutoryObjectiveLinks,
        repetitionAllowed: currentDraft.repetitionAllowed,
        repeatType: currentDraft.repeatType,
        tags: currentDraft.tags
      })
    });
    onSaved({
      ...currentDraft,
      ...saved,
      subjectName:
        data.subjects.find((subject) => subject.id === currentDraft.subjectId)?.name ??
        currentDraft.subjectName,
      subjectColor:
        data.subjects.find((subject) => subject.id === currentDraft.subjectId)?.color ??
        currentDraft.subjectColor,
      yearGroupName:
        data.yearGroups.find((yearGroup) => yearGroup.id === currentDraft.yearGroupId)?.name ??
        currentDraft.yearGroupName
    });
  }

  return (
    <Dialog
      open={Boolean(unit)}
      title={draft.title}
      description={`${draft.subjectName} · ${draft.yearGroupName ?? "Unassigned"}`}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          "overview",
          "content",
          "outcomes",
          "vocabulary",
          "assessment",
          "resources",
          "previous",
          "warnings",
          "notes"
        ].map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? "default" : "outline"}
            onClick={() => setTab(item)}
          >
            {toSentence(item)}
          </Button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            <span>Title</span>
            <Input value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Subject</span>
            <Select value={draft.subjectId} onChange={(event) => patch({ subjectId: event.target.value })}>
              {data.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Year group</span>
            <Select
              value={draft.yearGroupId ?? ""}
              onChange={(event) => patch({ yearGroupId: event.target.value || null })}
            >
              <option value="">Unassigned</option>
              {data.yearGroups.map((yearGroup) => (
                <option key={yearGroup.id} value={yearGroup.id}>
                  {yearGroup.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Unit type</span>
            <Input value={draft.unitType} onChange={(event) => patch({ unitType: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Half term</span>
            <Select value={draft.halfTerm ?? ""} onChange={(event) => patch({ halfTerm: event.target.value || null })}>
              <option value="">Unassigned</option>
              {data.terms.map((term) => (
                <option key={term.id} value={term.name}>
                  {term.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Cycle</span>
            <Select value={draft.cycle ?? ""} onChange={(event) => patch({ cycle: event.target.value || null })}>
              <option value="">None</option>
              {data.cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.name}>
                  {cycle.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      ) : tab === "content" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            <span>Substantive content</span>
            <Textarea
              value={tagValues(draft, "substantive").join(", ")}
              onChange={(event) => updateTag("substantive", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Disciplinary skills</span>
            <Textarea
              value={tagValues(draft, "disciplinary").join(", ")}
              onChange={(event) => updateTag("disciplinary", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Concepts</span>
            <Textarea
              value={tagValues(draft, "concept").join(", ")}
              onChange={(event) => updateTag("concept", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Repeat type</span>
            <Select value={draft.repeatType ?? ""} onChange={(event) => patch({ repeatType: event.target.value || null })}>
              <option value="">None</option>
              <option value="genre-only">Genre-only repeat</option>
              <option value="concept repeat">Concept repeat</option>
              <option value="substantive-content repeat">Substantive-content repeat</option>
            </Select>
          </label>
        </div>
      ) : tab === "outcomes" ? (
        <div className="space-y-3">
          {draft.outcomeLadders.length ? (
            draft.outcomeLadders.map((ladder) => (
              <div key={ladder.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{ladder.title}</h3>
                  <Badge tone="info">{ladder.yearGroupName}</Badge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium">Outcomes</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {ladder.outcomes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Grammar</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {ladder.grammar.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Success criteria</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {ladder.successCriteria.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
              No outcome ladders yet.
            </div>
          )}
        </div>
      ) : tab === "vocabulary" ? (
        <Textarea
          value={draft.vocabulary.join(", ")}
          onChange={(event) => patch({ vocabulary: ensureArray(event.target.value) })}
        />
      ) : tab === "assessment" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            <span>Assessment endpoint</span>
            <Textarea
              value={draft.assessmentEndpointText ?? ""}
              onChange={(event) => patch({ assessmentEndpointText: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Statutory links</span>
            <Textarea
              value={draft.statutoryObjectiveLinks.join(", ")}
              onChange={(event) =>
                patch({ statutoryObjectiveLinks: ensureArray(event.target.value) })
              }
            />
          </label>
        </div>
      ) : tab === "previous" ? (
        <PreviousCoverageTable
          data={{
            ...data,
            previousCoverage: data.previousCoverage.filter(
              (record) =>
                record.unitTitle === draft.title ||
                tagValues(draft, "substantive").some((tag) => record.contentTags.includes(tag))
            )
          }}
        />
      ) : tab === "warnings" ? (
        <div className="grid gap-3">
          {warningsForUnit(data, draft.id).map((warning) => (
            <WarningPanel key={warning.id} warning={warning} />
          ))}
        </div>
      ) : tab === "resources" ? (
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p>Source: {draft.sourceDocumentName ?? "Manual"}</p>
          <p>Page: {draft.sourcePageNumber ?? "Not recorded"}</p>
        </div>
      ) : (
        <Textarea value={draft.notes ?? ""} onChange={(event) => patch({ notes: event.target.value })} />
      )}
    </Dialog>
  );
}
