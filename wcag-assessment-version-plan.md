# WCAG Version: Assessment-Owned Model — Migration & Validation Plan

Status: Finalized for v1 (aligned to current data schema)  
Audience: Product, Engineering  
Scope: Planning only (no code changes in this PR)

## Goals and Outcomes

- Each Assessment owns the WCAG version (2.0, 2.1, 2.2).
- Issues inherit the version from their parent Assessment; no “Version” field on the Issue form.
- Issues can be associated with multiple WCAG criteria (many-to-many); selection, storage, validation, and rendering all support this.
- Criteria Level (A/AA/AAA) is intrinsic to the criterion code and not user-editable; shown for context only.
- Keep the criteria catalog normalized as rows per (code, version); align in the application layer on read/write.
- Enforce consistency via UI filtering and application (API) validation; no DB-level cross-table constraint needed initially.

Assumptions (confirmed):
- No existing Issues in production/prototype (no backward compatibility needed).
- Each Issue is attached to a single Assessment.
- WCAG 2.1 and 2.2 are already seeded; we will seed WCAG 2.0 using the same structure.
- Assessment version is required at creation; no default.
- Changing an Assessment’s version is allowed only before any Issues exist.
- v1 permissions: all users can create Projects, Assessments, and Issues (roles and enforcement to come later).

---

## Data Schema Alignment (current)

- assessments: id, name, description, created_at, updated_at, user_id (add wcag_version).
- issues: id, title, …, status, created_at, updated_at, user_id (has a legacy criteria text column; primary linkage to criteria is via join).
- wcag_criteria: id, code, name, version, level, is_deprecated, created_at (one row per version of a criterion).
- issue_criteria: issue_id, criterion_id (join table; multiple rows per Issue to support multi-criteria).
- assessments_issues: assessment_id, issue_id (link Issues to Assessments).
- issue_criteria_agg: read-optimized aggregation (criteria_codes[], criteria JSON), optional for convenience.

Implications:
- Use assessments_issues to associate each Issue with exactly one Assessment (enforce uniqueness on issue_id at the app/API layer; optional DB unique constraint can be added later).
- Prefer issue_criteria for criteria storage; treat issues.criteria (text) as deprecated/ignored for v1.
- Multi-criteria is represented as N rows in issue_criteria for a single issue_id.

---

## Phase 0 — Foundations and Decisions

1) Canonical source of truth
- Assessment has wcag_version: "2.0" | "2.1" | "2.2" (required).
- Issues do not store version; they store selected criteria via issue_criteria referencing wcag_criteria rows that already encode version and level.

2) Catalog unchanged (normalized in DB)
- Continue with wcag_criteria rows per (code, version) with level and is_deprecated flags.
- Validation and filtering join against wcag_criteria.

3) Version change policy on Assessments
- Allowed only when the Assessment has zero Issues.
- Once at least one Issue exists, wcag_version becomes locked (no remediation flow in v1).

---

## Phase 1 — Data Model Plan (Option A)

- Add assessments.wcag_version (non-null, enum-like constraint for "2.0" | "2.1" | "2.2").
- Do not add issues.wcag_version; rely on assessments_issues + wcag_criteria.
- Keep issue_criteria as the source of truth for selected criteria (multiple rows per Issue).
- Treat issues.criteria (text) as deprecated for v1 (ignore reads/writes); consider dropping later.

Seeding:
- 2.1 and 2.2 are already seeded; add seed data for 2.0 only.
- Use the same row structure: (code, name, version = "2.0", level, is_deprecated).
- For differences across versions (adds/removals/level changes/deprecations), represent them as separate rows per version.
- Validate seed coverage to ensure all 2.0 criteria are present and correctly marked.

Note:
- Cross-table enforcement (e.g., “issue_criteria rows must match the Assessment’s wcag_version”) will be handled in application logic for v1.

---

## Phase 2 — API/Application Validation

On Issue create/update:
- Require an Assessment association:
  - From Assessment detail context: the assessment_id is preselected and immutable in the request.
  - From Issues page: assessment_id is required input; reject if missing.
- Resolve the Assessment and read its wcag_version.
- Validate the submitted criteria set against wcag_criteria:
  - Each criterion_id must exist.
  - Each criterion.version must equal the Assessment.wcag_version.
  - No duplicates: if the same criterion_id/code appears more than once, dedupe or reject with a clear error.
- Reject the request with actionable errors if any criterion is incompatible or if assessment_id is missing/invalid.
- Persist selections only in issue_criteria (insert/delete rows to reflect the full set).
- When returning Issue reads, enrich with code, name, level from wcag_criteria (and optionally surface issue_criteria_agg if available).
- Ensure exactly one Assessment per Issue at the application layer; reject attempts to attach an Issue already linked to a different Assessment.

On Issue patch/update behavior:
- Support adding/removing criteria in bulk; after persistence, the stored set should be unique and sorted by code when read.

