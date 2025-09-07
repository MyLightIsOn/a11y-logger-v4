# VPAT Generator — Engineering Plan (v1)

Last updated: 2025-09-07
Owner: Engineering
Scope: Implement the VPAT generation/editing/publishing/sharing feature set described in planning/vpat-plan.md, using existing patterns and avoiding duplication.

---

## 0) Guiding principles
- Reuse existing patterns and files where possible (API service wrappers, React query hooks, UI components, PostgREST usage, RLS model).
- Keep server logic thin; prefer PostgREST + SQL guards; use Edge Functions when service-role is required (public/password sharing, artifact downloads if needed).
- Never overwrite existing VPAT row content during AI generation.
- Ship iteratively by milestones; feature-gate new pages under a /vpats area.
- Unit tests will be added later. This plan focuses on implementation steps only.

---

## 1) Data layer and Supabase wiring
Status: DB schemas exist (see data/db-schemas/). A convenience view v_vpat_current is added.

Tasks:
1. Verify required enums exist in DB (deployment step):
   - vpat_status('draft','published')
   - conformance_value('Supports','Partially Supports','Does Not Support','Not Applicable','Not Evaluated')
   - share_visibility('private','public','password')
2. Ensure updated_at trigger function set_updated_at() exists (already referenced by triggers).
3. Confirm v_vpat_current view is deployed (data/db-schemas/v_vpat_current).
4. Create SQL helper for “no-overwrite generate” (MVP guard) — placed in planning doc already. For production deployment, consider a SQL function:
   - fn_try_generate_vpat_row(vpat_id uuid, criterion_id uuid, c conformance_value, r text, issue_ids uuid[], issue_urls text[], user_id uuid) returns table(did_insert boolean, did_update boolean)
   - The function encapsulates the two-step update-or-insert without overwriting.

Note: Actual SQL function creation can be deferred; initial implementation can perform the two statements from an Edge Function or server route.

---

