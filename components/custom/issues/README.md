Issues form architecture (refactor summary)

This folder contains the Issue creation form split into focused subcomponents with logic encapsulated in hooks. The goal is parity with the original behavior while improving maintainability, accessibility, and type safety.

Key components
- IssueForm: Orchestrates the whole flow. Uses react-hook-form with a Zod resolver for validation; delegates UI to subcomponents and logic to hooks.
- AIAssistPanel: Controls the AI prompt input and the action button. Non-destructive by design (only fills empty fields).
- CoreFields: Title, description, URL, severity, impact, suggested fix. Field-level errors come from RHF’s formState.
- WcagCriteriaSection: Version/level filters and criteria multi-select. Uses useWcagFilters.
- TagsSection: Tags multi-select using fetched options.
- AttachmentsSection: Local file selection and upload trigger; displays uploaded screenshot URLs.
- FormActions: Submit button and top-level error display.

Hooks and data
- lib/hooks/use-ai-assist.ts: Manages AI prompt lifecycle and applies suggestions via a provided non-destructive helper (applyAiSuggestionsNonDestructive). It posts to /api/ai/issue-assist with enriched context (url, selector, code_snippet, screenshots, tags, severity_hint, criteria_hints).
- lib/hooks/use-file-uploads.ts: Holds pending FileList, performs image uploads to /api/uploads/images, dedupes URLs, and notifies the form via a callback.
- lib/hooks/use-wcag-filters.ts: Manages WCAG version/level filters and returns filtered options suitable for the multi-select.
- lib/query/use-tags-query.ts and lib/query/use-wcag-criteria-query.ts: TanStack Query wrappers for fetching tags and WCAG criteria data.
- lib/query/use-create-issue-mutation.ts: Mutation wrapper to create the issue; on success the form resets and navigates back to /issues.

Constants and schema
- lib/issues/constants.ts: Source for option builders (severityOptions, statusOptions), criteria key helpers (makeCriteriaKey/parseCriteriaKey), and array dedupers.
- lib/validation/issues.ts: Single source of truth Zod schema (createIssueSchema). Strings are trimmed/normalized at the schema level; criteria are required and allowlisted against data/wcag-criteria.json. Types are inferred from the schema (CreateIssueInput) and used by the form.

Data flow summary
1) User edits fields; RHF stores values and validates via Zod.
2) WCAG criteria are selected using composite keys version|code; keys are parsed to {version, code} before submission.
3) AI assist can enrich empty fields. It never overwrites user-entered values.
4) Uploads persist screenshot URLs which the form includes on submit.
5) Submit uses useCreateIssueMutation; success navigates to /issues.

Notes
- Status is not user-editable in the UI (defaults to "open"); keep aligned with product decisions.
- Description is optional in the schema but may be enforced via UI affordances.
- Prefer relying on the schema for trimming/normalization; avoid duplicating client-side logic.
