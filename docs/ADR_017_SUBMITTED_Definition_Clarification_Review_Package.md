# ADR-017 SUBMITTED Definition Clarification Review Package

Date: 2026-07-21

Status: Complete — awaiting Product Architect and Product Owner review

Implementation: Paused — documentation only

## Amendment summary

ADR-017 now defines `SUBMITTED` as the completed Proposal business-state transition that precedes representation, publication, and delivery. Submission validates eligibility and authorization, binds one immutable Proposal Version, transitions the Proposal, and atomically creates exactly one permanent Submission Event.

Delivery is downstream communication activity. It can be retried or repeated without resubmitting the Proposal, changing lifecycle state or the submitted-version binding, or creating another Submission Event.

## Previous definition

> `SUBMITTED`: One immutable Proposal Version has been formally sent or made available.

That wording incorrectly made sending or availability part of entering `SUBMITTED` and conflicted with ADR-018's Sprint 3/Sprint 4 ownership boundary.

## Exact revised definition

> `SUBMITTED`: Submission eligibility and authorization have passed; one immutable Proposal Version has been formally selected and bound as the submitted version; the Proposal has transitioned to `SUBMITTED`; and exactly one permanent Submission Event has been created. The Proposal is now eligible for downstream representation generation, publication, and delivery.

ADR-017 immediately clarifies:

> `SUBMITTED` is a Proposal business state reached before communication begins. It does not mean that email delivery occurred, a PDF or HTML representation was generated, portal publication occurred, or the Client received, opened, or viewed the Proposal. Those are downstream representation and communication events and do not create or repeat the Submission Event.

## Submission versus delivery

| Submission | Delivery and publication |
| --- | --- |
| Proposal business event | Communication and representation events |
| Owned by Sprint 3 under ADR-018 | Owned by Sprint 4 under ADR-018 |
| Validates eligibility and authorization | Consumes an already-submitted Proposal |
| Binds one immutable Proposal Version | Generates or transmits representations of that version |
| Transitions Proposal to `SUBMITTED` | Does not transition Proposal state |
| Creates exactly one Submission Event | Creates communication history, never a Submission Event |
| Occurs exactly once per Proposal | May be attempted or repeated multiple times |
| Commits before communication | Failure cannot undo or repeat submission |

## Directly affected references updated

Within ADR-017, the amendment reconciles only language directly dependent on submission meaning:

- the `SUBMITTED` definition and explicit exclusions;
- `SUPERSEDED` and replacement language so the original Proposal is not resubmitted;
- transition recommendations establishing one binding and one Submission Event;
- the end-to-end sequence so submission commits before presentation;
- delivery integration-port terminology;
- state/workflow consistency for delivery failure and retries;
- implementation-order separation of submission and delivery; and
- the Delivery and representations policy section.

ADR-018 required no change. ADR-019, ADR-020, ADR-021, Pricing, governance, authentication, authorization, Company architecture, persistence, APIs, UI, and application services were not modified.

## Direct contradiction resolved

ADR-017 no longer requires sending, publication, representation generation, Client availability, receipt, opening, or viewing to enter `SUBMITTED`. It now agrees with ADR-018 that Sprint 3 completes submission and Sprint 4 begins afterward with representations and communication.

No directly affected ADR-017 statement assigns Submission Event creation to delivery or allows delivery activity to mutate Proposal lifecycle state.

## CB-3 resolution confirmation

CB-3 is fully resolved at the architecture-documentation level:

- `SUBMITTED` is reached during Sprint 3.
- Each Proposal is submitted exactly once.
- Submission binds one immutable version and creates exactly one permanent Submission Event.
- Delivery is not required to enter `SUBMITTED`.
- Delivery begins only after submission.
- Delivery may occur multiple times.
- Delivery, publication, representation generation, tracking, and read receipts never mutate Proposal lifecycle state or create another Submission Event.

ADR-017 and ADR-018 now express the same ownership and state boundary.

## Implementation confirmation

No code, schema, migration, persistence logic, API, UI, application service, authentication, authorization, or Proposal/Pricing implementation was changed. Sprint 3 has not begun and remains paused pending final closure verification.

## Product Architect and Product Owner review gate

Reviewers should confirm that the revised definition and directly affected references preserve the approved Proposal lifecycle while separating the single submission business event from repeatable downstream communication activity.
