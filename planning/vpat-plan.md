# VPAT Generator — Initial Plan (Updated, v2)

*Last updated: Sep 6, 2025*

This revision incorporates your latest decisions (show all rows, Generate Next 5 behavior, simplified generation UX, event-based snapshots) and switches the API plan to REST on Supabase. It also adopts the “single numeric view” UX where Edit mode uses the same layout with inline editing.

---

## 1) Goals & Non-Goals (v1)

**Goals**

* Create, edit, and publish VPATs from a **Project** (aggregating all of its Assessments).
* Author **WCAG tables** for Levels **A**, **AA**, **AAA** with **row-level editing**.
* Per-row **AI assist** (Generate Criteria) and **Generate Next 5** with progress.
* Versioned publishing (draft → publish → immutable **version history**).
* **Sharing**: private by default; public or **password-protected** link; downloads in **PDF**, **Markdown**, **DOCX**.

**Non-Goals (for v1)**

* Supplemental VPAT sections (support docs, 508, EN 301 549) — **omitted**.
* Complex filtering (platform/variant) — **deferred** (achieved via separate projects/assessments for variants).
* Per-email invite ACLs — **deferred** (single password only).

---

## 2) User Flow

1. **VPATs page** (mirrors Projects/Assessments): cardsd with Title · Description · Status · Last Updated.

2. **Create VPAT** → Select **Project** (project-scoped; rolls up all assessments under that project).

3. **Editor (draft)**

    * **Default view**: **All WCAG criteria listed numerically** (e.g., 1.1.1, 1.2.1, …). **Edit mode** is the same layout with inline-editable fields. Above the table will be fields for **Title** and **Description**.
    * **WCAG Scope**: WCAG versions (**2.0**, **2.1**, **2.2**) and levels (**A**, **AA**, **AAA**) are determined by the assessments that have been included. This value is pre-filled and read-only. Rows in **levels not selected** default to **Not Evaluated** (still editable).
    * **Tables shown**: A, AA, AAA (AAA may remain Not Evaluated unless chosen).
    * **Columns**: **Criterion** (# + short name) · **Conformance** · **Remarks/Explanation** · **Issues (titles/URLs)**.
    * **Row actions**: **Generate Criteria**, **Save**, **Clear Row**, **Regenerate**.
    * **Toolbar**: **Generate Next 5** (progress banner), **Validate**, **Publish**. There should be a count showing the number of rows with empty Conformance/Remarks.
    * **Right rail** (lightweight): Linked Assessments; list of **open issues** mapped to the selected criterion.

4. **Generate Next 5** (behavior)

    * Selects the **next five criteria in ascending numerical order that have no saved content** (i.e., empty Conformance & Remarks).
    * During generation:

        * The five targeted rows show a **Generating…** state and are **temporarily read-only**.
        * **All generate buttons** (row and toolbar) are **disabled** to prevent overlap.
    * As each row finishes, it **updates in place** and becomes **editable** immediately, while the remaining in the batch continue.
    * **Never overwrite**: if a row already has Conformance or Remarks, it is **skipped**.

5. **Publish**

    * Creates an **immutable version** with a snapshot of the rows and scope; exposes **Share** and **Download**.

6. **Share**

    * Options: **Public** or **Password-protected** (single password). Toggle **Show issue links** in the public view.

7. **Post-publish edits**

    * Editing a published VPAT creates/edits a **draft**; next publish creates a **new version**.

---

## 3) Conformance Vocabulary & Validation

* Allowed values: **Supports · Partially Supports · Does Not Support · Not Applicable · Not Evaluated**.
* **Not Evaluated** is allowed for **Level AAA** rows **and** for rows in **levels not selected** in the scope (auto-set; still editable).
* **Not Applicable** requires justification in **Remarks**.
* If value ≠ **Supports**, **Remarks** are required.
* UI: constrained dropdown, inline validation, and a visual style for auto-**Not Evaluated** rows.

---

## 4) AI Generation (Row & Next 5)

**Inputs**

* Project → Assessments → **Issues**, via `issue_criteria` mapping (leveraging existing `wcag_criteria`).
* Only **open issues** are considered (resolved issues are ignored for VPAT computation).

**Heuristics (tunable)**

* **No open issues** with functional impact ⇒ **Supports**.
* **Minor limitations** ⇒ **Partially Supports** (summarize scope/workarounds).
* **Blocking issues** ⇒ **Does Not Support** (cite impacted flows/components).
* **No relevant functionality** ⇒ **Not Applicable** (explicit reason).

**Output**

* Draft **Conformance**, succinct **Remarks/Explanation** (2–5 sentences), and a **related issues list** (titles + URLs).

**Rules & UX guardrails**

* **Never overwrite** existing non-empty Conformance/Remarks.
* Batch of five rows: in-progress rows show **Generating…**, are read-only; buttons disabled globally until batch completes.
* If data is insufficient, show a gentle warning (“No mapped issues found; verify coverage”).

---

Perfect catch. Here are **drop-in replacements** for sections **5) Data Model** and **6) REST API** that reflect everything we’ve actually built (UUIDs, enums, RLS, no `methods`, `related_issue_ids` as `uuid[]`, and the `v_vpat_current` view). I’ve also added a tiny note on how to query the view via Supabase/PostgREST so it doesn’t get lost.

