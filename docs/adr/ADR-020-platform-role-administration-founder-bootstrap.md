# ADR-020: Platform Role Administration & Founder Bootstrap

## Date

2026-07-21

## Status

Product Owner Approved

## Context

ADR-019 defines the Company-scoped Founder, Admin, and Member roles and the capabilities and accountability associated with them. It deliberately leaves role administration and the entry of authority into a Company to a separate decision.

Without that decision, implementation would have to invent who becomes the initial Founder, how the unique Founder Seat changes occupants, who administers Admin authority, and how a Company recovers when its Founder cannot act. Those choices affect Company isolation, audit integrity, and access to Executive Authorization, so they must be governed before implementation.

This ADR resolves Sprint 3 readiness blocker CB-1. It refines ADR-019 without redesigning authentication, Company architecture, or the platform authorization model.

## Decision

Authority is administered independently inside each Company. Every Company has exactly one Founder Seat, occupied by at most one active Application User at a time. Founder, Admin, and Member are Company-scoped authority assignments and never grant access to another Company.

Version 1 uses simple role defaults expressed as additive capabilities. Authorization is enforced from effective capabilities at application command and query boundaries, not from UI visibility. Role administration is itself a governed capability and every change creates permanent structured audit evidence.

## Scope

This ADR governs:

- initial Founder bootstrap when a Company is created;
- the unique Company Founder Seat;
- voluntary Founder transfer and planned succession;
- Admin assignment, revocation, and relinquishment;
- recovery when the Founder cannot act; and
- permanent evidence for role-administration actions.

It does not authorize a Company administration UI, database or API changes, cross-Company business access, authentication redesign, or implementation work.

## Terminology

**Founder Seat** is the unique governance position that carries Founder capabilities for one Company. The seat belongs to the Company, not permanently to an individual.

**Company creator** is the identified, authenticated Application User authorized by the platform provisioning process to establish a Company.

**Platform operator** is an identified platform support actor permitted to execute the recovery procedure. A platform operator is not a Company Founder or Admin and receives no Company business capability by performing recovery.

**Role-administration action** is a bootstrap, transfer, assignment, revocation, relinquishment, or recovery that changes a user's Company authority.

## Capability relationship

Capabilities are additive:

```text
Founder capabilities
    include Admin capabilities
        include Member capabilities
```

- Member is the baseline operational authority for an active Company user.
- Admin adds the operational governance capabilities defined by ADR-019.
- Founder adds the unique Company governance and role-administration capabilities defined here.
- Founder authority is derived from occupancy of the Founder Seat. A separate Admin assignment is not required for the Founder.
- A user may have only one effective default role in a Company, but authorization evaluates the capabilities implied by that role.
- Presentation may hide or show controls for usability, but it is never the authorization boundary.
- Future roles or individually assigned capabilities require separately approved capability expansion.

Role and capability evaluation always includes authenticated identity, active-user status, and Company scope. No role or capability permits cross-Company access.

## Founder bootstrap

### New Company

Company creation and initial Founder assignment are one atomic governance operation:

1. The platform provisioning process identifies and authenticates the Company creator.
2. The Company creator must be an active Application User belonging to the new Company as part of that same operation.
3. The new Company's Founder Seat is assigned to that user.
4. The Company and its first Founder audit record commit together. The Company must not become operational without both.

The initial Founder is not inferred from email domain, earliest login, seed order, invitation order, or UI state.

### Existing Company without governed Founder evidence

An existing Company may be bootstrapped only through the recovery procedure in this ADR. A migration, seed, deployment script, or first-login rule must not silently select a Founder. The recovery evidence must identify why ordinary new-Company bootstrap evidence was unavailable.

## Founder Seat

The Founder Seat:

- is unique within a Company;
- has zero or one current occupant, with zero allowed only during provisioning failure or a documented recovery condition;
- may be occupied only by one active Application User of that Company;
- carries the full Company-scoped authority and accountability defined by ADR-019;
- administers Admin assignments for that Company;
- authorizes voluntary transfer of the seat;
- remains subject to all Company isolation, audit, immutability, and business-record rules; and
- never erases the role, identity, or authorship recorded for earlier actions.