On Assessment create/update:
- Require wcag_version on create (no default).
- Permit changing wcag_version only when the Assessment has zero Issues; otherwise reject with a clear “locked” error and guidance to create a new Assessment if needed.

Association integrity:
- Enforce at the application/API layer that an Issue is linked to exactly one Assessment:
  - On attach: ensure the Issue is not already linked to a different Assessment.
  - Optionally add a unique constraint on assessments_issues.issue_id in a future migration.

---

## Phase 3 — UI/UX Changes

Assessment:
- Create/Edit UI requires picking wcag_version (2.0/2.1/2.2).
- Show a “locked” indicator (or disable selector) if Issues exist; allow edits only when count == 0.

Issue creation entry points:
- From an Assessment detail page:
  - Pre-select and lock the Assessment field in the Issue form.
  - Criteria selector is filtered by this Assessment’s wcag_version.
- From the Issues page:
  - Assessment field is required and not pre-selected.
  - Criteria selector remains disabled or unpopulated until an Assessment is chosen; then it filters by that wcag_version.
- Empty state:
  - If the user attempts to create an Issue when no Assessments exist, show a notification modal explaining that an Assessment must be created first, with a clear CTA to create one.

Issue form (multi-criteria):
- Remove the Version field entirely.
- Criteria selector is a multi-select control filtered to the chosen Assessment’s wcag_version.
- Always order options by code ascending using numeric, dot-aware sort (e.g., 2.10 > 2.9).
- Selected criteria are displayed as chips/pills in code order; allow removing any chip to update the set.
- Prevent duplicate selection at the UI level; surface a gentle hint if a user attempts to add a duplicate.
- No Level filter in the selector (per tester workflow). Display Level badges next to criteria for information only.
- Deprecated indicator:
  - For items with is_deprecated = true in the Assessment’s version, append “(deprecated in <version>)” to the option label and show a subtle badge in the selected chip.
  - Selection is allowed in v1.

AI Assist and Automation:
- Include assessment.wcag_version in generation context so suggested criteria are restricted to the selected version.
- AI suggestions may propose multiple criteria; apply them as a set with deduplication and sorting.

---

## Phase 4 — Handling Assessment Version Changes

- v1 policy: Changes allowed only when there are zero Issues; otherwise locked.
- No remediation workflow in v1. If later required:
  - Detect incompatible Issues upon version change.
  - Offer remediation (clear/map/cancel) as a separate feature.

---

## Phase 5 — Reporting/Read Views

- Enrich Issue reads with criteria metadata (code, name, level, is_deprecated) by joining issue_criteria → wcag_criteria.
- Present multiple criteria as a sorted list (by code) with level badges and deprecated indicators.
- VPAT/Exports group by Assessment; the version comes from the parent Assessment.
- If displaying aggregates, leverage issue_criteria_agg (if present) and ensure consistent code ordering in outputs.

---

## Phase 6 — Testing Strategy

Unit tests:
- Issue create/update:
  - Rejects when assessment_id is missing (Issues page flow).
  - Rejects any criterion not matching the parent Assessment’s wcag_version.
  - Accepts multiple valid criteria; response includes enriched metadata for each.
  - Dedupes or rejects duplicates consistently (decide policy per API design; recommend dedupe with warning or reject with clear error).
- Assessment version edits:
  - Allowed when zero Issues.
  - Rejected once Issues exist.
- Deprecated indicator and ordering:
  - Given a criterion with is_deprecated = true, the selector option label includes “(deprecated in <version>)” and read views show a badge.
  - Selector options and selected chips are sorted by numeric, dot-aware code order ascending.

Integration/E2E:
- Assessment detail → Create Issue:
  - Assessment pre-selected and locked; criteria list filtered accordingly; allow selecting multiple criteria.
- Issues page → Create Issue:
  - Assessment must be selected; criteria list populates only after selection; multi-select works with dedupe.
- Empty state:
  - With no Assessments, opening Create Issue shows a modal with CTA to create an Assessment.
- Cross-version guard:
  - Attempt to submit a mixed set including an out-of-version criterion; validate server rejection and helpful errors.
- Deprecated surfacing:
  - Ensure deprecated criteria display indicators but remain selectable.

UX/Accessibility:
- Criteria selector supports multi-select keyboard interactions and screen reader announcements.
- Modals and error states are accessible and clearly announced.
- Deprecated indicators have accessible names/descriptions.

---

## Phase 7 — Deletion Behavior (v1)

- Deleting an Assessment that has Issues:
  - Show a confirmation dialog that indicates the exact number of Issues that will be deleted.
  - Action is not reversible (archiving will be added later).
  - If confirmed, cascade delete to related Issues and their dependent records (e.g., issue_criteria).
- Deleting an individual Issue:
  - Standard confirmation (irreversible). Archiving to be added later.

