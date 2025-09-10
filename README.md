# A11y Logger v4 — Project Overview and API Guide

This document explains the purpose, architecture, data model, and high‑level API contracts of the A11y Logger v4 project.

---

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Key Concepts and Domain](#key-concepts-and-domain)
3. [Architecture Overview](#architecture-overview)
4. [Authentication](#authentication)
5. [Data Model (Relevant Shapes)](#data-model-relevant-shapes)
6. [High‑Level API Design](#high-level-api-design)
   - [VPAT Endpoints (HTTP)](#vpat-endpoints-http)
   - [Client API Wrapper](#client-api-wrapper)
   - [React Query Hooks](#react-query-hooks)
   - [VPAT Row Generation Logic (High Level)](#vpat-row-generation-logic-high-level)
7. [UI Flow (VPAT Drafting)](#ui-flow-vpat-drafting)
8. [Related Technology](#related-technology)
9. [Conventions and Patterns](#conventions-and-patterns)
10. [Adding New Features (Guidance for AI)](#adding-new-features-guidance-for-ai)
11. [Local Development](#local-development)
12. [Deployment](#deployment)
13. [File Index (Selected)](#file-index-selected)

---

## What This Project Does

A11y Logger v4 is an accessibility auditing and documentation system built around:
- Logging and tracking accessibility issues (WCAG‑mapped) within projects and assessments
- AI‑assisted enrichment (summaries, mappings) and documentation generation
- VPAT (Voluntary Product Accessibility Template) authoring from real, linked issues
- Publishing versions of VPATs for compliance stakeholders

The app is a Next.js (React) web app that uses:
- Supabase (Postgres + Auth + RLS) for data and auth
- Next.js Route Handlers (app/api/*) as authenticated API proxy to Supabase
- A client API wrapper (Axios) with React Query hooks on the frontend
- Tailwind UI and shadcn/ui components for UX

The VPAT experience centers on drafting rows for WCAG criteria, optionally generating content based on the current set of open issues mapped to each criterion, then publishing a snapshot as a VPAT version.

## Key Concepts and Domain

- Project: Top‑level container for all assessments and VPATs.
- Assessment: A testing/auditing effort producing Issues.
- Issues: Accessibility findings, with severity and WCAG mapping (criteria codes, e.g., "1.4.3").
- VPAT (Draft): A working document associated with a Project; consists of draft rows per WCAG criterion.
- VPAT Row (Draft): Conformance + Remarks + Related Issues/URLs for one criterion.
- VPAT Version (Published): A snapshot of a VPAT draft at a moment in time, immutable.

## Architecture Overview

- UI: Next.js App Router pages under `app/`. For example, `app/vpats/[vpatId]/page.tsx` renders a VPAT drafting UI, using React Query hooks.
- API Layer: Next.js route handlers under `app/api/**` implement authenticated HTTP endpoints that perform Supabase reads/writes with RLS.
- Client API Wrapper: `lib/api/base.ts` (Axios + Supabase token injection) and `lib/api/vpats.ts` (typed wrapper for VPAT endpoints).
- Data Types: Shared TypeScript models in `types/` (e.g., `types/vpat.ts`).
- Business Logic (Pure): Example — `lib/vpat/generation.ts` implements pure suggestion logic for generating a VPAT row from issues.

## Authentication

- Supabase Auth is used end‑to‑end.
- Client requests hit Next.js API routes with an Authorization bearer token auto‑injected by `BaseApiService` (reads token via Supabase client).
- API routes validate the user via `createClient().auth.getUser()` on each request and enforce access via RLS in Supabase tables/views.

## Data Model (Relevant Shapes)

See `types/vpat.ts` for full details. Highlights:
- Vpat: { id, project_id, title, description, status, created_by, created_at, updated_at, current_version_id }
- VpatRowDraft: { id, vpat_id, wcag_criterion_id, conformance, remarks, related_issue_ids, related_issue_urls, last_generated_at, last_edited_by, updated_at }
- VpatVersion: published snapshot: { id, vpat_id, version_number, published_by, published_at, wcag_scope, criteria_rows, export_artifacts }
- ConformanceValue: "Supports" | "Partially Supports" | "Does Not Support" | "Not Applicable" | "Not Evaluated"

Issue shape (see `types/issue` usage) includes: { id, status, severity, title, url, criteria_codes?: string[], criteria?: { code, ... }[] }

## High‑Level API Design

All endpoints are implemented as Next.js route handlers under `app/api`. The client calls them via `lib/api/vpats.ts` using Axios. Responses are wrapped in `ApiResponse<T>`, defined in `lib/api/base.ts`:
- ApiResponse<T> = { success: boolean; data?: T; error?: string }
- Errors use standardized messages from server responses or network errors.

### VPAT Endpoints (HTTP)
Base path: `/api/vpats`

- POST `/api/vpats`
   - Create a draft VPAT.
   - Body: { projectId: UUID, title: string, description?: string }
   - Returns: Vpat

- GET `/api/vpats?projectId=UUID`
   - List VPATs for a project using view `v_vpat_current`.
   - Returns: { data: VpatCurrentView[], count }

- GET `/api/vpats/[vpatId]`
   - Get a single VPAT by ID.
   - Returns: Vpat

- PUT `/api/vpats/[vpatId]`
   - Update title/description. Only allowed for `status === "draft"`.
   - Body: { title?: string, description?: string | null }
   - Returns: Vpat

- GET `/api/vpats/[vpatId]/rows`
   - Get all draft rows for a VPAT.
   - Returns: VpatRowDraft[]

- PUT `/api/vpats/[vpatId]/rows/[criterionId]`
   - Save (upsert) a specific VPAT row's content.
   - Body: SaveVpatRowRequest = { conformance: ConformanceValue | null, remarks: string | null, related_issue_ids?: UUID[], related_issue_urls?: string[] }
   - Returns: VpatRowDraft

- POST `/api/vpats/[vpatId]/rows/[criterionId]:generate`
   - Generate a VPAT row suggestion based on open issues mapped to the WCAG criterion.
   - Returns: { status: "UPDATED" | "INSERTED" | "SKIPPED", row: VpatRowDraft | null, warning?: string }
   - Behavior: If an existing row already has content (conformance or remarks), generation is skipped to avoid overwriting.

- GET `/api/vpats/[vpatId]/issues-summary`
   - Returns counts of open issues per WCAG code for the VPAT's project.
   - Returns: { data: Array<{ code: string; count: number }>, total: number }

- GET `/api/vpats/[vpatId]/versions`
   - List published versions for the VPAT.
   - Returns: VpatVersion[]

- GET `/api/vpat_versions/[versionId]`
   - Get a specific published version by ID.
   - Returns: VpatVersion

- POST `/api/vpats/[vpatId]:publish`
   - Publish current draft as a new immutable version.
   - Returns: { version_id: UUID, version_number: number, published_at: string }

- POST `/api/vpats/[vpatId]:validate`
   - Validate the draft VPAT server‑side (shape present; enforcement may evolve).
   - Returns: ValidateVpatResponse = { ok: boolean, issues: Array<{ criterionId, code?, message, field? }> }

- GET `/api/vpats/[vpatId]/criteria/[code]/issues`
   - List issue IDs mapped to a WCAG code for the VPAT's project (used by the UI slideshow).
   - Returns: { data: string[], count: number }

Note: Some routes may evolve; consult the actual route handler files in `app/api/vpats/*` for authoritative behavior.

### Client API Wrapper

File: `lib/api/base.ts`
- Provides Axios instance with Supabase auth token injection.
- Standard HTTP helpers: get, post, put, delete, patch.
- Normalizes errors to ApiResponse.

File: `lib/api/vpats.ts`
- Exposes methods matching server endpoints:
   - create(payload)
   - listByProject(projectId)
   - getVpat(vpatId)
   - update(vpatId, patch)
   - getRows(vpatId)
   - saveRow(vpatId, criterionId, payload)
   - validate(vpatId)
   - generateRow(vpatId, criterionId)
   - getIssuesSummary(vpatId)
   - listVersions(vpatId)
   - getVersion(versionId)
   - getIssuesByCriterion(vpatId, code)

### React Query Hooks

File: `lib/query/use-vpat-queries.ts`
- useVpatsList(projectId) → list of VPATs for a project
- useVpatDraft(vpatId) → draft VPAT entity
- useVpatDraftRows(vpatId) → draft rows array
- useSaveVpatRow(vpatId) → mutation for saving one row; invalidates relevant queries
- useGenerateVpatRow(vpatId) → mutation for AI generation; invalidates relevant queries
- useVpatVersions(vpatId) → list published versions
- useGetVersion(versionId) → fetch one published version
- useVpatIssuesSummary(vpatId) → counts per WCAG code
- useVpatIssuesByCriterion(vpatId, code) → issue IDs for slideshow

### VPAT Row Generation Logic (High Level)

File: `lib/vpat/generation.ts`
- Pure function `generateForCriterion({ projectId, criterionCode, issues })` → returns `{ conformance, remarks, related_issue_ids, related_issue_urls, warning? }`.
- Filters provided issues to those open and mapped to the specified criterion.
- Computes a conformance value:
   - No mapped issues → "Supports" (with a warning to verify coverage)
   - Critical/High severity present → "Does Not Support"
   - Otherwise → "Partially Supports"
- Generates concise remarks with sample issue titles.
- Dedupe related IDs and URLs.

File: `app/api/vpats/[vpatId]/rows/[criterionId]:generate/route.ts`
- Orchestrates: resolves project, gathers open issues for project assessments, injects into `generateForCriterion`, applies no‑overwrite guard, updates/inserts draft row accordingly.

## UI Flow (VPAT Drafting)

1. User opens `/vpats/[vpatId]` page (`app/vpats/[vpatId]/page.tsx`).
2. Page loads VPAT draft, rows, and issues summary via hooks.
3. User can:
   - Edit conformance/remarks and Save for each criterion.
   - Open issues slideshow per criterion (uses issuesByCode endpoint).
   - Trigger Generate for a criterion; if row is empty, AI suggestion is written.
4. Warnings surface when no mapped issues are found for a criterion (non‑blocking).
5. When ready, user can publish to create a version (endpoint exists; confirm UI entry point if hidden).

## Related Technology

- Next.js (App Router), React 19
- TanStack React Query v5
- Tailwind CSS and shadcn/ui components
- Supabase (Postgres, Auth, RLS)
- Axios for client HTTP
- Vercel deployment (see `vercel.json`, `next.config.ts`)

## Conventions and Patterns

- API prefix: `/api` handled by Next.js Route Handlers, not a separate server.
- Auth: Always check `getUser()` in server handlers; return 401 if missing.
- Error Handling: Catch and log, return 500 with `{ error: "Internal server error" }`.
- Deterministic business logic: Keep generation pure with explicit inputs (projectId, code, issues) for testability.
- Query Keys: Namespaced arrays, e.g., `["vpat", "rows", vpatId]`.
- No‑Overwrite Rule: Generators do not overwrite if a row already has content.

## Adding New Features (Guidance for AI)

- New VPAT server endpoints: Implement under `app/api/vpats/.../route.ts` with authenticated access. Reuse patterns in existing files for RLS‑safe Supabase queries.
- Client additions: Extend `lib/api/vpats.ts` with a corresponding method and add a React Query hook in `lib/query/use-vpat-queries.ts`.
- UI: Add pages/components under `app/...` and use shadcn/ui primitives for consistency. Wire hooks for data fetching/mutations.
- Data: Add types in `types/` first. Keep server handlers using those types for return shapes.
- Generation enhancements: Modify only `lib/vpat/generation.ts` where possible to keep side‑effects out; update the orchestrating route handler if inputs or outputs change.

## Local Development

- Install dependencies: `pnpm install` (or `npm i` depending on project tooling)
- Run dev server: `pnpm dev` (or `npm run dev`)
- Required env (see README for examples):
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (for privileged server ops if used)
   - OPENAI_API_KEY (if AI features beyond current pure generation are enabled)

## Deployment

- Vercel recommended. API routes are serverless functions.
- Ensure Supabase URL/keys and any AI provider keys are set in environment.

## File Index (Selected)

- app/vpats/[vpatId]/page.tsx — VPAT Draft UI
- app/api/vpats/route.ts — Create and list VPATs
- app/api/vpats/[vpatId]/route.ts — Get/Update a VPAT
- app/api/vpats/[vpatId]/rows/route.ts — List draft rows
- app/api/vpats/[vpatId]/rows/[criterionId] — Save one row
- app/api/vpats/[vpatId]/rows/[criterionId]:generate — Generate row content
- app/api/vpats/[vpatId]/issues-summary — Summary of open issues per WCAG code
- app/api/vpats/[vpatId]/versions — List versions
- app/api/vpat_versions/[versionId] — Get a version
- lib/api/base.ts — Axios + ApiResponse base
- lib/api/vpats.ts — Client VPAT service
- lib/query/use-vpat-queries.ts — React Query hooks
- lib/vpat/generation.ts — Pure generation logic
- types/vpat.ts — Shared types for VPAT domain

---

If you need further details on a specific route or type, open the listed file and follow the established patterns for authentication, data access, and error handling.
