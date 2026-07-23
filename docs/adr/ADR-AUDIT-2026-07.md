# ADR Governance Audit — July 2026

## Audit date

2026-07-20

## Scope

This audit reviews every ADR in `docs/adr` against repository implementation, migrations, tests, release documentation, approved capability plans, and ADR-000.

The audit preserves decision history. It does not treat implementation alone as Product Owner approval, does not upgrade empty historical placeholders into authoritative decisions, and does not rewrite legacy status labels solely for vocabulary consistency.

## Action definitions

- `None`: status and content remain sufficiently accurate.
- `Update Status`: evidence supports a status correction without changing the decision.
- `Amend`: the decision remains relevant but its ADR lacks material current architecture or policy.
- `Supersede`: a later authoritative decision should replace the ADR.
- `Investigate`: repository evidence is insufficient to make a safe governance change.

## Audit results

| ADR                                                              | Current Status                 | Recommended Status                                             | Action        | Reason                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-000 — Cotarion Product Development Methodology               | Product Owner Approved         | Product Owner Approved                                         | None          | Current governing methodology and explicitly approved.                                                                                                                                                                                                                                      |
| ADR-001 — Cotarion Platform Architecture                         | Proposed                       | Proposed pending reconstruction and review                     | Investigate   | The layered platform exists, but the ADR contains only title/date/status. Implementation cannot reconstruct the full original architectural decision or prove Product Owner approval of this specific ADR.                                                                                  |
| ADR-002 — Pricing & Proposals as Version 1 Module                | Proposed                       | Superseded after a replacement Version 1 scope ADR is approved | Supersede     | Current Version 1 scope includes Clients, Agreements, Engagements, Administration, Billing, Timeline, and future operating-group boundaries. The empty placeholder no longer describes the complete roadmap, but no single replacement platform-scope ADR exists yet.                       |
| ADR-003 — Value-Based Project Pricing Philosophy                 | Proposed                       | Product Owner Approved after amendment                         | Amend         | Project Pricing is implemented from approved methodology, but the ADR contains no decision text, invariants, or relationship to the current Pricing Configuration and Pricing Project architecture.                                                                                         |
| ADR-004 — Advisory Consulting as the Only Hourly Billing Model   | Proposed                       | Product Owner Approved after amendment                         | Amend         | Advisory Hourly is implemented and approved at $250/hour in 30-minute increments, but the ADR does not record that policy or distinguish it from Advisory Retainer.                                                                                                                         |
| ADR-005 — Engagement Lifecycle Architecture                      | Proposed                       | Proposed                                                       | Amend         | ADR-017 establishes downstream Agreement/Engagement boundaries and termination ownership, but the dedicated Engagement lifecycle remains future work and this ADR is empty. Amend during Engagement discovery rather than treating Proposal architecture as a complete Engagement decision. |
| ADR-006 — Auth.js as the Preferred Authentication Approach       | Approved                       | Approved                                                       | None          | Implemented architecture matches Auth.js infrastructure ownership, application-owned user mapping, protected routes, and provider-based authentication. Legacy `Approved` status remains accurate.                                                                                          |
| ADR-007 — Layered Application Architecture                       | Proposed                       | Product Owner Approved after amendment                         | Amend         | Presentation/Application/Domain/Infrastructure boundaries are implemented and repeatedly preserved, but the ADR is an empty placeholder. It needs a truthful decision record and conformance notes before a status upgrade.                                                                 |
| ADR-008 — Domain Isolation for Pricing and Business Rules        | Proposed                       | Product Owner Approved after amendment                         | Amend         | Pricing calculations are isolated in the Domain layer and tested independently, but the ADR lacks its decision, invariants, and current evidence.                                                                                                                                           |
| ADR-009 — Managed PostgreSQL Provider Portability                | Approved                       | Approved                                                       | None          | Prisma and managed PostgreSQL are implemented; current schema and migrations remain PostgreSQL-portable within the stated boundary. Neon remains a development choice rather than domain ownership.                                                                                         |
| ADR-010 — Standards-Compliant Object Storage Abstraction         | Proposed                       | Proposed                                                       | None          | Object storage is not implemented. Proposed status accurately prevents the placeholder from being treated as approved architecture. Revisit before retained Proposal PDFs or documents require storage.                                                                                     |
| ADR-011 — Version 1 Authentication Methods                       | Approved                       | Approved                                                       | None          | Microsoft Entra, development-only sign-in, session handling, and application-owned identity mapping match the decision; Google and passwords remain deferred.                                                                                                                               |
| ADR-012 — Permanent Document Retention                           | Proposed                       | Proposed pending amendment                                     | Amend         | ADR-000 and ADR-017 approve permanent major-record history and regenerable representations, but document-specific retention, evidentiary copies, corrections, and legal deletion exceptions are not defined in this empty ADR.                                                              |
| ADR-013 — Lowest-Maintenance Hosting Priority                    | Proposed                       | Proposed                                                       | None          | Production hosting has not been selected or deployed. Proposed status remains truthful.                                                                                                                                                                                                     |
| ADR-014 — In-Application PDF Rendering with Future Worker Option | Proposed                       | Architecture Approved after amendment                          | Amend         | ADR-017/018 approve PDF as a representation rendered from immutable Proposal Versions, but this ADR contains no renderer boundary, operational threshold, or worker-transition criteria.                                                                                                    |
| ADR-015 — Application Users Belong to One Company Workspace      | Approved                       | Approved                                                       | None          | Schema, authentication mapping, repository isolation, and Version 1 UI remain consistent with one Company per Application User and no company switching.                                                                                                                                    |
| ADR-016 — Shared Pricing Project With Explicit Pricing Models    | Accepted                       | Accepted                                                       | None          | Historical `Accepted` status is legitimate. The shared aggregate and explicit calculation boundaries remain implemented and current.                                                                                                                                                        |
| ADR-017 — Proposal Management Business Architecture              | Product Owner Approved         | Product Owner Approved                                         | None          | Approved architecture, Timeline amendment, and Version 1 policies are complete and reference ADR-000. Implementation has not begun.                                                                                                                                                         |
| ADR-018 — Proposal Management Implementation Plan                | Product Owner Approved Roadmap | Product Owner Approved                                         | Update Status | Product Owner approved the roadmap. Using the ADR-000 preferred status removes a non-standard suffix without changing the decision or roadmap content.                                                                                                                                      |

