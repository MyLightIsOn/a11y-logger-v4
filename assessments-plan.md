Below is a concrete, project-aligned plan to add Assessments that mirrors how Projects are implemented. I reviewed the existing API service patterns, response shapes, and shared types to make sure we follow the same conventions and avoid assumptions.

High-level goals
- Read-only API and client service for listing assessments; list page showing all assessments
- Match the existing assessments-prototype UI for the list page (visuals and interactions), while wiring it to our current API/services
- Fields: name (required), description (optional), tags (optional)
- Keep response shapes and query params consistent with Projects
- Don’t build the individual assessment details page yet

Step-by-step plan

1) Types: align Assessment with Projects tagging pattern
- Update types/assessment.ts
    - Add tags?: Tag[] to the Assessment interface (tags optional), matching how Project defines tags?: Tag[].
    - We will not use AssessmentWithRelations at this time since “WithRelations” types are not used for Projects; list and single responses will use Assessment with optional tags?: Tag[].
- Request helper types for create/update are deferred until we implement create/edit flows.

2) Client API: read methods only
- Create lib/api/assessments.ts modeled after lib/api/projects.ts:
    - basePath = "/assessments"
    - Types:
        - AssessmentsResponse: { data: Assessment[]; count: number }
    - Methods:
        - getAssessments(params?: Pick<QueryParams, "sortBy" | "sortOrder">)
- Export a singleton instance assessmentsApi (same as projectsApi).
- Update lib/api/index.ts to export:
    - All types from "./assessments" (if any)
    - The instance assessmentsApi for easy import elsewhere.

3) Backend API routes: read-only for now
- Create API route handler:
    - app/api/assessments/route.ts (collection-level)
        - GET: Returns { data: Assessment[]; count } with optional sortBy/sortOrder (same query param names and behavior as projects). Include associated tags in each item if available.
- Important behaviors to match from Projects:
    - Auth and error handling via the same mechanism used by Projects routes (ensure consistent response envelope and error messages).
    - Sorting support for sortBy and sortOrder only (no extra query params unless Projects supports them).
    - Response shape for list endpoints: { data: [...], count }.

4) UI: Assessments list page only (no single assessment view yet)
- Create app/assessments/page.tsx:
    - Use the assessments-prototype as the source of truth for visuals and interactions; replicate its layout, spacing, components, and micro-interactions within our current stack.
    - Match the page structure and styling patterns used by app/projects/page.tsx where applicable (navigation placement, shared components, theming).
    - Data loading:
        - Use assessmentsApi.getAssessments with the same sort state pattern and default sort order as Projects.
    - Rendering:
        - Display name, description (optional truncation consistent with Projects), tags (tag badges/pills using the same tag UI components/patterns).
        - Show created/updated timestamps only if Projects does, and with the same formatting.
    - Sorting:
        - Enable sorting by name (and any other fields Projects supports for sorting) using the same UI/handlers.
    - Empty/loading/error states:
        - Reuse the same components and visual patterns used on Projects.
    - Actions:
        - No create/edit/delete actions on this page; focus on loading data and rendering the list.
- Navigation:
    - Add navigation entry to reach /assessments in the same way Projects is added to the main navigation.
    - Breadcrumbs and titles consistent with Projects.

4a) Prototype UI parity tasks
- Audit the assessments-prototype to list:
    - Visual components (list vs cards vs table, header, action bar, filters, search, badges, icons, pagination if present).
    - Interaction patterns (hover states, focus states, sorting interactions, empty/loading/skeleton states).
    - Content mapping (which fields render where; how tags are displayed; any truncation/tooltip rules).
- Create a short mapping doc:
    - Map prototype data fields/props to current types (Assessment, Tag) without assuming names.
    - Map prototype fetch/update calls to assessmentsApi equivalents (replace any prototype-specific APIs).
- Port the visual components:
    - Extract reusable pieces (e.g., tag chips, list item/card shell) into our shared component style if appropriate.
    - Replace any prototype-specific libs/utilities with our existing equivalents to maintain consistency (date formatting, icons, theming).
- Accessibility and theming:
    - Ensure keyboard navigation and focus management match or improve upon the prototype.
    - Align colors, spacing, and typography with our existing design tokens/theme.

5) Deferred features
- Create and edit flows (pages/modals, forms, validation, mutations) will be implemented after all entity pages are in place.

6) Wiring and exports
- Ensure lib/api/index.ts exports assessmentsApi alongside projectsApi.
- Ensure any shared UI components used for Projects (e.g., Tag UI, table/list, empty state) are imported for Assessments or generically composed if they’re shared.

7) Testing and verification
- Manual tests:
    - Load the assessments list with and without tags (tags are optional).
    - Sorting: verify sortBy=name with asc/desc matches Projects behavior.
    - Count in list response matches the items shown.
    - Empty, loading, and error states render correctly.
- Visual parity checks:
    - Side-by-side comparison with the assessments-prototype for layout, spacing, states, and interactions.
    - Verify responsive behavior and breakpoints match the prototype’s intent.
- Edge cases:
    - Large tag sets or no tags.
    - Network/auth failures surfaced consistently via BaseApiService.

8) Migration/schema considerations (if needed)
- Confirm the backend DB has:
    - assessments table with fields: id, name, description, created_at, updated_at.
    - join table for assessments-to-tags (naming and structure consistent with Projects’ tag join table conventions).
- If Projects APIs are already wired to Supabase or another ORM/query layer, mirror the same patterns for assessments.

Deliverables checklist
- types/assessment.ts updated to include optional tags field.
- lib/api/assessments.ts added with read-only getAssessments method and response types aligned with projects.
- lib/api/index.ts exports assessmentsApi.
- app/api/assessments/route.ts implemented with GET list (auth, errors, sorting, response shape).
- app/assessments/page.tsx implemented to list all assessments with name, description, and tags, plus sorting and consistent empty/loading/error states.
- Prototype-to-implementation mapping doc created (fields, interactions, components), and visual parity verified against assessments-prototype.
- Navigation entry for Assessments added where Projects appears.

Notes on naming and conventions
- Follow file and class naming exactly like Projects:
    - AssessmentsApiService, assessmentsApi, getAssessments
    - Route files named identically to Projects’ routes, just under /assessments.
- Keep request/response envelopes identical to Projects (e.g., { data, count } for list).
- Use the same query param names and shapes (Pick<QueryParams, "sortBy" | "sortOrder">).
