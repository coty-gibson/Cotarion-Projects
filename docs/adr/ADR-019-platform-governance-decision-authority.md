# ADR-019: Platform Governance & Decision Authority

## Date

2026-07-20

## Status

Product Owner Approved

## Context

Cotarion Platform requires one durable authority for operational roles, default capabilities, review paths, exceptional authorization, audit evidence, and business-record preservation. Capability ADRs may define domain-specific risks and workflows, but they must not independently redefine platform governance or invent authorization policy during implementation.

ADR identifiers are permanent chronological identities rather than hierarchy positions. This governance decision therefore uses ADR-019; ADR-001 remains reserved for Cotarion Platform Architecture. ADR-000 continues to govern the product-development methodology, while this ADR governs authority exercised within platform workflows.

## Decision

ADR-019 is the platform-wide authority for Platform Roles, default capabilities, Quality Review, Executive Authorization, Business Justification, audit principles, business-record preservation, and platform governance philosophy.

Capability ADRs reference this decision and may add risk-specific requirements without weakening it. Conflicting or missing governance policy must be escalated under ADR-000 rather than resolved through implementation convenience.

## Governance philosophy

### Governance over Bureaucracy

Minimize unnecessary approvals while maximizing accountability. Governance exists to make responsibility, risk, and evidence clear, not to add routine ceremony.

### Trust Before Restriction

Employees are trusted to perform their responsibilities unless demonstrated risk requires additional restriction.

### Visibility Before Control

Leaders should have visibility into meaningful activity rather than approving routine work. Reporting and auditability are preferred to unnecessary approval gates.

### Risk Determines Oversight

Oversight must match business risk. Higher-risk actions may require review, stronger evidence, or a restricted authorization path; routine work should remain efficient.

### Every Significant Decision Leaves an Audit Trail

Material business actions and alternate governance paths must create permanent, attributable evidence.

### Authority Carries Accountability

Greater authority requires greater accountability, not fewer rules. Elevated authority never removes audit, evidence, or preservation requirements.

### Business Records Are Preserved

Business records are preserved through lifecycle statuses. Deletion is not part of the platform business lifecycle.

## Platform role model

Roles define default capabilities. They do not replace Company isolation, domain invariants, lifecycle rules, or evidence requirements.

### Founder

- Holds full platform authority.
- May perform Quality Review.
- May use Executive Authorization.
- Must provide Business Justification when using Executive Authorization.
- Is subject to a permanent audit trail.
- Receives authority through the Founder Seat rather than through an individual's personal identity.

The Founder Seat is a durable governance position. The authorized individual occupying it must always be identifiable, and a future change of occupant must not rewrite prior authorship or audit history.

### Admin

- Holds operational authority.
- May perform Quality Review.
- May use Executive Authorization.
- Must provide Business Justification when using Executive Authorization.
- Is subject to a permanent audit trail.

### Member

- Holds the standard operational role.
- Uses the Quality Review workflow for governed submissions.
- Cannot use Executive Authorization.
- Remains responsible for the accuracy and completeness of work they create.

Future roles may be introduced through approved capability expansion.

## Quality Review

### Purpose

Quality Review provides quality assurance, not bureaucracy. It creates independent review where risk warrants it while preserving trust and efficient routine work.

### Default workflow

```text
Member Draft
→ Quality Review
→ Submitted
```

Rules:

- Admins may perform Quality Review.
- The Founder may perform Quality Review.
- A Proposal creator may not perform Quality Review on their own Proposal.
- The reviewer must be an identified authorized individual.
- Completion of Quality Review must leave permanent audit evidence.

Capability ADRs may require Quality Review for other significant records based on risk. They may not weaken reviewer independence without an explicit amendment to this ADR.

## Executive Authorization

Executive Authorization is an approved governance path. It is not an override and must not be described as an Internal Override, Administrative Override, or Leadership Override.

Executive Authorization permits an authorized leader to use an approved alternate path when the governing capability allows it.

Requirements:

