# Proposal Sprint Ownership Clarification Review Package

Date: 2026-07-21

Status: Complete — awaiting Product Architect and Product Owner review

Implementation: Paused — documentation only

## ADR-018 amendment summary

ADR-018 now assigns Proposal submission exclusively to Sprint 3 and representation, publication, and delivery exclusively to Sprint 4.

Submission is one Proposal business-state transition. It validates eligibility, binds one immutable Proposal Version, changes the Proposal to `SUBMITTED`, and creates one permanent Submission Event atomically. Sprint 3 ends at that boundary and performs no delivery.

Sprint 4 consumes the already-submitted Proposal. It may generate representations and perform multiple publication, delivery, retry, tracking, and read-receipt operations. Those operations create communication history, never another Submission Event, and never mutate Proposal lifecycle state.

## Updated sprint responsibilities

### Sprint 3 — Proposal business state

- Draft creation and editing.
- immutable Proposal Version creation.
- Draft reopening and revision.
- Quality Review and reviewer independence.
- Executive Authorization and Business Justification.
- submission validation and authorization.
- submission command.
- immutable submitted-version binding.
- transition to `SUBMITTED`.
- exactly one Submission Event, committed atomically with Proposal state.

Sprint 3 stops immediately after successful submission. It does not generate HTML/PDF, publish, send email, track delivery, or record read receipts.

### Sprint 4 — representation and communication state

- consume the existing submitted immutable Proposal Version.
- HTML/Internal Web and PDF representations.
- representation generation, checksums, and renderer metadata.
- portal-publication boundary for approved channels.
- email delivery.
- delivery attempts and tracking.
- read receipts.
- retry, redelivery, publication, and delivery idempotency.
- permanent communication history.

Sprint 4 cannot create or replay the Proposal Submission Event and cannot transition or redefine Proposal state.

The portal-publication boundary does not authorize the deferred Client Portal UI, API, mobile, or self-service acceptance capability.

## Before / after ownership comparison

| Concern | Before amendment | After amendment |
| --- | --- | --- |
| Submission command | Implied by Sprint 3 readiness but not explicitly owned | Exclusively Sprint 3 |
| `SUBMITTED` transition | Domain behavior existed, roadmap ownership unclear | Exclusively Sprint 3 |
| Submitted-version binding | Listed in Sprint 4 | Exclusively Sprint 3 |
| Submission Event | Listed in Sprint 4 despite Sprint 3 workflow language | Created exactly once by Sprint 3 |
| Submission concurrency | Listed under Sprint 4 tests | Sprint 3 submission test responsibility |
| Representation generation | Sprint 4 | Sprint 4, unchanged |
| HTML/PDF | Sprint 4 | Sprint 4, explicitly post-submission |
| Email delivery | Coupled to “submission” terminology | Sprint 4 communication activity only |
| Portal publication | Only an integration/future reference | Sprint 4 ownership boundary when an approved channel exists |
| Delivery retries | Could be read as retrying submission | Retry communication only; never resubmit |
| Read receipts | Not explicitly assigned | Sprint 4 representation/communication metadata |
| Proposal state during delivery | Indirectly constrained | Explicitly immutable with respect to Sprint 4 delivery operations |
| Sprint 5 dependency | Submitted versions attributed to Sprint 4 | Submitted versions and Submission Event come from Sprint 3 |

## Architecture rules confirmed

1. Submission occurs exactly once and creates business history.
2. Delivery may occur multiple times and creates communication history.
3. Proposal state changes belong to Sprint 3.
4. Representation, publication, delivery, and receipt state belong to Sprint 4.
5. Sprint 4 starts only from an existing `SUBMITTED` Proposal.
6. Sprint 4 never emits, recreates, or duplicates the Submission Event.
7. Submission state and event persist atomically before any delivery work begins.
8. Delivery-provider failure cannot roll back, repeat, or redefine Proposal submission.

## References reconciled in ADR-018

- Guiding implementation principles.
- Capability dependency map.
- New explicit Sprint 3/Sprint 4 ownership boundary.
- Sprint 3 objective, application/UI order, tests, and acceptance criteria.
- Sprint 4 objective, implementation order, tests, and acceptance criteria.
- Sprint 5 dependencies.
- Sprint 6 operational scenarios.
- Recommended commit and pull-request boundaries.

No other ADR was modified.

## CB-3 resolution

CB-3 is fully resolved at the architecture-roadmap level. ADR-018 no longer assigns submission behavior or the Submission Event to Sprint 4. Implementation does not need to infer which sprint owns Proposal submission, submitted-version binding, state transition, or delivery behavior.

## Compliance checklist

| Review item | Result |
| --- | --- |
| Submission exclusively belongs to Sprint 3 | Passed |
| Delivery exclusively belongs to Sprint 4 | Passed |
| Exactly one Submission Event owner | Passed |
| Submitted-version binding owner explicit | Passed |
| Proposal and representation state separated | Passed |
| Repeat delivery cannot resubmit Proposal | Passed |
| ADR-017 unchanged | Passed |
| ADR-019 unchanged | Passed |
| ADR-020 unchanged | Passed |
| ADR-021 unchanged | Passed |
| No code, persistence, schema, migration, API, or UI implementation | Passed |
| Sprint 3 remains paused | Passed |

## Product Architect and Product Owner review gate

Reviewers should confirm that submission ends Sprint 3, delivery starts Sprint 4, and no representation or communication operation can create another Submission Event or mutate Proposal state. Sprint 3 implementation remains paused until final blocker verification.
