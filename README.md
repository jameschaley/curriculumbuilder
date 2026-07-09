# Mixed-Age Curriculum Builder

Full-stack Next.js app for building editable mixed-age curriculum plans from imported curriculum maps.

## Stack

- Next.js with TypeScript
- React
- Tailwind CSS
- shadcn-style local UI components
- Prisma ORM with SQLite
- `pdf-parse` for PDF text extraction
- `mammoth` for DOCX text extraction
- `xlsx` for spreadsheet import/export
- `docx` for Word export
- `pdf-lib` for PDF export
- `zod` validation
- `lucide-react` icons
- Recharts dashboard charts

## Run Locally

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open the local URL printed by Next.js.

The repository includes a local `.env` for SQLite development and an `.env.example` copy.

## Main Areas

- Dashboard coverage and warning charts
- Import Curriculum upload and review flow
- School Structure editor for overlapping mixed-age cohorts
- Curriculum Map with draggable class view
- Cycle A/B planner
- Science entitlement planner
- Previous Coverage input and bulk paste
- Duplication & Gaps dashboard with required override notes
- Units Library with detailed unit editor tabs
- Subject Models editor
- Word, Excel, PDF and JSON export routes

## Curriculum Logic

The rules engine lives in `lib/curriculum/rules.ts`. It distinguishes:

- exact duplicate
- likely substantive-content duplicate
- possible concept duplicate
- acceptable genre repeat
- early encounter
- science entitlement gap
- weak alignment
- workload risk

Science is seeded as a cohort-entitlement model and is not forced into Cycle A/B. Each subject has its own editable planning model in the database.

## Import Notes

PDF and document parsing is intentionally imperfect. Uploaded content is turned into editable import drafts, and every field can be corrected before units are saved.

## Seed Data

The seed creates:

- default classes: Reception/Year 1, Year 2/Year 3, Year 3/Year 4, Year 4/Year 5, Year 6
- year groups and half terms
- Cycle A, Cycle B and Annual plans
- subject-specific planning model defaults
- cohort-based science entitlement map
- placeholder curriculum units
- example previous coverage records
- generated duplication, gap and weak-alignment warnings

The sample unit titles are placeholders and do not include copied scheme text.