---

## 5) Data Model (MVP – tables, view, enums)

**Tables (base)**

**vpat**
`id uuid pk, project_id uuid fk→projects.id, title text, status vpat_status('draft'|'published'), created_by uuid, created_at timestamptz, updated_at timestamptz, current_version_id uuid fk→vpat_version.id (DEFERRABLE INITIALLY DEFERRED)`

**vpat\_row\_draft** (editable surface)
`id uuid pk, vpat_id uuid fk→vpat.id, wcag_criterion_id uuid fk→wcag_criteria.id, conformance conformance_value, remarks text, related_issue_ids uuid[], related_issue_urls text[], last_generated_at timestamptz, last_edited_by uuid, updated_at timestamptz, UNIQUE(vpat_id, wcag_criterion_id)`

> Notes:
> • `wcag_criteria.id` is **uuid**; numeric ordering comes from its **code text** (e.g., `1.4.13`) on the client.
> • `related_issue_ids` aligns with `issues.id` (**uuid\[]**).
> • No `methods` column in MVP.

**vpat\_version** (append-only snapshots)
`id uuid pk, vpat_id uuid fk→vpat.id, version_number int, published_by uuid, published_at timestamptz, wcag_scope jsonb, criteria_rows jsonb, export_artifacts jsonb (optional)`

**vpat\_share**
`id uuid pk, version_id uuid fk→vpat_version.id, visibility share_visibility('private'|'public'|'password') default 'private', password_hash text, show_issue_links boolean default true, created_at timestamptz, revoked_at timestamptz null`

**project\_accessibility\_metrics** (event-based snapshots)
`id uuid pk, project_id uuid fk→projects.id, snapshot_at timestamptz default now(), counts_by_severity jsonb, counts_by_wcag_level jsonb, open_vs_resolved jsonb, notes jsonb`

**View (for list page)**

**v\_vpat\_current** (convenience view for the VPATs list)
Fields: `vpat_id, project_id, title, status, created_by, created_at, updated_at, current_version_id, version_number, published_at, published_by`
Role: join `vpat` ↔ its current `vpat_version` so the list page can render Title/Status/Version/PublishedAt in **one query**.
RLS: enforced via underlying tables.

> Optional enriched variant (future): `v_vpat_list` (joins `vpat_share` to expose `visibility` / `show_issue_links` for the current version).

**Enums**
`vpat_status('draft','published')`,
`conformance_value('Supports','Partially Supports','Does Not Support','Not Applicable','Not Evaluated')`,
`share_visibility('private','public','password')`.

**Special DB features (already added)**

* `updated_at` triggers on `vpat`, `vpat_row_draft`.
* `publish_vpat(vpat_id, published_by, wcag_scope, criteria_rows) → version_id` (atomic versioning).
* **RLS (owner-based)** on all VPAT tables; public/password access is handled by an **Edge Function (service role)** that checks `vpat_share`.

---

## 6) REST API (Supabase) — endpoints & how to use the view

Backed by Supabase (Postgres + RLS). Use REST endpoints (via Supabase client or Edge Functions) to manage drafts, generation, publishing, and sharing.

**App endpoints (suggested proxy paths)**

* `POST /api/vpats` — create draft (body: `projectId, title, scope`)
* `GET /api/vpats?projectId=...` — list VPATs for a project
  → **Implementation tip:** query `v_vpat_current` under the hood for a single read.
* `GET /api/vpats/{vpatId}` — get VPAT (draft info)
* `PUT /api/vpats/{vpatId}` — update title/scope/status
* `GET /api/vpats/{vpatId}/rows` — get all draft rows
* `PUT /api/vpats/{vpatId}/rows/{criterionId}` — save/clear a row
* `POST /api/vpats/{vpatId}/rows/{criterionId}:generate` — generate a single row (server must **never overwrite** non-empty)
* *(optional)* `POST /api/vpats/{vpatId}:generate_batch` — client supplies `criterionIds: string[]` (Next N). Progress via SSE or polling.
* `POST /api/vpats/{vpatId}:validate` — run validation and return issues
* `POST /api/vpats/{vpatId}:publish` — create a new version (returns `vpat_version` id; uses `publish_vpat`)
* `GET /api/vpats/{vpatId}/versions` — list versions
* `GET /api/vpat_versions/{versionId}` — fetch a version payload
* `POST /api/vpat_versions/{versionId}:share` — set visibility/password/showIssueLinks
* `GET /api/vpat_versions/{versionId}/download?format=pdf|md|docx` — get artifact

