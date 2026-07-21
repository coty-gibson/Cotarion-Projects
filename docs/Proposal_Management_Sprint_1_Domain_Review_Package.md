# Proposal Management Sprint 1 Domain Review Package

Date: 2026-07-20

Status: Approved

Product Architect Review: Passed

Product Owner Review: Passed

Sprint 2 Authorization: Granted — not started

## Scope delivered

Sprint 1 implements the pure Proposal aggregate and domain rules defined by ADR-017 and ADR-018. It adds no database schema, migration, repository, application service, UI, renderer, delivery adapter, outbox, or Timeline projection.

## Domain implementation

### Identity and ownership

- Permanent `PRO-######` validation.
- Company, Client, owner, and Cotarion Consulting Group identity.
- Exactly one immutable quoted Pricing Project snapshot.
- Pricing Model compatibility with the versioned Engagement Type policy.

### Working Draft and immutable Versions

- Mutable working Draft separated from immutable Proposal Versions.
- 30-day default expiration and retained override reason.
- representation-neutral content, commercial terms, and multiple recipients.
- explicit acceptance authority.
- Draft revision tracking that prevents stale-version submission.
- Proposal-local sequential immutable Versions.
- immutable creator, timestamp, predecessor, revision reason, Pricing snapshot, terms, and recipients.
- ordinary Draft changes never alter historical Versions.

### Review, submission, and revisions

- Internal Review request and changes-requested return to Draft.
- actor capability for approved Owner/Admin review bypass.
- authorized-recipient and non-expired-Version submission requirements.
- Effective Date recorded at submission.
- submitted, viewed, accepted, declined, or expired Proposals can begin a working revision.
- prior submitted Versions remain unchanged during revision.
- replacement submission never inherits prior acceptance.
- executed Agreements prevent Proposal revision or supersession.

The domain accepts `canBypassInternalReview` rather than importing roles. Sprint 3 will derive this capability from the approved authorization policy.

### Client decisions and retention

- Client acceptance by an authorized recipient.
- verbal acceptance with responsible user, date/time, reason, and notes.
- append-only acceptance and withdrawal histories.
- withdrawal before, but not after, Agreement execution.
- decline, expiration, supersession, and archival without deletion.

### Dates and immutable events

- Created, Effective, and Closed Dates retain separate meanings.
- event timestamps cannot move backward relative to the aggregate.
- material commands emit immutable Proposal events through the frozen Platform envelope.
- duplicate event IDs are rejected before state mutation.
- Timeline remains a future read-only consumer.

## Domain boundary

The Proposal domain imports only Sprint 0 Proposal and Engagement Type contracts. It imports no Prisma, Next.js, React, Pricing calculator, authentication infrastructure, PDF, email, storage, or Timeline infrastructure.

## Acceptance criteria

| ADR-018 Sprint 1 criterion                                                   | Result | Evidence                                                                                         |
| ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Domain compiles without Prisma, Next.js, PDF, email, or storage dependencies | Passed | Import review, lint, and typecheck                                                               |
| Approved policies are enforced through domain commands                       | Passed | Identity, compatibility, expiration, review, submission, decision, revision, and retention tests |
| Illegal transitions return business errors without partial state             | Passed | Typed errors and duplicate-event atomicity test                                                  |
| Domain commands emit complete immutable events                               | Passed | Append-only event and frozen-envelope assertions                                                 |

## Test coverage

Sprint 1 covers:

- expiration defaults and overrides;
- Company and Client isolation;
- quoted-source and Pricing Model eligibility;
- immutable sequential Versions;
- Internal Review and bypass submission;
- recipient authorization and stale Draft rejection;
- Client and verbal acceptance;
- withdrawal before Agreement execution and rejection after execution;
- replacement revisions and non-inherited acceptance;
- decline, expiration, supersession, and archival;
- business dates;
- append-only events and atomic command failure.

## Risks

1. Owner/Admin roles do not yet exist in the current `ApplicationUserRole` schema. Sprint 3 must derive bypass authorization outside the domain.
2. `QUOTED` is the eligible Pricing source state, but the current Pricing Workspace does not expose that transition.
3. Agreement execution uses a narrow domain link only to enforce withdrawal/revision rules; integration belongs to later sprints.
4. Persistence must store a working revision separately from the still-submitted immutable Version.
5. Sprint 2 must commit emitted events atomically with persisted state.

## Product Owner decisions

No unresolved Sprint 1 Product Owner decisions were found.

## Deferred

- Prisma schema, migrations, repositories, and rehydration
- concurrency-safe Proposal/version allocation
- Engagement Type seed and drift validation
- database immutability constraints
- transactional outbox and Timeline projection
- application services and authorization
- Proposal UI, representations, delivery, and Client-facing acceptance

## Validation

- ESLint: passed.
- TypeScript: passed.
- focused Proposal tests: 20 passed.
- full suite: 98 passed across 15 test files.
- existing Pricing and repository integration regressions: passed.
