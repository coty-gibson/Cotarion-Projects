# ADR-000: Cotarion Product Development Methodology

## Date

2026-07-20

## Status

Product Owner Approved

## Context

Cotarion Platform will span shared platform capabilities and multiple operating groups, including Consulting, Marketing, HR, Technology, Bookkeeping, Legal, and future groups. Each capability needs a repeatable path from business discovery through architecture, implementation, acceptance, release, and operational learning.

Without a governing methodology, business policy can be invented during implementation, UI constraints can distort domain architecture, historical records can be put at risk, and chat or code can silently replace approved decisions.

## Decision

Every major Cotarion Platform capability must follow the nine-phase methodology in this ADR. This is the governing methodology referenced by future capability ADRs and implementation plans.

Phases may overlap for discovery or risk reduction, but gates may not be skipped. A later phase cannot silently resolve a missing decision owned by an earlier phase.

## Phase 1 — Business Discovery

### Owner

Founder / Product Owner

### Purpose

Define the business problem, operating workflow, users, policies, constraints, and Version 1 scope.

### Required outputs

- Business problem statement
- Current and desired workflow
- Users and responsible roles
- Business rules and defaults
- Required records and evidence
- Version 1 scope
- Explicitly deferred capabilities
- Open Product Owner decisions

No architecture or implementation assumption may replace an unresolved business decision.

### Exit criteria

- The operating problem and intended outcome are understandable without reference to a proposed screen or database table.
- Material policy gaps are explicitly assigned to the Product Owner.
- Version 1 and deferred scope are distinguishable.

## Phase 2 — Product Architecture

### Owner

Product Architect

### Purpose

Translate the approved business model into durable platform architecture.

### Required considerations

- Domain ownership
- Aggregate and entity boundaries
- Lifecycles and state transitions
- Immutable records and versioning
- Company, Client, user, and operating-group isolation
- Integration boundaries
- Event and Platform Timeline requirements
- Security and authorization
- Future extension points
- Risks of premature generalization
- Risks of implementation-driven business policy

### Required output

Architecture recommendations suitable for ADR preparation.

### Exit criteria

- Business responsibilities have owners.
- Source-of-truth and representation boundaries are explicit.
- Historical, isolation, integration, and future-extension risks are documented.

## Phase 3 — Architecture Decision Record

### Owner

Engineering, with Product Architect review

### Purpose

Document the proposed authoritative architecture and the reasoning behind it.

### Required ADR contents where applicable

- Context
- Decision
- Scope
- Non-goals
- Terminology
- Domain model
- Invariants
- Lifecycle
- State-transition rules
- Data ownership
- Integration contracts
- Events
- Security
- Retention
- Migration considerations
- Future extensibility
- Risks
- Rejected alternatives
- Product Owner decisions still required
- Acceptance criteria

### Status model

Capability ADRs must distinguish at minimum:

- `Proposed`: drafted and awaiting architectural review or decisions.
- `Architecture Approved`: architecture accepted, with Product Owner policy possibly outstanding.
- `Product Owner Approved`: architecture and material Product Owner policies approved for roadmap preparation or implementation.
- `Superseded`: replaced by a later ADR while retained historically.
- `Rejected`: considered but not adopted.

Historical ADRs may retain earlier labels such as `Approved`, `Accepted`, or `Deprecated`. Their original meaning and decision history must not be rewritten merely for vocabulary normalization. New or materially amended capability ADRs use this status model.

### Gate

A capability must not enter implementation while material Product Owner policy decisions remain unresolved.

## Phase 4 — Product Governance

### Owner

Founder / Product Owner

### Purpose

Approve the business policies that software must enforce.

### Policy examples

- Defaults
- Expiration periods
- Numbering formats
- Approval authority
- Acceptance rules
- Retention rules
- Workflow bypass rules
- Legal readiness requirements
- Direct-workflow eligibility
- Operating-group ownership

### Required output

