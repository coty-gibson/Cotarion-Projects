# Proposal Management Sprint 2 Persistence Review Package

Date: 2026-07-20

Status: Approved

Product Architect Review: Passed

Product Owner Review: Passed

Sprint 3 Authorization: Granted — not started

## Scope delivered

Sprint 2 implements Proposal persistence only: additive schema and migrations, repositories, aggregate rehydration, concurrency-safe numbering, approved Engagement Type policy seed validation, immutable database records, representation/delivery metadata storage, and transactional outbox persistence. It adds no application service, UI, renderer, delivery adapter, Client-facing acceptance workflow, or Timeline projection.

## Schema and migrations

- Added Consulting operating-group and versioned Engagement Type policy storage.
- Added Proposal identity, mutable Draft/aggregate snapshot, immutable Proposal Versions, exactly-one Pricing source snapshots, immutable Proposal events, transactional outbox, and representation/delivery metadata.
- Added global Proposal sequencing and Proposal-local next-version allocation state.
- Applied two forward-only migrations to the development database.
- Expanded Pricing Project number validation to accept historical `EST-` and current `PP-` values.
- Preserved every issued Pricing Project number and advanced the existing numeric sequence without prefix-based reuse.
- Changed only future Pricing Project allocation to `PP-######`.

## Repository and rehydration design

- Proposal repository requires Company scope for reads and writes.
- Inserts validate the active Company-owned Consulting Engagement Type policy and a same-Company, same-Client, `QUOTED` Pricing source.
- Mutable aggregate projection and append-only versions/events are committed together.
- The aggregate exposes a persistence snapshot containing internal Draft revision counters; rehydration validates contract version, Proposal number, and Engagement Type policy identity before restoring behavior.
- Representation and delivery-attempt repositories are append-only metadata boundaries only.
- The outbox repository reads pending events deterministically and records publication success/failure without introducing a Timeline consumer.

## Number allocation

- `PRO-######` values use one atomic database upsert/increment transaction against a global sequence; gaps are permitted and values are never reused.
- Proposal Version rows have a unique `(proposalId, versionNumber)` constraint.
- Proposal-local allocation atomically increments `nextVersionNumber`; optimistic aggregate saves reject stale writers.
- New Pricing Projects continue the existing global numeric sequence and now use `PP-######`; existing `EST-######` rows remain unchanged and valid.

## Immutability protections

- Database triggers reject update/delete for Engagement Type policy versions, Proposal Versions, Proposal Pricing sources, Proposal events, representations, and delivery attempts.
- A dedicated trigger prevents Proposal-number changes.
- Foreign keys, composite Company keys, unique indexes, format checks, positive-number checks, and exactly-one Pricing-source identity protect persistence invariants.
- Repository APIs expose append-only creation for historical records and mutable operations only for the Proposal aggregate projection and outbox publication metadata.

## Transactional outbox

- Every new domain event is appended to both immutable `ProposalEvent` and pending `BusinessEventOutbox` rows in the same transaction as Proposal state.
- Event ID is the idempotency key in both tables.
- Pending events order by `occurredAt`, then `eventId`, providing deterministic future Timeline rebuild input.
- Publication retries update only outbox delivery metadata; they do not duplicate or alter the immutable business event.

## Acceptance criteria

| ADR-018 Sprint 2 criterion | Result | Evidence |
| --- | --- | --- |
| Migrations apply without modifying historical records | Passed | Both additive migrations deployed; mixed-prefix migration retains existing identifiers |
| Repository integration tests prove Company/Client isolation | Passed | Composite foreign keys, scoped reads, quoted-source validation, rollback-safe integration test |
| Concurrent creation cannot duplicate record or version numbers | Passed | Concurrent Proposal/Pricing allocation tests; atomic counters and unique version constraint |
| Historical versions and events cannot be mutated through repositories | Passed | Append-only repository API and database immutability triggers |
| State change and outbox event commit atomically | Passed | Shared Prisma transaction and database-backed rollback-safe integration test |
| Timeline can rebuild deterministically from published events | Passed at Sprint 2 event boundary | Retained immutable events and ordered outbox; no Timeline projection implemented |

## Validation

- Prisma format: passed.
- Prisma validate: passed.
- Prisma generate: passed.
- Migration deploy: passed.
- Migration status: database schema up to date with 8 migrations.
- ESLint: passed.
- TypeScript: passed.
- Full database-backed suite: 101 passed across 16 test files.
- Production build with development authentication disabled: passed.
- `git diff --check`: passed.

## Risks

1. Prisma still generates low-level update/delete methods for immutable models; database triggers are the final enforcement boundary.
2. JSON contract validation occurs during domain creation/rehydration and repository mapping rather than through PostgreSQL JSON Schema constraints.
3. Outbox publication monitoring and a Timeline projection remain future work.
4. The current database provider emitted an advisory-lock timeout once during the second migration; the unchanged migration succeeded on retry.
5. PostgreSQL client dependencies emit a forward-looking SSL-mode compatibility warning and a concurrent-query deprecation warning; neither caused a validation failure.

## Product Owner decisions

No unresolved Sprint 2 Product Owner decisions were found.

## Deferred

- application services and authorization policy derivation;
- internal Proposal workspace and UI;
- Web/PDF rendering and email delivery;
- Client-facing acceptance workflows;
- Timeline projection and Client History;
- Agreement handoff implementation.

Sprint 3 has not begun. Authorization has been granted for a future Sprint 3 start.
