# Proposal Management Sprint 3.4A Workspace Read Model Review Package

## Review status

- Scope: query, capability projection, timeline projection, public serialization, and command refresh contracts
- Implementation status: complete; awaiting Product Architect and Product Owner review
- React and Workspace UI: unchanged
- New Proposal commands or domain behavior: none
- Schema and migrations: unchanged

## 1. Contract reconciliation

| Requested Projection | Existing Source | Available | Action |
| --- | --- | --- | --- |
| Working Draft | Rehydrated aggregate `workingDraft` | Yes | Exposed as an explicit serialization-safe Draft DTO |
| Structured Content | `workingDraft.content` | Yes | Exposed as `structuredContent` |
| Commercial Terms | `workingDraft.commercialTerms` | Yes | Exposed |
| Recipients | `workingDraft.recipients` | Yes | Exposed |
| Pricing Snapshot | Aggregate `pricingSnapshot` and immutable Version snapshot | Yes | Current authoritative snapshot exposed on Draft; raw pricing event data is not exposed |
| Review Evidence | `qualityReviewRequestedByUserId` and review/submission events | Partial | Existing request, change-request, and Quality Review submission evidence projected; assignment and comments omitted |
| Authorization Evidence | `PROPOSAL_SUBMITTED` metadata for Executive Authorization | Partial | Existing authorized-and-submitted evidence projected; pending, reject, and return concepts omitted |
| Acceptance Evidence | Acceptances, current acceptance, withdrawals, viewed/declined events, Agreement ID | Yes, except Agreement timestamp | Existing evidence projected; Agreement link timestamp omitted because no Agreement-linked event exists |
| Timeline Evidence | Append-only Proposal events | Yes for event-backed actions | Stable safe timeline DTO created; Draft updates and Agreement linking omitted because they currently emit no Proposal event |
| Permitted Actions | Actor provider, capability evaluator, Proposal state | Yes | Computed at the application projection boundary by intersecting effective capabilities with the current authoritative state |
| Version evidence | Immutable Proposal Versions and submission event | Yes | Revision reason plus exact stored creation/submission evidence exposed |
| Replacement evidence | Proposal relationships and event metadata | Yes | Relationship IDs and event-backed timeline evidence exposed |
| Attachments | No approved Proposal contract | No | Omitted |
| Internal comments | No approved Proposal contract | No | Omitted |
| Open tasks | No approved Proposal contract | No | Omitted |
| Assigned reviewer | No authoritative assignment | No | Omitted |
| Returned review comments | No stored command input or evidence | No | Omitted |
| Version comparison | No approved deterministic comparison service | No | Omitted |

## 2. Workspace read-model architecture

`ProposalQueryService.load()` remains the authenticated workspace-detail operation. It:

1. resolves the authenticated actor;
2. enforces active status and Company isolation;
3. loads one aggregate through the repository abstraction;
4. requests effective Company-scoped capabilities;
5. maps aggregate state and existing events into public DTOs;
6. returns no aggregate, persistence model, or HTTP object.

List queries remain lightweight and unchanged.

## 3. Expanded DTO inventory

- `ProposalDetailReadModel` — expanded authoritative workspace detail.
- `ProposalDraftReadModel` — mutable current Draft projection.
- `ProposalVersionReadModel` — immutable Version summary with stored submission evidence.
- `ProposalReviewReadModel` — existing Quality Review evidence.
- `ProposalExecutiveAuthorizationReadModel` — existing executive-path submission evidence.
- `ProposalAcceptanceReadModel` — viewed, acceptance, withdrawal, decline, and Agreement evidence.
- `ProposalTimelineItemReadModel` — stable public activity item.
- `ProposalPermittedActionsReadModel` — actor- and state-specific attemptable command surface.

## 4. Working Draft projection

The API now exposes the current title, structured content, commercial terms, recipients, authoritative Pricing snapshot, expiration timestamp, and expiration override reason. The projection preserves the contract's null values and is JSON serialization-safe. It does not expose persistence revisions or mutable aggregate references.

## 5. Version projection

Each Version includes ID, number, `SAVED`/`SUBMITTED` status, creation timestamp and author, revision reason, and submission timestamp/actor when the existing Submission Event is bound to that Version. No timestamp or actor is inferred. Historical Version bodies remain unmodified and are not made mutable by the read contract.

## 6. Review projection

The projection truthfully represents `NOT_REQUESTED`, `PENDING`, `CHANGES_REQUESTED`, or `APPROVED` based on existing Quality Review request, returned-for-changes, and Quality Review submission evidence. Request/review timestamps and actors come from stored events. Reviewer assignment and comments are absent because neither concept currently exists.

## 7. Executive Authorization projection

The projection reports either `NOT_USED` or `AUTHORIZED_AND_SUBMITTED`. Authorization/submission timestamps, author, and Business Justification come exclusively from the existing Executive Authorization Submission Event. No pending authorization, assignee, authorize, reject, or return workflow was invented.

## 8. Acceptance projection

The projection preserves each Client-recorded or verbal acceptance as separate evidence, identifies the current acceptance, and returns withdrawals independently. Viewed and declined timestamps derive from their events. The executed Agreement ID is exposed from aggregate state. An Agreement-linked timestamp is omitted because the existing command does not emit or store that evidence.