Product Owner decisions encoded into the governing ADR as authoritative policy. Chat, tickets, meeting notes, or implementation details alone are not authoritative policy stores.

### Exit criteria

- All material decisions affecting invariants, workflow, evidence, or scope are resolved.
- Policy wording is testable and traceable.

## Phase 5 — Implementation Roadmap

### Owner

Engineering, with Product Architect and Product Owner review

### Purpose

Convert approved capability architecture into an incremental implementation plan.

### Required roadmap contents

- Sprint sequence
- Dependencies
- Domain implementation order
- Persistence and migration order
- Application-service order
- UI order
- Integration points
- Testing strategy
- Risks
- Deferred technical debt
- Commit and pull-request boundaries
- Per-sprint acceptance criteria
- Final capability exit criteria

The roadmap may be an ADR when it represents an authoritative development decision.

### Exit criteria

- Work can proceed incrementally without inventing business policy.
- Architectural risk is addressed before dependent UI or integration work.
- Every sprint has independently verifiable acceptance criteria.

## Phase 6 — Engineering Implementation

### Owner

Engineering

### Rules

- Implement only approved scope.
- Do not invent material business policy.
- Stop and escalate when architecture or business policy is ambiguous.
- Preserve historical data and issued identifiers.
- Prefer additive, forward-only migrations.
- Keep business logic outside presentation and infrastructure layers.
- Keep integrations behind explicit contracts.
- Commit business state and immutable events atomically where applicable.
- Maintain regression boundaries for existing capabilities.
- Ensure each increment builds and tests independently.

### Required evidence

- Traceability from implementation to policy, ADR, or roadmap.
- Tests proportional to business, security, migration, and integration risk.
- Explicit documentation of deviations, debt, and deferred work.

## Phase 7 — Architecture Conformance Review

### Owner

Product Architect and Engineering

### Purpose

Verify that implementation conforms to approved architecture.

### Review scope

- Domain boundaries
- Business invariants
- Lifecycle enforcement
- Versioning and immutability
- Security and isolation
- Integration coupling
- Data retention
- Migration safety
- Deferred-scope leakage
- Technical debt
- Test coverage against architectural risks

### Material deviations

A material deviation requires either:

- implementation correction; or
- an amended or superseding ADR.

The code must not silently become the new architecture.

### Exit criteria

- Conformance result and any accepted deviations are documented.
- No unresolved material deviation enters Product Acceptance.

## Phase 8 — Product Acceptance

### Owner

Founder / Product Owner

### Purpose

Validate the capability through actual business use.

### Acceptance questions

- Can the Product Owner complete the workflow without developer tools?
- Does the workflow reflect how Cotarion operates?
- Are terminology and defaults understandable?
- Is required evidence retained?
- Are exceptions manageable?
- Does the capability reduce operational friction?
- Are gaps defects, refinements, future scope, or architectural issues?

### Classification

Unmet needs are classified as:

- Critical Defect
- Non-critical Defect
- Refinement Backlog
- Deferred Capability
- New Architectural Decision

### Exit criteria

- Product Owner operational acceptance is explicitly recorded.
- No Critical Defects remain.
- Remaining observations are governed and do not ambiguously block release.

## Phase 9 — Release and Operational Learning

### Owner

Engineering and Product Owner

### Required outputs

- Release notes
- Migration record
- Operating guide
- Known limitations
- Deferred backlog
- Architecture-conformance result
- Product acceptance result
- Monitoring or operational follow-up requirements

Operational learning may trigger a new ADR or amendment, but historical decisions remain traceable.

### Exit criteria

- Release artifacts correspond to the accepted implementation.
- Operational ownership, known limits, and follow-up are clear.
- The capability tracker is updated.

## Binding governance principles