The Founder must preserve continuity of authority, maintain appropriate Admin coverage, and initiate a voluntary transfer before planned departure or loss of access whenever practicable.

Founder authority cannot be shared, delegated as the Founder Seat, or held by a service account. Operational tasks may be performed through Admin capability, but only the current Founder may exercise Founder-only role-administration decisions outside the recovery path.

## Founder transfer and planned succession

### Voluntary transfer

The current active Founder may transfer the Founder Seat to another active Application User in the same Company.

A valid transfer requires:

- the current Founder as the authorizing actor;
- an identified eligible successor;
- a meaningful Business Justification;
- confirmation that the successor is active and belongs to the same Company at commit time; and
- one atomic change that removes Founder authority from the outgoing occupant and grants it to the successor.

There must never be two current Founder occupants. If any validation or audit persistence fails, the transfer fails without changing the current occupant.

After transfer, the outgoing Founder becomes a Member by default. If continuing Admin authority is intended, the transfer action must explicitly grant Admin as part of the same governed operation and record that result. Prior Founder authorship and audit evidence remain unchanged.

### Planned succession

Version 1 succession uses the voluntary transfer procedure. A Founder should complete transfer before planned departure, account disablement, or extended unavailability. Version 1 does not introduce dormant successor designations, automatic date-based transfers, shared Founder authority, or inheritance rules.

If the current Founder cannot authorize the transfer, succession proceeds only through recovery.

## Admin assignment and revocation

- Only the current Founder of a Company may assign Admin authority to another active Application User in that Company.
- Only the current Founder may revoke another user's Admin authority.
- An Admin may relinquish their own Admin authority. Self-relinquishment changes that user to Member and does not authorize changes to any other user.
- Admins cannot assign, revoke, or transfer Founder authority and cannot assign or revoke another Admin.
- The Founder Seat cannot be revoked or converted to Admin or Member through Admin administration; it changes occupant only by valid transfer or recovery.
- Assignment, revocation, and relinquishment require a meaningful Business Justification and permanent audit evidence.
- Role changes take effect only if the authority change and its audit record commit atomically.

Revocation changes future authority only. It never changes authorship, authority evidence, or the validity of actions completed while the user was authorized.

## Authority recovery

### Recovery condition

Recovery is permitted only when ordinary Founder transfer cannot be completed because:

- the Founder Seat has no occupant;
- the occupant is inactive or disabled;
- the occupant cannot authenticate or is durably unavailable; or
- the recorded occupant is invalid because of provisioning or data-integrity failure.

A temporarily inconvenient or disputed Founder decision is not a recovery condition. Recovery is not an alternate route for bypassing an active Founder.

### Recovery authority

An identified platform operator executes recovery after verifying the request outside the affected Company authority chain. The request may originate from an active Company Admin or, when no active Admin exists, from a verified authorized Company representative.

The platform operator:

- may assign the Founder Seat only for the affected Company and only through the recovery operation;
- must select an active Application User belonging to that Company;
- must not gain Founder, Admin, Member, Executive Authorization, Quality Review, Proposal, Client, Pricing, or other Company business capabilities;
- must not use recovery to change any other Company role; and
- must not act as the recovered Company Founder.

Recovery verification is an operational control. At minimum it must establish the requester's identity and authority to represent the Company, the recovery condition, the proposed successor's identity and Company membership, and approval by an identified platform operator. Stronger verification may be added operationally without weakening these minimums.

### Recovery result

Recovery atomically:

1. closes any invalid or inactive Founder occupancy without deleting it;
2. assigns the Founder Seat to the verified successor; and
3. persists the complete recovery audit record.

If the disabled or inactive former Founder later regains access, they receive Member authority by default unless the current Founder separately grants Admin or transfers the Founder Seat under the normal rules. Reactivation never restores earlier Founder authority automatically.

Recovery fails without partial role change if identity, Company membership, recovery evidence, eligibility, uniqueness, or audit persistence cannot be established.

## Role-assignment audit

Every role-administration action creates permanent, structured, append-only audit evidence. The authority change and audit evidence must be persisted atomically.

Required fields are:

