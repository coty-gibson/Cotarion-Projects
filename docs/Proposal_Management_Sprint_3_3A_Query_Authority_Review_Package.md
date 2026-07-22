# Proposal Management Sprint 3.3A Query and Authority Review Package

Date: 2026-07-21

Status: Implementation complete — awaiting Product Architect and Product Owner review

Scope: Proposal query boundaries, production authority adapters, minimum ADR-019/ADR-020 authority persistence, and production composition

## 1. Query architecture summary

`ProposalQueryService` is the Company-scoped application read boundary for future API adapters. It resolves an authenticated active actor, enforces the requested Company boundary, and delegates all storage access to `ProposalRepository`.

The service supports load by Proposal ID and deterministic list queries. It contains no HTTP behavior, UI formatting, lifecycle transitions, governance decisions, reporting, analytics, or global search.

## 2. Proposal read-model definition

The list read model contains serialization-safe primitives:

- Proposal ID and permanent number;
- Company, Client, and owner IDs;
- title and lifecycle status;
- current and submitted version numbers;
- version count;
- created, updated, effective, and closed ISO timestamps.

The detail read model adds Engagement Type, current/submitted version IDs, replacement links, executed Agreement link, and immutable version summaries. It does not expose a mutable aggregate.

## 3. Query repository inventory

`ProposalRepository` now supports:

- Company-scoped `findById`;
- Company-scoped `findByEventId` for command replay;
- Company-scoped `list`;
- optional status, Client, and owner filters;
- stable ordering by `updatedAt DESC, id DESC`; and
- opaque cursor pagination using the same ordered tuple.

Prisma stays inside infrastructure. Listing selects only summary data and aggregate-owned version relations.

## 4. Actor-context resolution flow

The production actor adapter resolves:

```text
AuthenticatedIdentity
→ ApplicationUser by authUserId
→ exact normalized email match
→ Company membership
→ active/inactive status
→ ProposalActorContext
```

Unknown identities return no actor. Inactive users resolve with `active: false` so application boundaries can distinguish inactive membership from an unknown identity. Actor identity never enters the Proposal domain.

## 5. Authority persistence model

The additive persistence model separates baseline membership from governance authority:

- `ApplicationUser.role` remains the existing Member baseline.
- `CompanyFounderSeat` is a Company-owned unique current seat with zero or one same-Company occupant and effective timestamp.
- `CompanyAdminAssignment` is an effective-dated same-Company assignment. A partial unique index prevents two simultaneously active assignments for one user and Company.
- `RoleAdministrationAudit` is permanent structured evidence for bootstrap, transfer, recovery, Admin assignment, revocation, and relinquishment.

Audit evidence records Company, actor identity, optional Company actor, affected user, action, Business Justification, previous/resulting authority, administration method, timestamp, and structured evidence. A database trigger rejects audit updates and deletes.

Authority changes and their audit records commit in one database transaction. Composite foreign keys prevent cross-Company occupants and Admin assignments.

## 6. Capability matrix and evaluation strategy

The concrete authority provider calculates one effective role for one active actor in one Company:

| Capability group | Member | Admin | Founder |
| --- | --- | --- | --- |
| Standard Proposal creation, Draft, version, review-request, Client activity, acceptance, lifecycle, replacement, supersession, archive | Yes | Yes | Yes |
| Quality Review | No | Yes | Yes |
| Executive Authorization | No | Yes | Yes |

Founder is derived only from current Founder Seat occupancy. Admin is derived only from an active Admin assignment. Founder/Admin capability names never enter the domain; services pass only governance evidence.

Inactive users receive no effective authority. Members are not granted Quality Review or Executive Authorization.

## 7. Founder bootstrap strategy

### New Company

`bootstrapNewCompanyFounder` requires the affected user to be the identified active Company creator. It creates the unique Founder Seat and first immutable audit record atomically and is idempotent only for the same seat occupant and audit identity. A different bootstrap attempt is rejected as a conflicting Founder Seat.

Company provisioning must invoke this operation inside the same provisioning consistency boundary as Company creation. It must not select a user from login order, email, seed order, or existing membership order.

### Existing Company

No existing Company or user was automatically elevated by the migration. An existing Company without governed Founder evidence must be initialized manually through `recoverFounder`, not the new-Company bootstrap operation.

The platform operator must supply:

- an identified operator identity;
- the affected Company and active successor;
- a meaningful Business Justification explaining why ordinary bootstrap evidence is unavailable;
- the documented recovery condition and verification evidence; and
- a permanent audit identity and timestamp.