- Founder or Admin only;
- Business Justification required;
- permanent audit record;
- searchable;
- included in reporting; and
- authorized individual identified.

Executive Authorization does not permit violation of Company isolation, immutable history, legal requirements, domain invariants, or an expressly prohibited transition.

## Business Justification

**Business Justification** is the documented business rationale supporting use of an alternate governance path.

Business Justification must be meaningful, attributable, retained with the significant action, and available to authorized search and reporting. A blank, generic, or implementation-generated explanation does not satisfy this requirement.

Generic “Reason” terminology must not be used for the rationale supporting Executive Authorization. Other domain evidence may retain specific terms such as revision reason, decline reason, or withdrawal reason when it does not represent Executive Authorization.

## Audit principles

Significant actions permanently record:

- Who performed or authorized the action;
- When the action occurred;
- What action and record were affected;
- Submission Method;
- Review Method; and
- Business Justification when applicable.

Audit records are append-only business evidence. Corrections create new attributable records rather than rewriting history. Search and reporting must preserve Company and permission boundaries.

## Business-record preservation

Business records are never deleted. Lifecycle is represented by status.

Examples include Draft, Submitted, Accepted, Declined, Withdrawn, Cancelled, Archived, and Superseded.

Not every record uses every example status. Capability ADRs define their valid lifecycle, but deletion is not part of that lifecycle. Technical cleanup of non-business transient data does not authorize deletion of business records or audit evidence.

## Authorization architecture

Long-term authorization will evolve toward capability-based permissions rather than role-specific hardcoding.

- Roles define default capabilities.
- Application services evaluate capabilities at command boundaries.
- Presentation may communicate availability but is not the authorization boundary.
- Domain models accept authorization outcomes where needed without importing authentication infrastructure or role enums.
- Capabilities may expand in future releases through approved governance changes.
- Historical audit evidence retains the role, capability, and individual involved at the time of action.

## Security and isolation

Governance authority is always exercised inside the authenticated Company boundary. Founder or Admin status does not imply cross-Company access. Future cross-Company or corporate authority requires an explicit architecture decision.

Inactive, unauthenticated, or unidentified users cannot exercise platform authority. Founder Seat assignment, Admin assignment, and capability changes are significant actions and require permanent audit evidence.

Founder bootstrap, Founder Seat transfer and succession, Admin administration, and recovery when a Founder cannot act are governed by ADR-020. ADR-020 refines how ADR-019 authority enters and changes within a Company; it does not redefine the roles or governance capabilities established here.

## Consequences

### Benefits

- Routine work remains efficient while material decisions remain accountable.
- Platform roles and review terminology have one authoritative definition.
- Executive Authorization is distinguished from rule-breaking or informal bypasses.
- Capability implementations can evolve toward permissions without changing domain semantics.
- Audit, preservation, search, and reporting requirements are consistent across capabilities.

### Costs and risks

- Role and Founder Seat administration require governed implementation.
- Searchable authorization evidence and reporting add persistence and operational responsibilities.
- Existing capability terminology and stable machine codes may require compatibility mapping.
- Capability teams must identify significant actions and review methods explicitly.

## Rejected alternatives

### Require leadership approval for routine work

Rejected because it creates bureaucracy without proportional risk reduction.

### Treat elevated roles as exempt from audit requirements

Rejected because authority carries greater accountability.

### Describe alternate paths as overrides

Rejected because “override” implies that governance was bypassed. Executive Authorization is itself an approved, auditable governance path.

### Hardcode every authorization decision directly to roles

Rejected because long-term capability-based permissions provide safer extension without forcing domain logic to depend on a fixed role list.

### Delete withdrawn, cancelled, or obsolete business records

Rejected because lifecycle status and permanent history are required for accountability.

## Related decisions

- ADR-000: Cotarion Product Development Methodology
- ADR-001: Cotarion Platform Architecture
- ADR-015: Application Users Belong to One Company Workspace
- ADR-017: Proposal Management Business Architecture
- ADR-018: Proposal Management Implementation Plan
- ADR-020: Platform Role Administration & Founder Bootstrap
