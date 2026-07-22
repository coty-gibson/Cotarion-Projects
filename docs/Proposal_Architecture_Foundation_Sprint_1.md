# Proposal Architecture Foundation — Sprint 1

Date: 2026-07-21  
Status: Implemented; architecture conformance and operational acceptance remain governance gates.

## Boundary

Proposal is an independent bounded context. It owns proposal metadata, immutable Proposal Versions, lifecycle governance, internal review evidence, executive authorization, and historical evidence. Pricing remains the calculation authority.

Proposal creation and Pricing attachment accept Pricing Project and Pricing Version identities. A server-side resolver verifies Company, Client, current approved Version, and `QUOTED` eligibility, then copies the immutable Pricing Version evidence into Proposal-owned history. Proposal neither recalculates nor mutates Pricing. Later Pricing activity cannot rewrite an existing Proposal Version.

## Architecture

The command path is HTTP adapter → application service → Proposal aggregate repository → Prisma/PostgreSQL transaction. Authentication, Company scope, capabilities, idempotent request identity, and opaque optimistic-concurrency tokens are enforced before a new mutation is committed. Lifecycle decisions remain aggregate behavior.

The query path is HTTP adapter → Proposal query service → direct Proposal read repository → Prisma/PostgreSQL. List, detail, edit, workflow, and history projections read persisted state without aggregate reconstruction. Actor capabilities and lifecycle state are intersected into server-authoritative permitted actions.

React uses the typed Proposal HTTP client and presentation DTOs only. Successful commands replace confirmed UI state with the refreshed server projection; the UI does not predict transitions.

## Foundation lifecycle

The foundation supports `DRAFT` → `INTERNAL_REVIEW` → `EXECUTIVE_AUTHORIZATION` → `APPROVED`, with `REJECTED` and terminal `ARCHIVED` paths. Reviewer independence, current-Version requirements, capabilities, and transition eligibility are domain/application concerns, not controller or React rules.

## Explicit exclusions

This sprint does not implement Agreement, Engagement, Client Acceptance, representation or document generation, electronic signatures, delivery, or payments. Existing historical code for separately governed future behavior is not evidence that those capabilities are part of this foundation.

## Verification scope

Automated coverage includes aggregate behavior and lifecycle rules, immutable Pricing evidence, application orchestration, idempotent replay, optimistic concurrency, capability differences, Company isolation, direct read models, HTTP routing and errors, typed browser access, and minimal workspace behavior. Database-backed tests validate transaction rollback, immutable event persistence, and repository isolation when a test database is available.
