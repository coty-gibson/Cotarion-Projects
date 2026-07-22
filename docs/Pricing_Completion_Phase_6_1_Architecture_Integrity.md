# Pricing Completion — Phase 6.1 Architecture Integrity

Date: 2026-07-21

Status: Implemented; architecture conformance review pending

## Purpose

Phase 6.1 is the final Pricing architecture sprint. It closes verified bounded-context and audit-integrity concerns without adding Pricing Engine behavior, commercial-input design, configuration administration, Proposal integration, or another bounded context.

## Implemented architecture

- Pricing commands remain authoritative through authentication, Company scope, Pricing capabilities, aggregate lifecycle enforcement, optimistic concurrency, and one transactional aggregate repository save.
- Processed-command and governance-event identities are inserted incrementally without duplicate suppression. A conflicting Company command identity or global event identity fails the transaction, so aggregate state cannot commit without its required audit evidence.
- Identical aggregate command replay remains idempotent and emits no duplicate event evidence.
- Pricing detail and editable-Draft queries expose actor-aware `permittedActions`.
- Lifecycle legality comes from the same Pricing domain transition policy used by the aggregate. The query service filters those transitions through the authenticated actor's Pricing capabilities.
- React renders only server-projected actions. Command services and the aggregate validate every submitted action again, so a stale projection can still receive a stable `403` or domain conflict.
- Query repositories continue to read Prisma persistence directly without reconstructing the Pricing aggregate.
- The obsolete Phase 4 Pricing workspace application path and its UI-oriented E2E specifications are retired.
- Phase 4 normalized persistence contracts and adapters remain explicitly quarantined only for historical migration compatibility. They are not composed into production command, query, HTTP, presentation, or current test flows. Their obsolete tests and direct lifecycle-status mutation method have been removed.

## Pricing governance status

The implemented lifecycle is:

1. A mutable `DRAFT` may be updated and explicitly saved as an immutable Pricing Version.
2. Quality Review binds an existing Version representing the current Draft.
3. The Version creator cannot approve or reject that Version.
4. Approval selects the reviewed immutable Version and moves the Project to `QUOTED`.
5. Beginning a revision returns a `QUOTED` Project to `DRAFT` without rewriting prior Versions or review evidence.
6. Archive is terminal and is allowed only from domain-permitted states with the required actor capability.

This implementation evidence does not itself change ADR approval status. Product Owner operational acceptance and release governance remain explicit later gates.

## Explicitly excluded product work

- Pricing Engine or commercial recalculation
- structured commercial-input editing
- Client, owner, Service Catalog, or Pricing Configuration selection experiences
- Pricing Configuration administration
- Proposal integration
- Agreement or Engagement work

These exclusions are product opportunities, not missing Phase 6.1 architecture.

## Verification

- TypeScript type checking passed.
- The database-backed full suite passed: 36 test files and 250 tests, with no skipped tests.
- The Pricing governance repository integration suite passed identical replay, conflicting command identity, conflicting event identity, and rollback scenarios.
- The optimized Next.js production build passed with development authentication disabled, as required by the production guard.
- The Pricing presentation forbidden-import audit passed.
- The legacy Pricing workspace/direct-status reference audit passed.