## 9. Timeline projection design

Internal Proposal events are mapped to a closed public set of timeline types. Submission type is distinguished by stored submission method; replacement creation is distinguished by stored relationship metadata. Items are ordered by `occurredAt` and original event sequence as a stable tie-breaker.

Only safe fields are returned: ID, stable type, timestamp, actor, label, domain-authored display summary, and selected related record IDs. Raw metadata, Draft content, pricing input/output, acceptance notes, and Business Justification are not serialized into timeline items.

No synthetic timeline item is created for Draft updates or Agreement linking because those operations currently have no persisted Proposal event.

## 10. Permitted-action design

The application projection boundary intersects:

- the authenticated Company-scoped actor;
- effective capabilities from `ProposalCapabilityEvaluator`;
- current authoritative Proposal state;
- reviewer independence evidence available from the current Version.

The result indicates commands the actor may attempt. Full input-dependent invariants, optimistic concurrency, expiration timing, recipient authorization, replacement compatibility, and all final lifecycle decisions remain enforced by the existing application/domain command path. The HTTP adapter does not calculate actions.

## 11. Command refresh strategy

After each successful command, including idempotent replay, the HTTP adapter loads the affected Proposal through the authenticated `ProposalQueryService` and returns:

```text
{
  proposal: ProposalDetailReadModel,
  revision,
  idempotentReplay
}
```

The aggregate is no longer serialized into public command responses. Create and replacement commands refresh the newly created Proposal; supersession refreshes the original aggregate returned by the existing application service. Existing Request Identity behavior is preserved.

## 12. Explicitly omitted concepts

- attachments;
- internal comments;
- open tasks;
- assigned reviewers;
- returned review comments;
- Executive Authorization pending/reject/return behavior;
- semantic Version comparison;
- Draft-update timeline items;
- Agreement-linked timeline timestamps;
- raw domain events and metadata.

## 13. Persistence impact

No schema, migration, Prisma model, repository interface, or repository implementation changed. The existing repository already reconstructs all in-scope evidence in one Company-scoped aggregate load, so no additional query and no N+1 behavior were necessary.

## 14. Test coverage and validation

Focused tests cover:

- expanded serialization-safe workspace detail;
- Draft and Pricing snapshot exposure;
- review and executive-path evidence;
- acceptance and withdrawal evidence;
- stable timeline mapping and deterministic ordering;
- suppression of raw metadata, sensitive Draft content, pricing input, and Business Justification;
- capability/state intersection and reviewer independence;
- Company isolation and inactive/unknown actors;
- unchanged lightweight list queries;
- authoritative command refresh after every command route;
- revision and idempotent replay envelope preservation.

Validation results:

- Focused query/projection/HTTP tests: passed — 3 files, 27 tests.
- Full database-backed suite: passed — 26 files, 163 tests.
- Proposal persistence integration tests: passed — 6 tests.
- TypeScript (`tsc --noEmit`): passed.
- ESLint: passed.
- Production Next.js build: passed.
- `git diff --check`: passed (line-ending conversion notices only; no whitespace errors).

Environmental validation note: the first full-suite run was intentionally launched concurrently with the production build and one pre-existing Client integration test timed out acquiring a database transaction. That test passed immediately when isolated, and the complete suite then passed when rerun without concurrent build load. This was environmental database contention, not an implementation failure.

Non-failing upstream notices remain for the Vite CJS Node API, future PostgreSQL SSL-mode semantics, and an existing concurrent-query deprecation in the PostgreSQL driver.

## 15. ADR compliance

- ADR-017: Proposal owns lifecycle evidence; Pricing remains an immutable consumed snapshot.
- ADR-018: Sprint 3 business state remains separate from Sprint 4 representation/delivery state.
- ADR-019: Quality Review and Executive Authorization remain distinct; Business Justification is exposed only where existing evidence records it.
- ADR-020: effective authority remains Company-scoped and capability-derived; role names do not enter the Proposal domain or public action projection.
- ADR-021: Pricing remains authoritative; the read model exposes but never recalculates the approved immutable Pricing snapshot.

## 16. Files changed for Sprint 3.4A

- `src/application/proposals/proposal-workspace-projection.ts`
- `src/application/proposals/proposal-workspace-projection.test.ts`
- `src/application/proposals/proposal-query-service.ts`
- `src/application/proposals/proposal-query-service.test.ts`
- `src/interfaces/http/proposals/proposal-http-adapter.ts`
- `src/interfaces/http/proposals/proposal-http-adapter.test.ts`
- `src/infrastructure/proposal-production-composition.ts`
- `docs/Proposal_Management_Sprint_3_4A_Workspace_Read_Model_Review_Package.md`

Other uncommitted repository changes predate Sprint 3.4A and were preserved.

## 17. Review gate confirmation

- React was not modified.
- No Proposal command or domain behavior was added.
- No undefined workflow concept was implemented.
- Sprint 3.5B remains paused.
- PDF, Client Portal, email, reporting, analytics, and Sprint 4 work have not begun.