---

## Phase 8 — Rollout Plan

- Step 1: Add assessments.wcag_version (no default, required).
- Step 2: Seed wcag_criteria for 2.0 (2.1/2.2 already seeded; no structural changes).
- Step 3: Issue form/DTOs: remove Version; require assessment selection; filter criteria by Assessment version; implement multi-select with dedupe and sorting.
- Step 4: Application validation: check criterion.version == assessment.wcag_version on create/update; require assessment_id when creating from Issues page; dedupe/validate criteria sets.
- Step 5: Lock Assessment version when Issues exist; allow edits when none exist.
- Step 6: Enrich Issue read responses from wcag_criteria (or agg view); ensure sorted output.
- Step 7: UX guards:
  - Pre-select and lock Assessment when creating from Assessment detail.
  - Show “create Assessment first” modal when none exist.
  - Order criteria by code ascending; append “(deprecated in <version>)” to deprecated options and show badges on selected chips.
- Step 8: Deletion confirmations and cascade behavior (Assessment → Issues).
- Step 9: QA (unit + E2E) across all three versions.

Optional later:
- DB unique constraint on assessments_issues.issue_id to harden single-assessment-per-issue.
- Remediation workflow for post-creation version changes, if needed.
- Admin tooling for updating standards (seed/refresh UI).
- Archiving for Assessments and Issues (soft-delete/state change).
- Issue move/duplicate workflows with validation/remapping.

---

## Implementation Checklist (Condensed)

Data:
- [ ] Add assessments.wcag_version with allowed values ("2.0" | "2.1" | "2.2").
- [ ] Seed wcag_criteria for 2.0 (2.1/2.2 already seeded).
- [ ] Continue using issue_criteria; ignore issues.criteria in v1 (mark deprecated).
- [ ] Use assessments_issues to link an Issue to exactly one Assessment (enforce at app/API; optional DB unique constraint later).

Application/API:
- [ ] Assessment create: require wcag_version; allow editing only when issue count == 0.
- [ ] Issue create/update: require assessment_id; validate all selected criteria belong to assessment.wcag_version; dedupe the set.
- [ ] Issue read: enrich criteria with code, name, level, is_deprecated (join wcag_criteria or use agg view) and return sorted by code.
- [ ] Deletion: cascade delete Issues when deleting an Assessment, with irreversible warning.

UI:
- [ ] Assessment form: required wcag_version dropdown; disable/lock when issues exist.
- [ ] Issue form:
  - From Assessment detail: pre-selected and locked Assessment.
  - From Issues page: Assessment required; criteria disabled until selected.
  - Multi-select criteria; prevent duplicates; order options and selected chips by code; show Level badges and “(deprecated in <version>)” where applicable.
- [ ] Empty state modal: prompt to create an Assessment if none exist, with CTA.
- [ ] Deletion confirmation modals for Assessment and Issue deletions.

QA:
- [ ] Unit tests for multi-criteria validation, dedupe, ordering/indicator behavior, and required assessment selection.
- [ ] E2E tests for both entry points, empty-state flow, multi-select and dedupe, and deletion confirmations/cascade.
- [ ] Accessibility checks for multi-select interactions, modals, error messages, and deprecated indicators.

---

## Risks and Mitigations

- Risk: Version mismatch via API misuse.
  - Mitigation: Strict application-level validation; reject incompatible criteria.
- Risk: Ambiguity if an Issue can be linked to multiple Assessments.
  - Mitigation: Enforce single-assessment-per-issue in app/API; optionally add DB unique constraint later.
- Risk: Seed gaps for 2.0.
  - Mitigation: Validate seed coverage and deprecations across 2.0 versus 2.1/2.2 before enabling creation.
- Risk: Confusion around deprecated criteria usage.
  - Mitigation: Visible “(deprecated in <version>)” text and badges; consider analytics/reporting on deprecated usage.

---

## Example Validation Flow (Application/API)

- Input: Create Issue with assessment_id and multiple criterion_ids, including a duplicate.
- App resolves assessment.wcag_version.
- For each unique criterion_id: require wcag_criteria.version == assessment.wcag_version.
- If any mismatch: return 400 with the list of offending criteria and guidance.
- If duplicates present: dedupe (or reject per policy) and proceed.
- Else: persist issue_criteria rows for the set and return Issue with enriched, code-sorted criteria metadata.

---

## Future-Proofing Notes

- To support other standards (or WCAG 3):
  - Extend Assessment with standard_type and version.
  - Partition criteria catalogs by standard_type.
  - Reuse the same validation flow keyed by (standard_type, version).

- Planned future upgrades:
  - Roles/permissions (project/assessment-level) and enforcement.
  - Admin tooling for standards updates and re-seeding.
  - Archiving (soft-delete) for Assessments and Issues.
  - Issue move/duplicate workflows with criteria validation/remapping.
