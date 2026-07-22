# Cotarion Platform Capability Tracker

Last updated: 2026-07-21

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
| Pricing and Pricing Projects | Architecture Review | ADR-003, ADR-004, ADR-008, ADR-016, ADR-021 | Pricing Completion Phase 6.1 — Architecture Integrity         | Pricing governance policy is recorded in the Product Owner Decision Record; formal capability acceptance remains pending | Governed aggregate commands, immutable Versions, independent review, `QUOTED` lifecycle, direct CQRS reads, HTTP-only presentation, opaque concurrency, durable idempotency/audit integrity, and server-permitted actions implemented | Not started for operational product acceptance                 | Complete Product Owner operational acceptance and release governance; product usability remains future work |
| Proposal Management          | Architecture Review | ADR-000, ADR-017, ADR-018, ADR-019–ADR-021  | Proposal Client Decisions — Sprint 4                        | Foundation, Representation, and Delivery implementations accepted; capability-level operational acceptance remains pending | Independent aggregate foundation, immutable Representations, secure-link Delivery, and one immutable terminal Client Decision per Delivery implemented; Agreement and Engagement creation remain excluded | Product Owner operational acceptance not recorded              | Complete architecture conformance and operational acceptance for implemented Proposal capabilities |
| Services & Pricing Administration | Discovery       | ADR-000, ADR-003, ADR-004, ADR-008, ADR-016, ADR-019–ADR-021 | Capability planning and configuration-governance reconciliation | Material administration policies and dedicated capability architecture not yet approved | Static Company-scoped catalog and immutable configuration foundation exists; administration workflows not started | Not started                                                     | Resolve Product Owner policy and approve a dedicated capability ADR         |
| Agreement Engine             | Architecture Review | ADR-005, ADR-012, ADR-014, ADR-017          | Electronic Signatures — Proposal Sprint 6                   | Agreement Generation accepted; legal content and signature operation still require legal review | Immutable Agreement Generation plus Agreement-Version-bound internal secure-link Signature Requests, signer evidence, ordered/parallel signing, direct reads, and factual progress implemented; execution remains excluded | Product Owner operational acceptance not recorded              | Legal review, architecture conformance, operational acceptance, and future execution capability |
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
| Sprint 3.1 — Proposal domain model                              | Implemented          | Review package present; capability-level Product Owner acceptance remains unrecorded |
| Sprint 3.2 — Proposal persistence                               | Implemented          | Review package present; capability-level Product Owner acceptance remains unrecorded |
| Sprint 3.3/3.3A — Application services, query, and authority     | Implemented          | Review packages present; capability-level Product Owner acceptance remains unrecorded |
| Sprint 3.4/3.4A — HTTP API and workspace read model             | Implemented          | Sprint 3.4A approved; capability-level Product Owner acceptance remains unrecorded |
| Sprint 3.5A/3.5B — Internal Proposal Workspace                  | Product Architect Approved | Authorized interactive workspace scope approved on 2026-07-21 |
| Architecture Foundation Sprint 1 — canonical CQRS alignment     | Implemented          | Immutable Pricing Version resolution, foundation lifecycle, direct read repositories, opaque concurrency, HTTP contracts, and minimal workspace validation implemented |
| Proposal Sprint 2 — Representations and Document Generation     | Implemented          | Immutable HTML/PDF artifacts derive only from Proposal Versions; idempotent generation, direct CQRS history/detail/current reads, preview, and download implemented |
| Proposal Sprint 2.1 — Representation Renderer Separation        | Implemented          | Application-owned renderer abstraction with deterministic HTML and PDF infrastructure implementations; behavior and contracts unchanged |
| Proposal Sprint 3 — Client Delivery                             | Implemented          | One immutable Representation per Delivery; secure opaque link, immutable recipient snapshot, lifecycle evidence, direct CQRS reads, server-permitted actions, minimal internal UI, and separate safe public retrieval boundary implemented |
| Proposal Sprint 4 — Client Decisions                            | Implemented          | Delivery-bound immutable ACCEPTED/DECLINED evidence, one terminal Decision, durable replay, conflict rejection, direct Decision projections, explicit client confirmation, and separate public command endpoints implemented |
| Proposal Sprint 5 — Agreement Generation                        | Implemented          | Independent Agreement bounded context generates immutable Version 1 HTML/PDF documents transactionally from one accepted Decision; signatures, execution, and Engagement creation remain excluded |
| Proposal Sprint 6 — Electronic Signatures                       | Implemented          | Agreement-Version-bound secure Signature Requests, immutable signer snapshots/evidence, opaque tokens, parallel/ordered signing, revocation/expiration, direct CQRS progress, and separate public signing implemented; Agreement execution remains excluded |
| Proposal Sprint 7 — Agreement Execution                         | Implemented          | One immutable Execution per Agreement Version; transactional determination consumes complete SIGNED evidence and artifact checksums, with direct CQRS status/history and server-authoritative execution actions; Engagement and financial workflows remain excluded |
| Sprint 4 — Representations and delivery                         | Superseded           | Representation generation and secure-link Delivery were completed by accepted Proposal Sprints 2 and 3; this historical roadmap label is retained for traceability |
| Historical Sprint 5 — Client decisions, lifecycle, and Timeline | Superseded           | Delivery-bound Client Decisions completed in Proposal Sprint 4; broader lifecycle and Timeline work remain future capabilities |
| Sprint 6 — Capability hardening and release readiness           | Not started          | Requires Sprints 0–5 acceptance criteria                     |
| Architecture Conformance Review                                 | Not started          | Requires completed implementation                            |
| Product Owner Operational Acceptance                            | Not started          | Requires successful conformance review                       |
| Release                                                         | Not started          | Requires acceptance, documentation, and no Critical Defects  |