## ADRs requiring no action

- ADR-000
- ADR-006
- ADR-009
- ADR-010
- ADR-011
- ADR-013
- ADR-015
- ADR-016
- ADR-017

`None` does not imply implementation. ADR-010 and ADR-013 remain accurately Proposed.

## Status updates applied

- ADR-018: `Product Owner Approved Roadmap` → `Product Owner Approved`.

The title and purpose continue to identify ADR-018 as the authoritative implementation roadmap.

## Amendments recommended

- ADR-003: encode the approved Project Pricing philosophy and current architecture.
- ADR-004: encode approved Advisory Hourly policy and the distinction from Advisory Retainer.
- ADR-005: complete during Engagement discovery using ADR-017's downstream boundaries.
- ADR-007: reconstruct and approve the implemented layered architecture.
- ADR-008: record the implemented Pricing domain isolation and enforcement.
- ADR-012: define document-specific retention and legal/evidentiary rules.
- ADR-014: define the approved Proposal PDF renderer boundary and future worker threshold.

These amendments require their responsible review. This audit does not manufacture missing historical rationale from code.

## Investigation required

- ADR-001 requires reconstruction of the intended platform architecture and explicit review before its status can safely change.

The current application provides evidence of a layered platform, but ADR-001 itself does not contain enough decision content to audit conformance.

## Future supersession recommended

- ADR-002 should be superseded after a replacement Version 1 platform-scope ADR is approved.

ADR-002 is an empty Proposed placeholder, while the active roadmap spans more than Pricing and Proposals. ADR-017 and ADR-018 govern Proposal Management but are not complete replacements for platform-wide Version 1 scope.

## Documentation inconsistencies

1. ADR-001 through ADR-005, ADR-007, ADR-008, ADR-010, and ADR-012 through ADR-014 are title/status placeholders rather than complete decision records.
2. Several implemented architectural patterns have empty Proposed ADRs. Implementation evidence does not itself authorize retroactive Product Owner approval.
3. ADR-002's title no longer represents the complete Version 1 capability roadmap.
4. ADR-018 used the non-standard status `Product Owner Approved Roadmap`; this audit corrected it to the ADR-000 status `Product Owner Approved`.
5. Historical `Approved` and `Accepted` labels remain on ADR-006, ADR-009, ADR-011, ADR-015, and ADR-016 because they remain accurate legacy decisions.
6. Approved `PP-######` policy and issued legacy `EST-######` Pricing Project references coexist. ADR-017/018 correctly preserve existing identifiers and require an additive future transition.
7. ADR-012 and ADR-014 are not authoritative enough to govern production document retention or PDF infrastructure by themselves. ADR-017/018 govern Proposal representation behavior until those focused ADRs are amended.

## Conflicts

No current implementation was found to materially violate an approved ADR.

No existing issued identifier may be rewritten to implement the later `PP-######` policy. ADR-017 and ADR-018 already resolve this apparent conflict by preserving issued `EST-######` references.

The empty Proposed ADRs are documentation gaps, not approved architectural conflicts.

## Governance conclusion

The approved Authentication, PostgreSQL, Company ownership, Pricing aggregate, Proposal architecture, and Proposal roadmap decisions accurately reflect current repository evidence.

Proposal Management Sprint 0 remains paused. This audit does not authorize implementation; it establishes the truthful governance baseline and identifies focused ADR remediation that can be scheduled without silently rewriting history.

## Follow-up — 2026-07-23

The ADR-005 documentation gap identified by this audit is resolved. Product Owner decisions EF-01 through EF-14 now govern Engagement Foundation, and ADR-005 is the canonical Product Owner-approved architecture. The Engagement implementation roadmap remains Proposed, and no implementation is authorized.

This follow-up does not rewrite the audit's historical findings as of its original review date.