- actor identity;
- affected user identity;
- Company identity;
- timestamp;
- action;
- Business Justification;
- previous effective role or Founder Seat occupant, when applicable;
- resulting effective role or Founder Seat occupant;
- administration method: bootstrap, voluntary transfer, Admin assignment, Admin revocation, Admin relinquishment, or recovery; and
- actor authority or recovery-operator identity used to authorize the action.

Recovery evidence additionally records the recovery condition, requester identity and capacity, verification method, verifying platform operator, and the successor selected.

Audit records are never updated or deleted. A correction is a new attributable action. Evidence remains searchable and reportable within appropriate Company and platform-support access boundaries. Business Justification follows ADR-019 and cannot be blank, generic, or generated merely to satisfy validation.

## Authorization boundaries

- Application command and query boundaries evaluate effective capabilities before performing protected work.
- Role-administration commands revalidate actor authority, affected-user activity, Company membership, and Founder uniqueness inside the same consistency boundary as the change.
- Domain policies consume authorization outcomes without importing authentication infrastructure or UI role checks.
- Authentication establishes identity; this ADR determines Company-scoped role authority after identity is established.
- Company isolation is mandatory for actors, affected users, records, commands, queries, audit search, and reporting.

## Invariants

1. A Company has at most one current Founder Seat occupant.
2. An operational Company has exactly one active Founder, except while a documented recovery condition is unresolved.
3. A Founder or Admin must be an active Application User belonging to the same Company.
4. Founder and Admin authority never crosses a Company boundary.
5. Only the current Founder administers other users' Admin authority.
6. Founder occupancy changes only through atomic bootstrap, voluntary transfer, or recovery.
7. Reactivation never restores revoked or former Founder/Admin authority automatically.
8. Every authority change and its structured audit evidence commit atomically.
9. Historical authority and authorship are append-only and are never rewritten by later role changes.
10. UI availability does not grant authority.

## Consequences

### Benefits

- Every Company receives authority through an explicit, deterministic path.
- The unique Founder Seat has clear continuity and transfer rules.
- Admin administration remains simple and accountable for Version 1.
- Recovery is possible without granting platform support ordinary Company business authority.
- Implementers can enforce authorization without inventing bootstrap, transfer, or recovery policy.

### Costs and risks

- Company provisioning must be atomic with Founder bootstrap.
- A secure platform-operator recovery procedure and restricted support authorization boundary are required before recovery can be implemented.
- Founder transfer and all role changes require durable audit storage and transactional enforcement.
- A Company may temporarily lack exercisable Founder authority while recovery verification is pending.
- Founder-only Admin administration creates a deliberate dependency on recovery when the Founder cannot act.

## Rejected alternatives

### Make the first user to sign in the Founder

Rejected because login order is not reliable authorization evidence and could grant Company authority accidentally.

### Allow multiple Founders

Rejected for Version 1 because it weakens the accountability of the Founder Seat and introduces quorum, conflict, and succession complexity.

### Allow Admins to promote a Founder or administer other Admins

Rejected because Admin operational authority must not silently become control over the Company's highest authority or its peer-administration structure.

### Automatically restore authority when an account is reactivated

Rejected because reactivation proves availability, not current authorization.

### Give a platform operator Company business authority during recovery

Rejected because recovery administration must not create cross-Company operational access or permit Company business decisions.

### Implement automatic or predesignated succession in Version 1

Rejected because voluntary transfer plus governed recovery resolves continuity without adding dormant grants, timers, or competing authority state.

## Acceptance criteria

- New-Company Founder bootstrap is deterministic and atomic.
- Founder Seat responsibility, uniqueness, eligibility, and evidence are explicit.
- Voluntary transfer, planned succession, and the outgoing Founder's resulting role are explicit.
- Admin assignment, revocation, and self-relinquishment authority are explicit.
- No-active-Founder, inactive-Founder, and disabled-Founder recovery paths are explicit.
- Recovery does not grant platform operators Company business authority.
- Required structured evidence is defined for every role-administration action.
- Capability inheritance and Company isolation are explicit.
- Implementation requires no new business-policy assumption to resolve CB-1.

## Related decisions

- ADR-000: Cotarion Product Development Methodology
- ADR-001: Cotarion Platform Architecture
- ADR-015: Application Users Belong to One Company Workspace
- ADR-019: Platform Governance & Decision Authority
