# Proposal Management Sprint 3.5B Proposal Workspace Review Package

## Review status

- Sprint: 3.5B — Interactive Proposal Workspace
- Implementation status: complete; awaiting Product Architect and Product Owner review
- Scope: authenticated Proposal authoring, governance, decision, relationship, evidence, and lifecycle interactions supported by the existing HTTP API
- Schema, migrations, domain lifecycle, capability policy, and HTTP contracts: unchanged

## 1. Workspace information architecture

The Proposal detail route now renders a responsive operating workspace with:

1. identity, lifecycle status, current Version, expiration, and server-permitted actions;
2. editable or read-only working Draft;
3. immutable Pricing snapshot evidence;
4. immutable Version history;
5. Quality Review evidence;
6. Executive Authorization evidence;
7. acceptance, withdrawal, decline, and Agreement evidence;
8. replacement and supersession relationships; and
9. the ordered public timeline supplied by the server.

The existing authenticated Workspace shell, navigation, theme support, list screen, shared cards, panels, tables, badges, asynchronous states, and notification viewport remain in use.

## 2. API commands integrated

The typed `ProposalApiClient` now exposes one method for every command supported by both the HTTP adapter and `ProposalPermittedActionsReadModel`:

- `PATCH /api/proposals/{id}/draft`
- `POST /api/proposals/{id}/versions`
- `POST /api/proposals/{id}/quality-review`
- `POST /api/proposals/{id}/request-changes`
- `POST /api/proposals/{id}/submit/quality-review`
- `POST /api/proposals/{id}/submit/executive-authorization`
- `POST /api/proposals/{id}/viewed`
- `POST /api/proposals/{id}/acceptances/client`
- `POST /api/proposals/{id}/acceptances/verbal`
- `POST /api/proposals/{id}/acceptances/withdraw`
- `POST /api/proposals/{id}/agreement`
- `POST /api/proposals/{id}/decline`
- `POST /api/proposals/{id}/expire`
- `POST /api/proposals/{id}/replacements`
- `POST /api/proposals/{id}/supersede`
- `POST /api/proposals/{id}/archive`

Send, resend, representation, publication, and delivery controls were not added because no approved Proposal command endpoint exists for them.

## 3. Working Draft

The Draft panel renders title, structured sections, commercial terms, recipients, expiration, and expiration override evidence. Edit mode appears only when `permittedActions.updateDraft` is true. It initializes from the authoritative DTO, preserves sections and recipients as structured controls, submits only fields accepted by the Draft HTTP contract, and supports cancellation without changing confirmed state.

Pricing is excluded from Draft editing. The Pricing panel renders the stored Pricing Project identity, model, methodology, engine, configuration, approval evidence, and output snapshot without calculation or Pricing-domain imports.

## 4. Immutable and governance evidence

Version history renders the server-provided Version identity, number, status, creation and submission evidence, revision reason, and current-Version indication. Saving a Version collects only the optional revision reason.

Quality Review renders only `NOT_REQUESTED`, `PENDING`, `CHANGES_REQUESTED`, and `APPROVED` evidence returned by the read model. Its three commands are shown independently from their matching permitted-action booleans. No reviewer assignment or returned comments were added.

Executive Authorization renders only `NOT_USED` or `AUTHORIZED_AND_SUBMITTED` evidence. Submission collects the actual required Business Justification. No pending, rejection, queue, or return workflow was added.

Acceptance and relationship panels use the dedicated acceptance and relationship DTO fields rather than reconstructing evidence from events.

## 5. Permitted-actions strategy

A single presentation mapping associates each `ProposalPermittedActionsReadModel` key with its label, dialog input shape, emphasis, and description. An entry is visible only when the matching server boolean is `true`. `updateDraft` controls only the Draft edit affordance.

React does not inspect lifecycle status, owner, current Version, actor identity, role, capability, reviewer identity, or Draft content to decide whether an action is available. Local `busy` state may temporarily disable controls solely to prevent duplicate transport submissions.

## 6. Command state and idempotency

Every command uses a UUID Request Identity in the `idempotency-key` header. Retries reuse the same key. A successful command replaces the complete local Proposal value with `commandResponse.proposal`; status, Version history, evidence, timeline, and permitted actions are never patched or predicted locally.

Replacement creation is the one command that returns a newly created Proposal rather than the Proposal identified by the current route. After preserving that refreshed replacement DTO as local state, the workspace updates browser history to `/proposals/{response.proposal.id}` without issuing another request. Ordinary commands returning the current Proposal ID do not navigate. An idempotent replacement replay follows the same canonical route behavior. A browser refresh subsequently uses the canonical route ID and loads that same replacement through the normal detail query.

An idempotent replay is reported as successful feedback. Failed commands retain the last confirmed Proposal. Conflict messages direct the user to reload before retrying. Initial-load failures retain the established retry state.