## 2) REST API surface (app proxy to Supabase)
We will expose Next.js API routes under /api/vpats/* that act as authenticated proxies to Supabase PostgREST or call Edge Functions. Follow the pattern used by reportsApi (lib/api/base + service classes).

Endpoints and implementation notes (matching vpat-plan section 6):
1. POST /api/vpats — create draft
   - Body: { projectId: string, title: string, description?: string }
   - Behavior: insert into vpat with status='draft'; return created id. Also pre-seed vpat_row_draft rows? (Skip seeding; rows are created lazily on first save/generate per criterion.)
   - Implementation: Supabase REST insert or server-side call using the authenticated user’s JWT (RLS enforced).

2. GET /api/vpats?projectId=... — list VPATs for a project
   - Implementation: Query v_vpat_current via PostgREST for a single read; return cards list data.

3. GET /api/vpats/{vpatId} — fetch VPAT (draft info)
   - Implementation: Select from vpat by id.

4. PUT /api/vpats/{vpatId} — update title/description (scope is derived from assessments, read-only in UI)
   - Implementation: Update vpat (title, description). Keep status as draft unless publish flow updates.

5. GET /api/vpats/{vpatId}/rows — fetch all draft rows
   - Implementation: Query vpat_row_draft by vpat_id via PostgREST.

6. PUT /api/vpats/{vpatId}/rows/{criterionId} — save/clear a row
   - Body: { conformance: ConformanceValue | null, remarks: string | null, related_issue_ids?: string[], related_issue_urls?: string[] }
   - Implementation: Upsert by (vpat_id, wcag_criterion_id). Use PostgREST upsert or small Edge Function to enforce ownership and set last_edited_by.

7. POST /api/vpats/{vpatId}/rows/{criterionId}:generate — AI-generate a single row
   - Steps:
     a) Resolve project from vpat.project_id.
     b) Fetch open issues mapped to wcag criterion (reuse existing issues APIs and wcag mapping code used by reports).
     c) Apply heuristics to assign conformance and craft remarks; include related issue titles/URLs.
     d) Write via no-overwrite guard (SQL or two-step logic) and set last_generated_at, last_edited_by.
     e) Return the resulting row (or a status SKIPPED if already filled).

8. POST /api/vpats/{vpatId}:generate_batch — batch generate N criteria (client supplies Next N criterionIds)
   - Progress transport: Server-Sent Events (default). Provide fallback polling if infra restricts SSE.
   - Implementation: A route that streams progress events (started, updated, completed per criterion). While streaming, also perform the per-row generate path reusing the same logic as endpoint 7. Respect no-overwrite.

9. POST /api/vpats/{vpatId}:validate — run simple validations
   - Checks:
     - Not Applicable requires non-empty remarks
     - Non-Support/Partial require remarks
   - Returns list of issues by criterionId.

10. POST /api/vpats/{vpatId}:publish — create immutable version
    - Steps:
      a) Compute wcag_scope (based on assessments present under the project; reuse existing mapping utilities; store as jsonb).
      b) Build criteria_rows json payload from vpat_row_draft joined with wcag_criteria (code, name, level), filling Not Evaluated for rows with no draft in selected scope; include AAA rows as allowed by plan.
      c) Call a SQL function publish_vpat(vpat_id, published_by, wcag_scope, criteria_rows) that returns version_id and increments version_number atomically; set vpat.current_version_id to returned id within the function.

11. GET /api/vpats/{vpatId}/versions — list versions
    - Query vpat_version by vpat_id.

12. GET /api/vpat_versions/{versionId} — fetch a version payload
    - Return wcag_scope, criteria_rows, export_artifacts.

13. POST /api/vpat_versions/{versionId}:share — set visibility/password/showIssueLinks
    - Upsert into vpat_share for versionId; if password is present, store bcrypt hash (service-role Edge Function preferred to avoid exposing hash logic in client). Allow revoke by setting revoked_at.

14. GET /api/vpat_versions/{versionId}/download?format=md|pdf|docx — return artifacts
    - For v1, always render on-demand; store artifacts in export_artifacts optionally. The route can call a rendering helper (server-side) that converts criteria_rows → Markdown → (optional) PDF/DOCX.

15. Public access route (Edge Function, service role):
    - GET /edge/public/vpats/{versionId}[?password=...] — validates vpat_share (visibility/password) and returns published payload (criteria_rows, wcag_scope) and optionally issue links depending on show_issue_links.

Security:
- All /api/vpats/* routes run under user JWT (RLS). Public/password flows go through service role in Edge Functions only.

---

## 3) Client API wrappers (lib/api) and hooks
Follow the existing reportsApi pattern.

New service: lib/api/vpats.ts
- class VpatsApiService extends BaseApiService, basePath = "/vpats".
- Methods (match endpoints above):
  - create(data)
  - listByProject(projectId)
  - get(vpatId)
  - update(vpatId, patch)
  - getRows(vpatId)
  - saveRow(vpatId, criterionId, payload)
  - generateRow(vpatId, criterionId)
  - generateBatch(vpatId, criterionIds) — uses EventSource for SSE
  - validate(vpatId)
  - publish(vpatId)
  - listVersions(vpatId)
  - getVersion(versionId)
  - shareVersion(versionId, { visibility, password?, showIssueLinks? })
  - download(versionId, format)

React Query hooks (lib/query/*):
- use-vpats-list-query.ts (by project)
- use-vpat-draft-query.ts (single vpat + rows)
- use-save-vpat-row-mutation.ts
- use-generate-vpat-row-mutation.ts
- use-generate-vpat-batch.ts (SSE handling, progress state)
- use-validate-vpat-mutation.ts
- use-publish-vpat-mutation.ts
- use-vpat-versions-query.ts, use-share-vpat-version-mutation.ts

Reuse existing hook patterns from reports (e.g., useGenerateReport, useSaveReport).

---

## 4) UI — Pages and Components
Use Next.js App Router, colocate pages under app/vpats. Reuse shared UI components (DataTable, Button, Badge, Card, etc.).

Routes:
1. /vpats — VPATs list page
   - Fetch via v_vpat_current (through API wrapper listByProject(projectId)).
   - Card layout mirrors assessments/projects pages: Title, Description (first line), Status, Version/PublishedAt.

2. /vpats/new — Create VPAT
   - Simple form: Project selector (existing project picker), Title, optional Description. On submit, POST /api/vpats then redirect to /vpats/{id}.

3. /vpats/{vpatId} — VPAT Editor (draft)
   - Top fields: Title (editable), Description (editable), Scope (read-only summary derived from project assessments; display-only).
   - Table view: all wcag_criteria listed numerically (reuse wcag reference code used in reports; add helper to sort by numeric code).
   - Columns: Criterion (# + short name), Conformance (dropdown constrained to enum), Remarks (textarea), Issues (render list of titles/URLs).
   - Row actions: Generate Criteria, Save, Clear Row, Regenerate.
   - Toolbar: Generate Next 5 (disabled while generating), Validate, Publish; show counter of empty rows.
   - Right rail: Linked assessments and open issues for selected criterion (reuse useAssessmentDetails patterns, but for the project aggregate; add a project-level issues hook if available).
   - Accessibility: keyboard-friendly grid, live region updates for generation progress; use existing focus/ARIA patterns.

4. /share/vpat/{versionId} — Public view page
   - Server-side render via Edge Function payload (or proxy). If password required, render password form, then fetch payload. Toggle to show/hide issue links based on vpat_share.show_issue_links.

Components to add/reuse:
- VpatRowEditor (row-level editing, validation, save/generate buttons)
- GenerateProgressBanner (SSE progress)
- VpatToolbar (actions)
- MarkdownRenderer for preview (optional)

Avoid duplication:
- Reuse components from reports where applicable (charts not needed, but buttons, cards, badges, data-table are available). Reuse wcag reference utilities: lib/wcag/reference.

---

## 5) AI generation logic (heuristics)
Implement as a pure helper module used by both single and batch endpoints.
- Input: open issues for project filtered to the criterion code; optionally accept severity distribution to choose Supports/Partial/Does Not Support.
- Output: { conformance, remarks, related_issue_ids, related_issue_urls }
- Rules (from vpat-plan):
  - No open issues with functional impact → Supports
  - Minor limitations → Partially Supports (summarize)
  - Blocking issues → Does Not Support
  - No relevant functionality → Not Applicable (must state why)
- Keep remarks succinct (2–5 sentences). If insufficient data, include a warning flag that UI can surface ("No mapped issues found; verify coverage").

Source data reuse:
- Use existing issues fetching APIs and the issue↔wcag mapping already used in report pages (see app/reports and lib/wcag/reference, plus any issue criteria fields).

---

## 6) Batch generation (SSE)
- Server endpoint streams JSON events: { type: "start" | "row" | "skip" | "error" | "done", criterionId, payload? }.
- Client subscribes via EventSource; lock global generate buttons while active; each row shows "Generating…" then unlocks as it completes.
- If SSE infra is constrained, provide polling fallback route that kicks off a job and the client polls for statuses (v1 default is SSE per plan).

---

## 7) Publish flow and exports
- Build criteria_rows JSON with shape compatible with renderer: [ { code, name, level, conformance, remarks, related_issue_titles, related_issue_urls } ] and include Not Evaluated for empty rows outside selected levels or AAA as allowed.
- Markdown export: deterministic renderer function from criteria_rows + wcag_scope.
- PDF/DOCX: initially derive from Markdown (html->pdf via wkhtmltopdf/WeasyPrint; docx via template or Pandoc). For v1, implement Markdown and optional PDF; DOCX can be second.
- export_artifacts jsonb can store { md_url, pdf_url, docx_url } if/when persisted in storage (Supabase Storage). Initial v1 may stream on-demand without persisting.

---

## 8) Sharing and public/password access
- Edge Function (service role) validates vpat_share settings:
  - If visibility=public and not revoked → return payload
  - If visibility=password → verify bcrypt(password) vs stored hash
  - Respect show_issue_links flag by filtering related_issue_urls/titles accordingly
- Next.js public page calls the Edge Function, not PostgREST directly (to avoid bypassing password checks).
- Provide admin UI in editor to set visibility, set/rotate password, toggle show_issue_links, and revoke.

---

## 9) Metrics snapshots (project_accessibility_metrics)
- On assessment changes (existing flows) and on VPAT publish, append a snapshot row:
  - counts_by_severity, counts_by_wcag_level, open_vs_resolved, notes (include vpat_version id on publish via notes).
- Implement as a small server route or SQL trigger called by publish_vpat; prefer explicit server call for clarity in v1.

---

## 10) Milestones and step-by-step implementation
Milestone 1 — Data + REST skeleton
1. Wire API routes for: create VPAT, list, get, update, getRows, saveRow, validate (stub), listVersions, getVersion. Implement via PostgREST proxy using BaseApiService. Ensure RLS works. Disable publish/generate buttons in UI until later.
2. Create VpatsApiService and minimal React Query hooks. Build /vpats list and create page.

Milestone 2 — Editor basic (manual editing)
3. Implement /vpats/{id} editor rendering wcag_criteria table numerically. Manual editing: save/clear row. Inline validation rules (Not Applicable and non-Support require remarks). Show counts of empty rows.

Milestone 3 — AI generate (single row)
4. Implement generation helper + route for :generate (single row). Enforce no-overwrite using SQL guard logic. Surface warnings when no mapped issues. Add row-level "Generating…" state.

Milestone 4 — Generate Next 5 (batch + SSE)
5. Client computes Next 5 empty criteria (by numeric code). Implement SSE endpoint for :generate_batch. Disable all generate buttons while processing; rows unlock as each finishes.

Milestone 5 — Publish + Downloads (MD first)
6. Implement publish route calling publish_vpat and computing wcag_scope + criteria_rows. Add downloads: start with Markdown (on-demand). Add PDF afterwards if quick via wkhtmltopdf; otherwise leave as TODO for next iteration.

Milestone 6 — Sharing
7. Implement share route (version-level) and Edge Function for public/password access. Build a minimal public view page. Add show_issue_links toggle.

Milestone 7 — Metrics snapshots
8. On publish, write a row to project_accessibility_metrics with computed stats and link to vpat_version in notes.

---

## 11) File map (planned additions)
- planning/vpat-engineering-plan.md (this file)
- lib/api/vpats.ts (service wrapper) [new]
- lib/query/
  - use-vpats-list-query.ts [new]
  - use-vpat-draft-query.ts [new]
  - use-save-vpat-row-mutation.ts [new]
  - use-generate-vpat-row-mutation.ts [new]
  - use-generate-vpat-batch.ts [new]
  - use-validate-vpat-mutation.ts [new]
  - use-publish-vpat-mutation.ts [new]
  - use-vpat-versions-query.ts [new]
  - use-share-vpat-version-mutation.ts [new]
- app/vpats/
  - page.tsx (list) [new]
  - new/page.tsx (create) [new]
  - [vpatId]/page.tsx (editor) [new]
  - share/[versionId]/page.tsx (public view) [new]
- server/api routes (or app/api):
  - app/api/vpats/* [new]
  - app/api/vpat_versions/* [new]
- Edge Functions (Supabase):
  - functions/public-vpat/index.ts [new]
  - functions/render-vpat/index.ts (optional for PDF/DOCX) [new]
- Helpers:
  - lib/vpat/generation.ts [new]
  - lib/vpat/export.ts (markdown/pdf/docx) [new]
  - lib/vpat/utils.ts (code sorting, scope summary) [new]

We will only create files when working on the corresponding milestone; for now, only this plan is created.

---

## 12) Risks and mitigations
- SSE support in hosting environment: provide polling fallback.
- Consistency between editor draft and published snapshot: publish_vpat must be atomic; include current_version_id update in transaction.
- Large projects (many criteria) → pagination or virtualized table; v1 can render all rows with basic performance optimizations.
- Password handling: use bcrypt + timing-safe comparisons in service role function; never log raw passwords.

---

## 13) Out of scope (for now)
- Unit tests (will be added later).
- Supplemental VPAT sections beyond WCAG tables.
- Complex invite ACLs; analytics for shared links.

---

## 14) Acceptance checklist for v1
- Create, list, edit VPAT drafts for a project.
- Per-row manual editing with validation.
- Generate Criteria (single row) respects no-overwrite.
- Generate Next 5 with proper progress UX and global lockout during generation.
- Publish produces immutable version; list versions; fetch version payload.
- Markdown download works; PDF optional.
- Sharing with public/password and show_issue_links toggle via service role.
- RLS enforced for all authenticated routes; public access only via Edge Function.