## Pricing Completion detailed checklist

| Gate or Phase | Status | Evidence or next condition |
| --- | --- | --- |
| Phases 1–2 — Governance domain and persistence | Implemented | Aggregate lifecycle, immutable Versions/reviews/events, optimistic concurrency, and transactional repository present |
| Phase 3 — Application commands and HTTP API | Implemented | Authenticated Company scope, capabilities, stable errors, idempotent command identity, and command adapters present |
| Phase 4 — CQRS read models and query API | Implemented | List, detail, editable Draft, Version history, and Review history use direct read repositories without aggregate reconstruction |
| Phases 5–6 — Presentation completion | Implemented | Typed HTTP client, view models, list/create/detail/edit/history screens, conflict UX, and governance interactions present |
| Phase 6.1 — Architecture Integrity | Implemented | Conflicting command/event identities fail atomically, permitted actions are server projected, legacy application paths are retired or quarantined, and current documentation is reconciled |
| Architecture Conformance Review | In review | Phase 6.1 verification and this tracker provide the implementation evidence; independent review remains a governance gate |
| Product Owner Operational Acceptance | Not started | Requires operational exercise and an explicit acceptance record |
| Release | Not started | Requires acceptance, release documentation, and no blocking defects |

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
- Pricing architecture now includes the governed aggregate, immutable Pricing Versions, explicit Save Version, independent Quality Review, `QUOTED` eligibility, append-only governance evidence, direct CQRS read models, opaque concurrency, server-authoritative permitted actions, and HTTP-only presentation access. Phase 6.1 closes the final verified architecture-integrity gaps. Product usability work, Product Owner operational acceptance, and release evidence remain separate future gates. ADR status changes still require their own governance process; implementation does not silently amend an ADR.
- Proposal Management now has an independent aggregate and persistence boundary, immutable Pricing Version evidence, deterministic HTML/PDF Representations, and secure-link Delivery. Sprint 4 adds one immutable terminal Client Decision per governed Delivery with safe replay, conflict rejection, direct Decision reads, and explicit public confirmation. Decisions create no Agreement, Engagement, signature, payment, or project. Operational Product Owner acceptance remains a separate gate.
- Services & Pricing Administration has requirements and an existing static persistence/configuration foundation, but no dedicated approved administration architecture or resolved Product Owner governance policy. Planning does not authorize implementation.
- Agreement, Engagement, Timeline, Billing, CRM, and operating-group capabilities remain at the stages shown; references in another capability's ADR do not constitute their implementation.