## 7. Timeline

The earlier client-constructed created/effective/closed/updated timeline was removed. The workspace renders `proposal.timeline` in its server-provided order using only label, summary, and timestamp from each public timeline item. It does not consume raw event metadata, create Draft-update events, expose Business Justification in the timeline, or fabricate an Agreement-link timestamp.

## 8. Accessibility and responsive behavior

- Forms use labelled controls, native required/length/date/email constraints, fieldsets, and keyboard-operable buttons.
- Command dialogs expose `role="dialog"`, `aria-modal`, a labelled title, focused initial controls, cancel behavior, and accessible error announcements.
- Opening a command dialog moves focus inside it and makes background workspace sections inert. Tab and Shift+Tab wrap inside the dialog. Escape closes an idle dialog, is ignored during command execution, and focus returns to the action button after closing.
- Command and load errors use alert/live-region behavior.
- Tables retain captions and scoped headers.
- Actions wrap responsively; Draft controls move from one to two columns at wider breakpoints.
- Consequential commands use descriptive confirmation dialogs and text labels rather than color alone.

## 9. Tests added and updated

Focused coverage verifies:

- expanded Draft, Pricing, Version, review, authorization, acceptance, relationship, and timeline rendering;
- read-only versus editable Draft behavior from `updateDraft`;
- action mapping exclusively from `permittedActions`, including a lifecycle status with no permission;
- removal of the synthetic client timeline;
- every actual command endpoint and request method;
- Draft and Version command payloads;
- stable Request Identity across retries;
- refreshed Proposal replacement and immediate refreshed-action rendering;
- confirmed-state preservation after command errors;
- duplicate command suppression while pending; and
- same-Proposal commands retaining the current route;
- replacement creation and idempotent replay navigating to the refreshed replacement's canonical route;
- refresh loading by that canonical route identity; and
- dialog initial focus, focus trapping, Escape behavior, pending-command protection, background inertness, and focus restoration; and
- unchanged Proposal list links and evidence.

## 10. Files changed for Sprint 3.5B

- `src/app/globals.css`
- `src/presentation/api/proposal-api-client.ts`
- `src/presentation/api/proposal-api-client.test.ts`
- `src/presentation/screens/proposals/proposal-detail-screen.tsx`
- `src/presentation/screens/proposals/proposal-workspace-panels.tsx`
- `src/presentation/screens/proposals/proposal-read-screens.test.tsx`
- `src/presentation/screens/proposals/proposal-workspace-interaction.test.tsx`
- `docs/Proposal_Management_Sprint_3_5B_Proposal_Workspace_Review_Package.md`

Other working-tree changes predate Sprint 3.5B and were preserved.

## 11. Validation results

Validation was run sequentially:

- Focused blocker presentation/API-client tests: passed — 3 files, 17 tests.
- Complete focused Proposal presentation/API-client suite: passed — 5 files, 21 tests.
- Relevant Proposal projection/query/HTTP tests: passed — 3 files, 28 tests.
- Full database-backed suite: passed — 27 files, 170 tests.
- TypeScript (`tsc --noEmit`): passed.
- ESLint: passed.
- Production Next.js build with development authentication disabled: passed.
- `git diff --check`: passed with line-ending conversion notices only.

The first sandboxed build attempt was blocked from spawning compiler workers (`EPERM`). An unrestricted build compiled successfully but correctly rejected development authentication in production. The final production build passed with `ENABLE_DEV_AUTH=false`, matching the repository's production requirement.

Non-failing upstream notices remain for the Vite CJS Node API, future PostgreSQL SSL-mode semantics, and the existing concurrent-query deprecation in the PostgreSQL driver.

## 12. Explicit omissions and API reconciliation

No API/UI mismatches blocked a projected action: every `permittedActions` field has a matching existing command endpoint.

The sprint intentionally omits attachments, internal comments, open tasks, assigned reviewers, returned review comments, Executive Authorization pending/reject/return behavior, semantic Version comparison, Draft-update timeline events, Agreement-link timeline timestamps, raw events, Proposal sending/resending, representation generation, publication, delivery, PDF, portal, email, reporting, and analytics.

## 13. Architecture confirmation

- React does not calculate Proposal lifecycle eligibility.
- React does not calculate authority or inspect roles/capabilities.
- React does not infer reviewer independence.
- React does not determine Draft/Version currency.
- React renders actions only from server-provided permitted-action booleans.
- Successful commands replace state with the refreshed `ProposalDetailReadModel`.
- Command failures are retained because the domain remains final authority.
- The timeline comes exclusively from the server projection.
- Pricing snapshot values are displayed and never recalculated.
- Company scope remains supplied by the authenticated route and established API-client header; users cannot select or override it.
- Undefined concepts were not invented.
