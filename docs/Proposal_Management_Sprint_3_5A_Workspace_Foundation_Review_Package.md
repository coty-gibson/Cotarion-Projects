# Proposal Management Sprint 3.5A Workspace Foundation Review Package

## Review status

- Sprint: 3.5A — Cotarion Workspace Foundation
- Scope: reusable authenticated internal workspace and read-only Proposal screens
- Implementation status: complete; awaiting Product Architect and Product Owner review
- Proposal editing, Draft editing, submission UI, representation, publication, and delivery: not begun

## 1. Workspace architecture

The existing protected server layout remains the authentication gate. It resolves the current Application User and redirects unauthenticated requests before rendering the workspace. `AppShell` delegates presentation to the reusable client-side `WorkspaceChrome`, which owns responsive navigation, breadcrumbs, theme selection, the content landmark, and the notification viewport.

The dependency flow is:

`Protected layout -> WorkspaceChrome -> read screen -> ProposalApiClient -> authenticated Proposal HTTP API`

React does not import repositories, Prisma, capability evaluators, or Proposal domain objects. Server-owned state is rendered from serialization-ready API read models.

## 2. Component inventory

- `WorkspaceChrome` — responsive shell, desktop/mobile navigation, header, breadcrumbs, theme control, user context, and content landmark.
- `PageHeader` — consistent page title, description, eyebrow, and action placement.
- `Panel` and `Card` — reusable information containers.
- `DataTable` — responsive tabular wrapper with accessible captions and scoped headers.
- `StatusBadge` — presentation-only status label treatment.
- `Timeline` — ordered lifecycle milestone presentation.
- `LoadingState`, `EmptyState`, and `ErrorState` — standard asynchronous states.
- `FormField`, `TextInput`, and `SelectInput` — shared form controls.
- `Pagination` — deterministic previous/next controls.
- `ConfirmDialog` — modal confirmation primitive with dialog semantics.
- `ToastProvider` and `ToastViewport` — local, non-domain UI notifications.

## 3. Navigation map

- Dashboard — active existing route.
- Clients — active existing route.
- Proposals — active Sprint 3.5A route.
- Pricing — active existing route.
- Projects, Agreements, HR, Marketing, Technology, Administration — visible future module positions marked unavailable; no feature routes were introduced.

The shell supports a persistent desktop sidebar and a labelled mobile drawer. Proposal detail routes generate breadcrumbs from the active pathname.

## 4. API client architecture

`ProposalApiClient` is a small same-origin HTTP adapter for only:

- `GET /api/proposals`
- `GET /api/proposals/{proposalId}`

It supplies the authenticated browser credentials, Company scope header, and a UUID correlation ID. It serializes filters and cursor pagination, performs one retry for network or server failures, and converts safe API envelopes into typed read models or `WorkspaceApiError`. It does not encode lifecycle, capability, review, or authorization decisions.

## 5. Screen inventory

### Proposal list

Displays Proposal number, title, Client ID, owner ID, lifecycle status, updated date, and version count. It supports server-backed status, Client, and owner filters plus cursor pagination. Loading, error, and empty results use shared workspace states.

### Proposal detail

Displays the Proposal summary, lifecycle status, current/submitted version references, immutable version summaries, replacement relationships, Agreement reference, and API-exposed lifecycle timestamps. It is strictly read-only and does not expose aggregate internals or event storage.

## 6. Accessibility summary

- Semantic `main`, `nav`, `header`, `section`, table, ordered-list, and time elements are used.
- Primary, breadcrumb, mobile, and pagination navigation have accessible labels.
- Current navigation uses `aria-current`; unavailable destinations use `aria-disabled`.
- Loading and error states use live-region semantics.
- Dialogs expose `role="dialog"`, `aria-modal`, and a labelled title.
- Buttons and form controls remain keyboard operable with visible focus styles.
- Tables include hidden captions and scoped column headers.
- Responsive navigation controls publish expanded state.

The component tests provide baseline semantic accessibility checks. A full automated browser accessibility scanner is not configured in the repository and was not added in this sprint.

## 7. Test coverage

Twelve focused tests cover:

- workspace landmarks, navigation, future-module states, responsive controls, and theme control;
- loading, error, empty, dialog, pagination, table, badge, and timeline semantics;
- Proposal list populated and empty rendering;
- Proposal detail, version, relationship, Agreement, and lifecycle rendering;
- API Company/correlation headers, credentials, query serialization, ID encoding, retry, safe error translation, and network failure behavior.

The pre-existing authentication, API, application, domain, persistence, and Company-isolation tests remain green in the full suite.

## 8. Performance observations

- No global state library or query dependency was added; state remains local to each read screen.
- Only read-screen code hydrates on Proposal routes.
- The production build reports approximately 3.11 kB route code for `/proposals` and 3.27 kB for `/proposals/[proposalId]`, with 116 kB first-load JavaScript for each route.
- Cursor pagination bounds list payloads and rendering work.
- API retries are limited to one retry and apply only to transport/server failures.

## 9. Files changed for Sprint 3.5A

- `src/app/globals.css`
- `src/app/(protected)/proposals/page.tsx`
- `src/app/(protected)/proposals/[proposalId]/page.tsx`
- `src/presentation/layouts/app-shell.tsx`
- `src/presentation/layouts/workspace-chrome.tsx`
- `src/presentation/layouts/workspace-chrome.test.tsx`
- `src/presentation/components/auth/sign-out-button.tsx` (React test-runtime import only)
- `src/presentation/components/ui/workspace-primitives.tsx`
- `src/presentation/components/ui/workspace-primitives.test.tsx`
- `src/presentation/components/ui/toast.tsx`
- `src/presentation/api/proposal-api-client.ts`
- `src/presentation/api/proposal-api-client.test.ts`
- `src/presentation/screens/proposals/proposal-list-screen.tsx`
- `src/presentation/screens/proposals/proposal-detail-screen.tsx`
- `src/presentation/screens/proposals/proposal-read-screens.test.tsx`
- `docs/Proposal_Management_Sprint_3_5A_Workspace_Foundation_Review_Package.md`

Other uncommitted repository changes predate Sprint 3.5A and were preserved.

## 10. Validation results

- Focused presentation tests: passed — 4 files, 12 tests.
- Full test suite: passed — 25 files, 157 tests.
- TypeScript (`tsc --noEmit`): passed.
- ESLint: passed.
- Production build: passed.
- Semantic accessibility checks: passed through focused component tests.
- `git diff --check`: passed (line-ending conversion notices only; no whitespace errors).

Non-failing environment notices:

- Vitest reports the upstream Vite CJS Node API deprecation notice.
- Database-backed tests report the PostgreSQL driver's future SSL-mode compatibility notice and an existing concurrent-query deprecation notice.

## 11. Architecture and scope confirmation

- React contains presentation and request-state behavior only.
- The Proposal API remains authoritative.
- Proposal screens consume only authenticated HTTP APIs.
- There is no direct Prisma, repository, authority-storage, or capability evaluation access from the UI.
- No Proposal lifecycle decision was introduced in React.
- No Proposal editing, Draft editing, Quality Review, Executive Authorization, acceptance action, replacement action, PDF, portal, email, reporting, analytics, or Sprint 4 behavior was implemented.
- Sprint 3.5B has not begun.
