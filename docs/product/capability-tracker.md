# Cotarion Platform Capability Tracker

Last updated: 2026-07-20

## Purpose

This tracker provides a concise operational status view for major Cotarion Platform capabilities. It does not replace ADRs, implementation plans, tickets, validation evidence, acceptance records, or release records.

## Status definitions

| Status              | Meaning                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Not Started         | No active discovery or delivery work is documented.                                            |
| Discovery           | Business problem, workflow, scope, and policy are being defined.                               |
| Architecture        | Architecture is being prepared or reviewed; implementation is not authorized.                  |
| Product Governance  | Material Product Owner policies are being resolved or encoded.                                 |
| Roadmap Approved    | Architecture, policies, and implementation roadmap are approved; implementation has not begun. |
| In Development      | Approved implementation is underway.                                                           |
| Architecture Review | Implementation is complete enough for formal conformance review.                               |
| Product Acceptance  | Architecture conformance is complete and the Product Owner is exercising the capability.       |
| Release Ready       | Acceptance and release gates pass; release has not yet been published.                         |
| Released            | The approved capability has a completed release record.                                        |
| Paused              | Work is intentionally suspended without abandoning its approved history.                       |
| Superseded          | A newer capability definition or decision replaced this one; historical links remain.          |

## Current capability status

| Capability                   | Current Status      | Governing ADRs                              | Current Milestone                                           | Product Owner Approval                                                            | Implementation Status                                                                          | Product Acceptance                                              | Key Blocker or Next Gate                                                   |
| ---------------------------- | ------------------- | ------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Platform Foundation          | Released            | ADR-001, ADR-007, ADR-009, ADR-010, ADR-013 | Version 0.1 Foundation                                      | Foundation release documented                                                     | Implemented and released                                                                       | Release accepted in project history                             | Continue regression protection                                             |
| Authentication and Users     | Released            | ADR-006, ADR-011, ADR-015                   | Version 0.2 Authentication                                  | Product Owner approved and released                                               | Microsoft Entra, Auth.js sessions, protected routes, and user mapping implemented              | Authentication milestone accepted                               | Future permissions and user administration remain deferred                 |
| Clients and Contacts         | Released            | ADR-001, ADR-015                            | Version 0.3 Clients Foundation                              | Product Owner approved and released                                               | Client records and primary-contact support implemented                                         | Sprint 3 release accepted                                       | Dedicated multi-contact workflows remain future scope                      |
| Pricing and Pricing Projects | Product Acceptance  | ADR-003, ADR-004, ADR-008, ADR-016          | Pricing Workspace Capability                                | Pricing methodology and architecture approved                                     | Project, Fixed, Profit-Share, Hybrid, and Advisory workflows implemented and validated locally | Formal operational acceptance/release record not yet documented | Architecture conformance and explicit Product Owner operational acceptance |
| Proposal Management          | In Development      | ADR-000, ADR-017, ADR-018                   | Sprint 2 approved; Sprint 3 authorized but not started      | Sprints 0–2 Product Architect and Product Owner reviews passed                      | Sprints 0–2 approved; Sprint 3 authorized but not started; Sprints 4–6 not started             | Not started                                                     | Begin Sprint 3 application services and internal Proposal workspace        |
| Agreement Engine             | Architecture        | ADR-005, ADR-012, ADR-014, ADR-017          | Architecture described as downstream Proposal boundary      | Proposal-related architecture approved; legal content still requires legal review | Not started                                                                                    | Not started                                                     | Dedicated Agreement discovery, policy approval, and roadmap                |
| Engagement Management        | Architecture        | ADR-005, ADR-017                            | Preliminary lifecycle architecture                          | No repository evidence of Product Owner-approved implementation roadmap           | Not started                                                                                    | Not started                                                     | Complete business discovery and governing architecture                     |
| Platform Timeline            | Roadmap Approved    | ADR-000, ADR-017, ADR-018                   | Event envelope and Proposal integration planned             | Timeline architecture approved within ADR-017                                     | Not started                                                                                    | Not started                                                     | Proposal Sprint 2 event/outbox foundation, then Sprint 5 projection        |
| CRM                          | Not Started         | ADR-000                                     | Deferred capability                                         | No capability approval documented                                                 | Not started                                                                                    | Not started                                                     | Business Discovery                                                         |
| Billing and Payments         | Not Started         | ADR-000, ADR-017                            | Future downstream capability                                | Reference formats and downstream relationship approved only                       | Not started                                                                                    | Not started                                                     | Business Discovery and dedicated architecture                              |
| Operating-Group Expansion    | Paused              | ADR-000, ADR-017, ADR-018                   | Future Marketing, HR, Technology, Bookkeeping, Legal groups | Explicitly deferred from Consulting Version 1                                     | Not started                                                                                    | Not started                                                     | Complete Consulting operational workflow first                             |

## Proposal Management detailed checklist

| Gate or Sprint                                                  | Status               | Evidence or next condition                                   |
| --------------------------------------------------------------- | -------------------- | ------------------------------------------------------------ |
| Architecture                                                    | Approved             | ADR-017 Product Owner Approved                               |
| Implementation Roadmap                                          | Approved             | ADR-018 Product Owner Approved Roadmap                       |
| Product Policies                                                | Approved and encoded | ADR-017 Section 20                                           |
| Sprint 0 — Contract and migration readiness                     | Approved             | Product Architect Review passed; Product Owner Review passed |
| Sprint 1 — Pure Proposal Domain                                 | Approved             | Product Architect Review passed; Product Owner Review passed |
| Sprint 2 — Database, migrations, repositories, and outbox       | Approved             | Product Architect Review passed; Product Owner Review passed |
| Sprint 3 — Application services and internal Proposal workspace | Authorized — not started | Sprint 2 approved; authorization granted                     |
| Sprint 4 — Representations and delivery                         | Not started          | Requires immutable Version workflow                          |
| Sprint 5 — Client decisions, lifecycle completion, and Timeline | Not started          | Requires submitted Version and event foundation              |
| Sprint 6 — Capability hardening and release readiness           | Not started          | Requires Sprints 0–5 acceptance criteria                     |
| Architecture Conformance Review                                 | Not started          | Requires completed implementation                            |
| Product Owner Operational Acceptance                            | Not started          | Requires successful conformance review                       |
| Release                                                         | Not started          | Requires acceptance, documentation, and no Critical Defects  |

## Tracker governance

- This tracker summarizes status but creates no architecture or policy.
- ADRs remain authoritative for architecture and business rules.
- Implementation plans remain authoritative for delivery scope and sequencing.
- Status advances only when the prior gate's acceptance criteria are met.
- A capability may be paused without being abandoned.
- Superseded capabilities retain links to historical ADRs and records.
- Update this tracker at the end of every sprint, architecture review, Product Owner acceptance session, and release.
- Do not mark implementation complete based only on code existence.
- Record uncertainty conservatively; unsupported approval or implementation claims are prohibited.

## Evidence notes

- Foundation, Authentication, and Clients have repository changelog/release documentation.
- Pricing has implemented and validated capability evidence, but the repository does not yet contain an explicit Product Owner operational-acceptance and release record for the completed Pricing Workspace.
- Proposal Management has approved architecture, policies, roadmap, and Sprints 0–2. Sprint 2 passed Product Architect and Product Owner review and is approved. Sprint 3 is authorized but has not begun.
- Agreement, Engagement, Timeline, Billing, CRM, and operating-group capabilities remain at the stages shown; references in another capability's ADR do not constitute their implementation.