Recovery refuses to replace an active Founder. It gives the platform operator no Company business capability.

### Transfer and Admin administration

- Only the current active Founder can transfer the seat or administer another user's Admin assignment.
- Transfer requires another active same-Company successor and Business Justification.
- The outgoing Founder becomes Member unless `retainOutgoingAdmin` is explicit.
- Any stale Admin assignment for a new Founder is closed so one effective default role remains.
- An Admin may relinquish only their own assignment.

## 8. Production composition summary

`createProductionProposalServices` constructs:

- the Prisma-backed actor-context provider;
- Prisma-backed Company authority provider;
- default Proposal capability evaluator;
- Proposal repository;
- Proposal unit of work;
- `ProposalApplicationService`; and
- `ProposalQueryService`.

The future API layer can consume this composition without importing Prisma or authority tables.

## 9. Error model

Query and authority boundaries preserve distinct failures for unknown/inactive actors, Company mismatch, Proposal not found, invalid pagination, missing authority configuration, conflicting Founder Seat, capability denial, invalid governance evidence, domain failures, and persistence conflicts.

Governance configuration failures are not flattened into authentication failures.

## 10. Test coverage and validation

Tests cover:

- detail loading and serialization-safe read models;
- unknown, inactive, cross-Company, and not-found outcomes;
- status, Client, and owner filtering;
- stable sorting and deterministic cursor pagination;
- Founder bootstrap and idempotency;
- duplicate Founder rejection and recovery protection;
- Admin assignment and revocation;
- Founder transfer and outgoing role behavior;
- inactive authority;
- cross-Company assignment rejection;
- immutable structured audit evidence;
- Member/Admin/Founder capability differences;
- production actor resolution; and
- production application/query composition.

| Validation | Result |
| --- | --- |
| Proposal query tests | Passed — 5 tests |
| Proposal application-service tests | Passed — 11 tests |
| Authority database integration | Passed — 1 comprehensive transaction test |
| Proposal persistence/query integration | Passed — 6 tests |
| Full database-backed Vitest suite | Passed — 129 tests across 20 files |
| Prisma format | Passed |
| Prisma validate | Passed |
| Prisma client generation | Passed |
| Migration deployment/status | Passed — 10 migrations applied; database current |
| TypeScript `tsc --noEmit` | Passed |
| ESLint | Passed without warnings |
| Production Next.js build | Passed |
| `git diff --check` | Passed; line-ending notices only |

The initial migration deployment attempt failed because the configured Neon server was temporarily unreachable. No migration was applied during that attempt. The immediate retry applied the migration successfully and status verification passed. Existing upstream PostgreSQL SSL-mode, `pg`, and Vite CJS warnings remain non-failing environmental warnings.

## 11. ADR-019 and ADR-020 compliance

- Roles supply additive default capabilities.
- Quality Review and Executive Authorization remain distinct.
- Business Justification and permanent audit evidence accompany authority administration.
- Founder belongs to the unique Company Founder Seat.
- Existing users are never silently promoted.
- Founder transfer, Admin administration, and recovery are Company-scoped and transactional.
- Inactive authority cannot be exercised.
- Audit evidence is append-only and immutable.
- No role or authentication concept entered the Proposal domain.

## 12. Files changed for Sprint 3.3A

- `prisma/schema.prisma`
- `prisma/migrations/20260721000200_proposal_sprint_3_3a_authority/migration.sql`
- `src/application/proposals/proposal-application-errors.ts`
- `src/application/proposals/proposal-authority.ts`
- `src/application/proposals/proposal-query-service.ts`
- `src/application/proposals/proposal-query-service.test.ts`
- `src/application/proposals/proposal-repository.ts`
- `src/application/proposals/proposal-application-service.test.ts`
- `src/infrastructure/database/proposal-authority-adapters.ts`
- `src/infrastructure/database/proposal-authority-repository.ts`
- `src/infrastructure/database/proposal-authority-repository.integration.test.ts`
- `src/infrastructure/database/proposal-repository.ts`
- `src/infrastructure/database/proposal-repository.integration.test.ts`
- `src/infrastructure/proposal-production-composition.ts`
- `docs/Proposal_Management_Sprint_3_3A_Query_Authority_Review_Package.md`

## 13. Scope confirmation

No Proposal API routes, route handlers, server actions, HTTP mappings, React, UI, representation, delivery, notification, reporting, dashboard, global-search, or Sprint 4 behavior was implemented. The only API route remains the pre-existing authentication route.

Sprint 3.4 remains paused pending Product Architect and Product Owner review.
