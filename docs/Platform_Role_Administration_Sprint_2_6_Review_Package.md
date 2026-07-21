# Platform Role Administration Sprint 2.6 Review Package

Date: 2026-07-21

Status: Product Architect and Product Owner Approved

Implementation: Not begun — documentation only

## ADR summary

ADR-020 defines how Company-scoped authority is established and administered. Each Company has one Founder Seat. New-Company creation and Founder assignment are atomic; the authenticated Company creator becomes the initial Founder. Founder transfer, planned succession, Admin assignment and revocation, and exceptional recovery now have explicit decision authority, constraints, outcomes, and audit requirements.

The ADR refines ADR-019 without changing its role definitions, governance philosophy, Quality Review, Executive Authorization, Business Justification, or general audit principles.

## Architecture decisions

1. Authority is Company-scoped. Founder status is never platform-wide.
2. Every Company has exactly one Founder Seat, occupied by at most one active Application User at a time.
3. New Company provisioning and initial Founder assignment commit atomically. Login order, email domain, seeds, and UI state never infer Founder authority.
4. The current Founder may voluntarily transfer the seat to an active user in the same Company with Business Justification and permanent audit evidence.
5. Planned succession uses voluntary transfer in Version 1. When the Founder cannot act, succession uses governed recovery rather than an automatic or dormant successor grant.
6. The outgoing Founder becomes Member by default; an intended Admin result must be explicit in the atomic transfer.
7. Only the current Founder assigns or revokes another user's Admin authority. An Admin may relinquish their own authority.
8. Founder recovery is available only for a missing, inactive, disabled, durably unavailable, or invalid Founder occupant—not to bypass an active Founder.
9. An identified platform operator executes recovery after independent verification. The operator gains no Company business role or capability.
10. Reactivation does not restore former Founder or Admin authority automatically.
11. Founder includes Admin capabilities, and Admin includes Member capabilities. Authorization evaluates effective capabilities at command and query boundaries rather than trusting UI visibility.
12. Every role-administration action and its structured, append-only evidence persist atomically.

## Audit evidence

All bootstrap, transfer, assignment, revocation, relinquishment, and recovery actions record:

- actor;
- affected user;
- Company;
- timestamp;
- action;
- Business Justification;
- prior and resulting authority when applicable;
- administration method; and
- the authority used to authorize the action.

Recovery additionally records the recovery condition, requester and capacity, verification method, verifying platform operator, and selected successor.

## Cross-reference updates

- ADR-019 now delegates Founder bootstrap, transfer and succession, Admin administration, and recovery details to ADR-020 while remaining authoritative for platform roles and governance capabilities.
- The ADR registry lists ADR-020 under Platform methodology and governance.
- No Proposal ADR, frozen contract, implementation roadmap, capability tracker, or milestone record was changed.

## CB-1 resolution matrix

| Required decision | ADR-020 resolution |
| --- | --- |
| Initial Founder assignment | Authenticated Company creator is assigned atomically with Company creation. Existing ungoverned Companies use recovery. |
| Founder responsibilities and authority | Unique Company Seat, full ADR-019 authority, continuity duty, Company isolation, and permanent accountability are explicit. |
| Voluntary transfer | Current Founder transfers atomically to an eligible same-Company user with Business Justification and audit evidence. |
| Succession | Planned succession uses voluntary transfer; inability to act uses recovery. No dormant or automatic succession in Version 1. |
| Admin assignment | Current Founder only; eligible active same-Company user; atomic evidence required. |
| Admin revocation | Current Founder revokes others; Admin may relinquish self; historical evidence remains unchanged. |
| No active Founder | Independently verified platform-operator recovery assigns an eligible successor. |
| Inactive or disabled Founder | Founder cannot act; recovery is required; reactivation does not restore authority. |
| Recovery authority | Restricted platform operator, with no Company business capability, executes only the verified recovery operation. |
| Audit requirements | Required structured fields, append-only retention, search/report boundaries, and atomic persistence are defined. |
| Capability relationship | Founder includes Admin, Admin includes Member; effective capabilities—not UI—control authorization. |

CB-1 is fully resolved at the architecture-policy level. Implementation no longer needs to invent initial Founder assignment, Founder transfer, Admin administration, or authority recovery rules.

## Architecture compliance checklist

| Review item | Result |
| --- | --- |
| ADR-000 methodology followed | Passed |
| ADR-019 remains the role and governance authority | Passed |
| ADR-015 Company isolation preserved | Passed |
| Multi-Company architecture preserved | Passed |
| Founder is Company-scoped, not platform-wide | Passed |
| Version 1 policy avoids multiple-Founder and automatic-succession complexity | Passed |
| Role changes retain permanent structured evidence | Passed |
| Platform recovery does not grant Company business authority | Passed |
| Capability-oriented authorization direction preserved | Passed |
| No authentication or Company architecture redesign | Passed |
| No code, API, UI, database, schema, or migration change | Passed |
| Sprint 3 implementation not begun | Passed |

## Review notes

1. ADR-020 is Product Owner Approved following Product Architect and Product Owner review.
2. This package resolves business and architecture policy only. Persistence models, transactions, recovery tooling, application services, authorization policies, and user interfaces remain unimplemented.
3. The recovery verification mechanism may use stronger operational controls in implementation, but it may not weaken the minimum evidence or grant the platform operator Company business authority.
4. ADR-020 resolves only CB-1. It does not resolve or alter any other Sprint 3 readiness finding.
5. Sprint 3 has not begun. Approval of this package does not itself authorize implementation beyond separately governed Sprint authorization and remaining readiness gates.

## Product Architect and Product Owner review gate

Reviewers should confirm that the unique Founder Seat, bootstrap actor, transfer result, Founder-only Admin administration, limited recovery authority, and required evidence accurately express the intended Version 1 governance model. Implementation must remain paused until this ADR is approved and all remaining Sprint 3 Critical Blockers are resolved.
