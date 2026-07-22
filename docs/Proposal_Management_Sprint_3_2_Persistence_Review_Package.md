# Proposal Management Sprint 3.2 Persistence Review Package

Date: 2026-07-21

Status: Implementation complete — awaiting Product Architect and Product Owner review

Scope: Proposal repository and database persistence only

## 1. Repository architecture summary

Sprint 3.2 adds an application-layer `ProposalRepository` port and a Prisma adapter. The repository persists `ProposalAggregate` as the aggregate root, reconstructs it through the domain rehydration API, and contains no lifecycle, authorization, or other business decisions.

The public adapter owns transaction boundaries. Transaction-aware functions are also exported so a future application service can compose Proposal persistence with other writes without nesting transactions.

## 2. Persistence model summary

The existing normalized Proposal persistence model remains authoritative:

- `Proposal` stores aggregate identity, mutable lifecycle projection, frozen Pricing snapshot, current/submitted bindings, replacement relationships, review requester, and concurrency revision.
- `ProposalVersion` stores immutable Proposal-local versions.
- `ProposalPricingSource` stores the immutable Pricing snapshot associated with each version.
- `ProposalEvent` stores append-only Proposal business history.
- `BusinessEventOutbox` stores the corresponding append-only transactional outbox records.

The aggregate JSON column remains a consistency snapshot. Retrieval reconstructs state from normalized rows and rejects drift between that reconstruction and the snapshot.

## 3. Schema and migration summary

The additive migration `20260721000100_proposal_sprint_3_2_persistence` adds:

- `qualityReviewRequestedByUserId`;
- `supersedesProposalId`;
- non-negative integer `aggregateRevision`;
- same-Company foreign keys for the review requester and both replacement directions;
- aggregate-owned current/submitted version foreign keys; and
- replacement lookup indexes.

No existing identifier, table, column, or enum value was removed or renamed. The migration was deployed successfully, and Prisma reports all nine migrations applied.

## 4. Aggregate mapping and rehydration strategy

Writes map the complete domain persistence state into normalized records. New versions, their Pricing sources, Proposal events, and outbox records are appended; the root projection and aggregate snapshot are then advanced.

Reads are Company-scoped and load the root with all versions, Pricing sources, and events. The mapper:

1. rebuilds immutable versions and their exact Pricing snapshots;
2. restores events in aggregate snapshot order;
3. overlays normalized lifecycle, review, version-binding, and replacement fields;
4. verifies the normalized reconstruction exactly matches the stored aggregate snapshot; and
5. calls `ProposalAggregate.rehydrate`.

Malformed or drifting persistence data raises `ProposalPersistenceMappingError` instead of producing a partially reconstructed aggregate.

## 5. Transaction strategy

Insert and save operations execute atomically in Prisma transactions. A write includes the aggregate projection, immutable versions, Pricing sources, business events, and outbox records. Any validation, foreign-key, immutability, or conflict failure rolls back the entire unit of work.

Submission therefore persists the `SUBMITTED` transition, submitted-version binding, exactly one `PROPOSAL_SUBMITTED` event, and its outbox record together.

## 6. Optimistic concurrency and numbering

Each Proposal root has an integer `aggregateRevision`. `save` claims the expected revision with a conditional update and increments it. A stale expected revision raises `ProposalConcurrencyError`, preventing lost updates.

Proposal numbers continue to use the existing database sequence allocator and remain globally unique. Proposal Version numbers remain domain-assigned sequential values, protected by optimistic concurrency and the existing unique `(proposalId, versionNumber)` constraint.

## 7. Immutability and append-only behavior

- Existing database triggers continue to reject updates and deletes of Proposal Versions and their Pricing sources.
- Submitted-version binding is constrained to a version owned by the same Proposal.
- Existing immutable versions are accepted only when their full persisted content matches; conflicting reuse raises `ProposalImmutableConflictError`.
- Existing events and outbox records are likewise content-checked, never overwritten, and never deleted by the repository.
- A transactional failure after an attempted aggregate update rolls back the root revision, event history, and outbox together.

## 8. Company isolation

Repository reads require both `companyId` and Proposal identity. Insert validation confirms Company ownership of the active Engagement Type policy, Client, owner, and eligible `QUOTED` Pricing Project. Composite foreign keys enforce Company consistency for aggregate relationships, review evidence, version binding, and replacement links.

## 9. Test coverage summary

Five database integration tests cover:

- concurrent globally unique Proposal number allocation and idempotent policy seeding;
- Proposal creation, version persistence, submission, normalized reconstruction, and Company-scoped retrieval;
- submitted Proposal Version database immutability;
- replacement Proposal relationships without mutation of original submitted history;
- integer optimistic concurrency and stale-writer rejection;
- append-only event and outbox persistence;
- atomic rollback on immutable event conflict; and
- cleanup/rollback isolation from other database test files.

## 10. Validation results

| Validation | Result |
| --- | --- |
| Prisma format | Passed |
| Prisma validate | Passed |
| Prisma client generation | Passed |
| Migration deployment | Passed |
| Migration status | Passed — 9 migrations applied, database up to date |
| Focused Proposal persistence suite | Passed — 5 tests |
| Complete Vitest suite with database | Passed — 111 tests across 17 files |
| TypeScript `tsc --noEmit` | Passed |
| ESLint | Passed |
| Production Next.js build | Passed |
| `git diff --check` | Passed (line-ending notices only) |

The test environment emitted upstream PostgreSQL SSL-mode and Vite CJS deprecation warnings; neither affected validation.

## 11. ADR compliance summary

### ADR-017 and ADR-018

- Proposal remains the aggregate root and Proposal Version remains an immutable child.
- Submission state, submitted-version binding, business event, and outbox persistence are atomic.
- Replacement links preserve original Proposal and Version history.
- No Sprint 4 representation or delivery work was introduced.

### ADR-019 and ADR-020

- Governance evidence supplied by the domain is preserved without repository authorization decisions.
- Company isolation is enforced in repository predicates, validations, and database relationships.
- No role, Founder/Admin, capability-resolution, authentication, or authorization behavior was implemented.

### ADR-021

- Proposal consumes and preserves exactly one supplied immutable `QUOTED` Pricing snapshot.
- The repository neither recalculates nor changes Pricing state.

## 12. Files changed for Sprint 3.2

- `prisma/schema.prisma`
- `prisma/migrations/20260721000100_proposal_sprint_3_2_persistence/migration.sql`
- `src/application/proposals/proposal-repository.ts`
- `src/infrastructure/database/proposal-repository.ts`
- `src/infrastructure/database/proposal-repository.integration.test.ts`
- `docs/Proposal_Management_Sprint_3_2_Persistence_Review_Package.md`

The approved Sprint 3.1 domain files remain present in the working tree but were not weakened or expanded for persistence convenience.

## 13. Known risks and deferred work

- The aggregate JSON consistency snapshot duplicates normalized state by design; strict comparison turns drift into an explicit failure that requires repair rather than silently selecting one representation.
- The legacy `nextVersionNumber` column remains for additive compatibility but is not used by the repository; version sequencing belongs to the domain and is serialized by aggregate concurrency.
- Direct database access outside the repository could bypass repository-level content comparisons, although database triggers and constraints remain the final immutability and relationship barrier.
- Application services, capability resolution, authorization, APIs, routes, UI, representations, delivery, search, reporting, and background processing remain deferred and were not started.

## 14. Review decision requested

Product Architect and Product Owner review is requested for Sprint 3.2. No Sprint 3 application-service or workspace implementation has begun.