1. Business policy is approved by the Product Owner.
2. Architecture is not determined by UI convenience.
3. Engineering may make routine technical decisions but may not invent material business rules.
4. ADRs explain why the platform works as it does.
5. Implementation plans explain how approved architecture will be delivered.
6. Issued identifiers and historical business records are permanent.
7. Major records are archived rather than deleted.
8. Version 1 remains focused without blocking intentional future extension.
9. Every material implementation decision is traceable to approved business policy or architecture.
10. Product Owner operational acceptance is required before a capability is complete.
11. Deferred capabilities are explicit and are not partially implemented by accident.
12. Platform domains reflect Cotarion's operating model rather than forcing the business into arbitrary software screens.

## Roles and decision rights

### Founder / Product Owner

- Owns business policy, scope, priorities, and operational acceptance.
- Approves material defaults, exceptions, evidence, and release readiness.
- Does not delegate business-policy authority to implementation convenience.

### Product Architect

- Challenges assumptions.
- Protects domain boundaries and intentional future extensibility.
- Identifies premature generalization and structural debt.
- Performs architecture-conformance review.
- Does not replace Product Owner business-policy decisions.

### Engineering

- Designs routine implementation details.
- Documents proposed architecture.
- Builds, tests, migrates, validates, and reports risks.
- Preserves approved invariants and historical integrity.
- Escalates material ambiguity rather than encoding assumptions.

### Legal Reviewer

- Approves legal language where the platform contains contracts, clauses, disclosures, or regulated content.
- Determines legal-content readiness, not general product priority.

### Future Operating-Group Leaders

- Contribute operating requirements for their group.
- Do not override platform-wide governance, shared-domain ownership, or Product Owner authority.

One person may perform multiple roles during early-stage development. Responsibilities and decision rights remain distinct even when the same person holds them.

## Stop-and-escalate rule

Engineering must pause the affected work and seek the responsible decision when encountering:

- Conflicting ADR requirements
- Missing business policy
- A requested change that violates an invariant
- Historical data conflicting with a proposed migration
- Security or isolation ambiguity
- Legal-content ambiguity
- Scope belonging to a future operating group
- A shortcut that would make a representation or read model the source of truth
- A need to rewrite issued identifiers or immutable history

Unaffected work may continue only when it cannot prejudice the pending decision.

The escalation records:

- conflicting or missing authority;
- affected capability and invariant;
- evidence discovered;
- safe options and consequences;
- work paused;
- decision owner.

## Definition of capability completion

A capability is not complete merely because code exists. It is complete only when:

- Architecture is approved.
- Product policies are approved.
- Implementation roadmap is complete.
- Required implementation is delivered.
- Migrations and integrations pass.
- Regression boundaries pass.
- Architecture conformance is confirmed.
- Product Owner operational acceptance is complete.
- Documentation and release records are complete.
- No Critical Defects remain.

## Traceability and records

- Capability ADRs and amendments reference ADR-000.
- Authoritative implementation roadmaps reference their governing capability ADRs and ADR-000.
- Capability status is summarized in `docs/product/capability-tracker.md`.
- The tracker does not replace ADRs, plans, test evidence, acceptance records, or release records.
- Superseded and rejected decisions remain in history.

## Consequences

### Benefits

- Business policy, architecture, delivery, and acceptance have explicit owners.
- Architectural decisions remain explainable and reviewable.
- Historical integrity and operating-group boundaries receive consistent protection.
- Capabilities can advance incrementally without confusing implementation progress with business acceptance.

### Costs

- Material capabilities require documented gates before implementation.
- Conformance and operational acceptance add deliberate review work.
- Status must be maintained as capabilities advance.

These costs are accepted because Cotarion Platform is intended to become a long-lived operational system.

## Rejected alternatives

### Code-first capability delivery

Rejected because code would encode business and architecture decisions before their owners approved them.

### Treat tickets or chat as the policy system of record

Rejected because decisions become fragmented, hard to trace, and easy to contradict.

### One universal design for every operating group

Rejected because shared platform concepts should remain reusable while operating-group domains preserve distinct business methodologies.

### Mandatory document expansion for routine engineering

Rejected because the methodology governs material decisions and capability gates, not every ordinary implementation choice.