**PostgREST usage (direct Supabase routes) — keep this handy**

* VPATs list (one call using the **view**):
  `/rest/v1/v_vpat_current?project_id=eq.<PROJECT_UUID>&select=vpat_id,title,status,version_number,published_at,updated_at&order=published_at.desc,updated_at.desc`

* Draft rows for the editor:
  `/rest/v1/vpat_row_draft?vpat_id=eq.<VPAT_UUID>&select=wcag_criterion_id,conformance,remarks,related_issue_ids,related_issue_urls,last_generated_at,updated_at`

* Save a row (upsert by `(vpat_id, wcag_criterion_id)` in your API or via an Edge Function).

**Server-side guard (MVP, to prevent overwrites in `:generate`)**

```sql
-- Update only if currently empty
update vpat_row_draft
   set conformance = :c,
       remarks = :r,
       related_issue_ids  = :issue_ids,
       related_issue_urls = :issue_urls,
       last_generated_at  = now(),
       last_edited_by     = :user
 where vpat_id = :vpat_id
   and wcag_criterion_id = :criterion_id
   and conformance is null
   and (remarks is null or btrim(remarks) = '')
returning id;

-- If no row updated, try to insert; if conflict, treat as SKIPPED
insert into vpat_row_draft (vpat_id, wcag_criterion_id, conformance, remarks,
                            related_issue_ids, related_issue_urls, last_generated_at, last_edited_by)
values (:vpat_id, :criterion_id, :c, :r, :issue_ids, :issue_urls, now(), :user)
on conflict (vpat_id, wcag_criterion_id) do nothing
returning id;
```

**Notes**

* **Client computes** “Next N” (default 5) by sorting `wcag_criteria.code` numerically and picking empty rows; the server only enforces **no overwrite**.
* **RLS**: owner-based; all app reads/writes go through PostgREST or Edge Functions with the user JWT. Public/password links are handled by a **service-role Edge Function** that verifies `vpat_share` and returns the published payload.

---

If you paste these over your existing sections 5 and 6, nothing important will get dropped during implementation.


---

## 7) Exports

* **Tables-only** for v1 (no supplemental header/meta blocks).
* Canonical **Markdown** renderer from `vpat_version.criteria_rows` + `wcag_scope`.
* **DOCX**: docx-template or Pandoc from MD.
* **PDF**: HTML/MD → PDF (wkhtmltopdf/WeasyPrint).
* Ensure generated files are **accessible** (table headers, proper semantics, reading order).

---

## 8) Security & Sharing

* Default private (org/project members only).
* **Single password** for public link mode (stored as hash). Ability to **rotate/revoke**.
* Toggle **Show issue links** (on/off) for shared view.
* **No password policy** in v1 (no enforced complexity/expiry).

---

## 9) Accessibility & UX Details (editor)

* **Keyboard-first grid**: arrow-key navigation, Enter to edit, Esc to cancel, Cmd/Ctrl+Enter to save cell.
* **Sticky header** + “**Jump to criterion**” search (accepts `1.4.13` or text like “content on hover”).
* **Level chips** (A/AA/AAA): toggle visibility by level; non-selected rows remain visible but **grayed/disabled** (auto **Not Evaluated**).
* Row state badges: **Empty · Generating… · Drafted · Edited**.
* Unsaved changes bar with **Save all** / **Discard all**.
* Clear focus outlines, proper ARIA roles, and live-region announcements for generation progress.

---

## 10) Milestones (thin-slice)

1. Schema + Supabase (Postgres) + **REST endpoints** & basic CRUD.
2. Editor: numeric table rendering from `wcag_criteria`; manual editing + Save/Clear; basic Validate.
3. AI: Generate Criteria (single row) w/ related issues; guardrails.
4. **Generate Next 5** + progress (SSE) with in-row Generating state and global button lockout.
5. Publish → Version snapshot + Downloads (MD first, then PDF/DOCX).
6. Sharing: public/password, show-issues toggle.
7. Event-based snapshots for `project_accessibility_metrics` on assessment changes & VPAT publish.

---

## 11) Decisions locked vs pending

**Locked**

* Show **all rows** (non-selected levels grayed/disabled; auto **Not Evaluated**).
* **Generate Next 5** selects the **next five empty** criteria by ascending numeric order; **never overwrites** existing content.
* Generation UX: rows in batch are read-only; global generate buttons disabled; rows become editable as each completes.
* Snapshots are **event-based** only.

**Pending (can proceed with defaults)**

* Transport for progress: default **SSE**; fallback polling allowed if infra dictates.

---

## 12) Nice-to-haves (parking lot)

* Per-email sharing/invites, link analytics.
* Filter presets (by assessment tags/platform) once those attributes exist.
* Additional standards (508, EN 301 549) and supplemental sections.
* Alternate “single consolidated table” export, flattened across levels.
