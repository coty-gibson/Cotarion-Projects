# Pricing Product Owner Decision Record

Date: 2026-07-21

Status: Product Owner Approved

Capability: Pricing Completion

Authority: Product Owner governance policy under ADR-000

## Executive Summary

This record resolves the remaining Product Owner governance questions identified by the Product Architect in `Pricing_Bounded_Context_Reconciliation.md`. It is the authoritative Product Owner policy for Pricing Completion and supplies the business decisions required before Pricing Completion Phase 1.

The Product Owner approves an explicit Pricing Version workflow: only Save Version creates a Version; Quality Review binds an existing Draft-current Version; approval selects that Version without creating or changing it. Pricing alone determines Proposal eligibility. Proposal consumes an approved immutable Pricing Version, stores both Project and Version identities, and never consumes or recalculates a Draft.

This record does not amend an ADR. Proposed ADR-021 currently contains conflicting automatic-Version-creation wording. For Product Owner policy, this record and the accepted Pricing Bounded Context Reconciliation control: explicit Save Version is approved and automatic creation on Review is rejected. ADR-021 must be conformed to this policy through the separately governed ADR amendment process; implementation must not follow its conflicting proposed wording.

## Approved Product Owner Decisions

### 1. Explicit Pricing Version creation

Pricing Versions are created only through an explicit Save Version command.

- Saving a Draft does not create a Version.
- Requesting Quality Review does not create a Version.
- Approving a Quality Review does not create a Version.
- Rejecting or requesting changes does not create a Version.
- Beginning a Revision does not create a Version.
- Proposal creation does not create a Pricing Version.
- Save Version must validate and authoritatively recalculate the current Draft before atomically creating the immutable Version.

This decision supersedes conflicting Product Owner policy assumptions in proposed ADR-021. Quality Review binds an already saved Version that still represents the current working Draft.

### 2. Draft mutability and Version immutability

A Pricing Draft is mutable only while the Pricing Project is in `DRAFT`. A Pricing Version is immutable forever.

Draft edits may make a saved Version stale relative to the working Draft, but they never alter, delete, replace, or renumber that Version. Draft currency is determined authoritatively from aggregate evidence, not by presentation code.

### 3. Proposal may never consume a Draft

Proposal may never consume mutable Pricing Draft state. Proposal may consume only the current approved immutable Pricing Version of an eligible Pricing Project.

Any missing, stale, unapproved, noncurrent, cross-Company, incompatible, or otherwise ineligible source must fail closed.

### 4. Proposal stores Project and Version identities

Proposal stores both:

- `pricingProjectId`, which provides permanent workflow and lineage identity; and
- `pricingVersionId`, which provides exact commercial authority and provenance.

Project identity alone is insufficient commercial evidence. Version identity does not replace Project lineage.

### 5. Pricing is the eligibility authority

Proposal never determines Pricing eligibility. Pricing is the authoritative source for whether a Version is current, approved, Company-compatible, Client-compatible, and eligible for Proposal consumption.

Proposal obtains eligible evidence through an explicit Pricing-owned read contract. HTTP callers, React, Proposal status checks, or caller-supplied approval assertions cannot substitute for that authority.

### 6. Reviewer independence is mandatory

The Pricing Version creator may never approve that Version.

- Reviewer independence is mandatory for every Company and every user role.
- Founder, Admin, ownership, capability, or emergency circumstances do not create a bypass.
- Executive Authorization cannot substitute for Pricing Quality Review.
- Authorization, Company scope, active-user status, effective review capability, candidate binding, and independence are revalidated when the decision commits.

A Company without a second eligible reviewer cannot make a creator's Version `QUOTED` until another eligible independent reviewer exists.

### 7. Beginning a Revision

Beginning a Revision returns a `QUOTED` Pricing Project to `DRAFT`.

- New-Proposal eligibility pauses immediately.
- Existing Pricing Versions and review evidence remain immutable.
- The previously approved Version remains historically approved but is not current for new Proposal creation while the Project is in Draft.
- Existing Proposals remain unchanged.
- A revised Proposal may use later Pricing only through a separately governed Proposal action after a new Version is saved and approved.

### 8. Self-sufficient Pricing Versions

Every Pricing Version must be self-sufficient historical commercial evidence. It must contain or immutably reference enough frozen evidence to render and explain exactly what the customer saw even when:

- Pricing Configuration changes;
- Service Catalog content, descriptions, ordering, status, or prices change;
- the Pricing engine changes;
- methodology changes; or
- future software and serialization versions change.

At minimum, the Version preserves the Project/estimate, Company, Client, owner, creator, Version number, creation time, currency, Pricing Model, Configuration identity and Version, schema/engine/methodology identities, normalized calculation inputs, consumed catalog labels/descriptions/prices, adjustments, calculated outputs, rounding and explanation evidence, and review provenance required for historical interpretation.

Historical rendering must not silently recalculate or reinterpret a Pricing Version with current configuration or current domain rules.

### 9. Configuration Version and Pricing Version are distinct

`PricingConfigurationVersion` is immutable, reusable business configuration used as an input to Pricing calculations.

`PricingVersion` is immutable, Project-specific commercial evidence produced from one Draft using one exact Configuration Version.

Publishing or retiring configuration never changes a Pricing Version. Creating a Pricing Version never publishes or mutates configuration.

### 10. Exact meaning of QUOTED

`QUOTED` has exactly one meaning: the Pricing Project identifies exactly one current Pricing Version that has passed mandatory independent Quality Review and is eligible for a new Proposal.

`QUOTED` does not mean that a Proposal exists, has been sent, accepted, or converted to an Agreement or Engagement. A status value without immutable Version and approval evidence does not satisfy `QUOTED`.

### 11. Proposal eligibility belongs exclusively to Pricing

Pricing owns the source-of-truth eligibility decision and the eligible snapshot contract. Proposal may apply its own Company, Client, currency, operating-group, and engagement compatibility checks as defense in depth, but it may not promote, approve, reinterpret, or make a Pricing source eligible.

### 12. Administration and historical Versions

Authorized administration may configure future effective Pricing inputs through governed, Company-scoped, immutable Configuration Versions. Administration may never alter, republish, delete, or reinterpret a historical Pricing Version.

Configuration publication affects future permitted selection only. It never triggers retroactive Pricing or Proposal recalculation.

### 13. Domain invariants remain code-owned

Administration never edits or overrides:

- Pricing philosophy;
- Pricing model eligibility, including Advisory Consulting as the only hourly model;
- Quality Review policy;
- approval rules or reviewer independence;
- lifecycle transitions;
- historical behavior;
- Proposal authority or Pricing eligibility ownership;
- immutable Version behavior;
- Company isolation;
- Proposal non-recalculation; or
- append-only evidence requirements.

These are protected domain and application invariants. Configurable data cannot become an unrestricted formula, scripting, or policy-bypass system.

### 14. Command idempotency

Every mutating Pricing command is idempotent.

The application boundary requires a Company-scoped idempotency key and records enough request identity and result evidence to replay the original result. Replaying Save Version does not allocate another Version number. Replaying a review or transition command does not duplicate evidence or repeat a transition. Reusing a key for a materially different command, target, or payload is rejected.

Read-only queries are not business commands and do not require mutation idempotency records.

### 15. Optimistic concurrency

Every mutating Pricing transition and evidence-producing command requires optimistic concurrency against the authoritative aggregate revision.

This includes Draft updates, Save Version, Request Quality Review, approve, reject/request changes, Begin Revision, and Archive. A stale command fails without partial changes. Draft currency, Version allocation, candidate binding, reviewer checks, status transition, audit evidence, and event append commit atomically where they form one business operation.

### 16. Append-only Pricing business events

Every durable Pricing business event is append-only and immutable after commit. Event identities are stable and never reused.

Significant events include Pricing Project creation, Pricing Version saved, Quality Review requested, Quality Review approved, Quality Review rejected/requested changes, Revision begun, and Pricing Project archived. Corrections add new evidence and never rewrite an earlier event.

Ordinary Draft-field changes may be retained as operational audit evidence without being promoted to a public business timeline event. This does not permit rewriting significant events.

### 17. Workspace authority

The Pricing Workspace never determines authority. Server-provided read models and permitted-action projections are the sole presentation source for whether an action may be rendered.

The server and domain remain final authority when a command executes. A visible action is not a guarantee that a later command will succeed after concurrent state or authority changes.

### 18. React contains no Pricing lifecycle rules

React must not calculate or infer Pricing lifecycle status, eligibility, reviewer independence, Draft/Version currency, approval authority, Company scope, or role/capability meaning.

React may choose labels, icons, layout, dialogs, temporary pending-state disabling, and accessible feedback. It renders an action only when the matching server-provided permitted-action value is true.

### 19. Proposal never recalculates Pricing

Proposal never imports or executes Pricing calculators and never recalculates a Pricing Version or Pricing snapshot. It freezes the authoritative eligible Version evidence returned by Pricing.

Later Pricing configuration, calculation, revision, approval, or archival activity never refreshes an existing Proposal automatically.

### 20. Historical Pricing evidence is never rewritten

Pricing Versions, Version numbers, captured commercial content, review decisions, significant events, and Proposal source snapshots are permanent historical evidence.

Corrections are forward-only: update a Draft, explicitly Save the next Version, complete a new independent review, and use a separately governed Proposal action when later evidence is required. Migration and compatibility work must preserve legacy meaning and must never fabricate creator, review, approval, or Version evidence.

## Explicit Non-Decisions

This record deliberately does not decide implementation mechanics that do not alter Product Owner policy:

- Prisma model names, table names, columns, indexes, triggers, or migration sequencing.
- HTTP route shapes, response DTO names, transport status codes, or React component structure.
- Repository implementation, transaction library, serialization library, content-hash algorithm, or outbox technology.
- The exact accessible visual design of Version history and Quality Review screens.
- The exact maximum length or UI wording for optional/required Version notes and review findings, provided the approved evidence policy is preserved.
- Services & Pricing Administration publication workflow, effective-date workflow, operating-group precedence, and user interface. Those require their dedicated capability governance and may not contradict this record.
- A future Archive restoration workflow, alternate approval workflow, or single-user bypass. None is authorized in Version 1.
- Retroactive conversion of legacy Proposal Pricing snapshot V1 records into fabricated Pricing Versions. A later migration plan must preserve them as distinguishable legacy evidence.

These non-decisions do not permit implementation to invent business behavior. A technical choice that would affect an invariant, authority, lifecycle, evidence, historical meaning, or Company isolation must stop and return to governance.

## Implementation Constraints

Pricing Completion implementation must:

- preserve the dependency direction Workspace/React → HTTP or approved server boundary → Application Services/Query Services → Pricing Domain → Persistence;
- keep calculation, lifecycle, review, eligibility, and historical-integrity rules out of React and HTTP;
- enforce Company scope on every Project, Version, Configuration, review, actor, event, and Proposal integration query;
- use explicit Save Version and reject Review when the selected Version no longer represents the working Draft;
- make Version allocation monotonic, transactional, immutable, and idempotent;
- make lifecycle state, Version binding, decision evidence, audit event, and aggregate revision atomic where required;
- make Proposal resolve exact eligible Version evidence from Pricing rather than accept caller-authored eligibility assertions;
- store both `pricingProjectId` and `pricingVersionId` in the future authoritative Proposal Pricing source contract;
- preserve existing Proposal snapshots and Pricing history through additive, forward-only migration;
- fail closed when current eligibility or historical evidence cannot be proven; and
- implement only the phase scope authorized by the accepted Pricing Bounded Context Reconciliation.

## Architecture Consequences

1. The explicit Save Version decision replaces proposed ADR-021's automatic candidate-creation assumption. ADR-021 requires a conforming amendment before it can become the approved lifecycle ADR.
2. Quality Review becomes a workflow over an already immutable, Draft-current Version. It never freezes hidden evidence as a side effect.
3. Pricing Project is the workflow aggregate and lineage identity; Pricing Version is the commercial evidence and Proposal authority identity.
4. Pricing must expose an authoritative, Company-safe eligibility reader for Proposal Management.
5. Proposal Pricing snapshot evolution requires an additive schema containing `pricingVersionId`; legacy records remain readable without fabricated provenance.
6. Versions need compatibility metadata and frozen catalog/configuration evidence sufficient for historical rendering without recalculation.
7. Pricing commands require durable idempotency, aggregate revision, atomic evidence, and append-only events.
8. Server-projected permitted actions become the presentation authority boundary while the domain remains final command authority.
9. Services & Pricing Administration may publish future configuration but cannot weaken domain invariants or mutate history.
10. Strict reviewer independence creates an intentional operating constraint: a single eligible user cannot self-approve.

## Phase 1 Authorization

The Product Architect has accepted `Pricing_Bounded_Context_Reconciliation.md`. This record resolves the material Product Owner governance questions required for the pure Pricing Version and governance domain contract.

Pricing Completion Phase 1 is authorized only within its defined boundary: immutable Version capture semantics, explicit Save Version, Draft currency, lifecycle transitions, review evidence, reviewer independence, current-approved selection, Proposal eligibility state, audit event definitions, idempotency command semantics, and optimistic-revision behavior in the pure Pricing domain contract and its focused tests.

Phase 1 does not authorize Prisma changes, migrations, HTTP routes, React workflows, application services, Proposal contract changes, or later Pricing Completion milestones. Those remain subject to their approved sequence and review gates.

The known ADR-021 wording conflict is not authority for automatic Version creation. Implementation follows this Product Owner policy and the accepted reconciliation. ADR-021 conformance remains required before it is advanced from `Proposed` or used as the final approved lifecycle ADR.

The Product Owner authorizes implementation of Pricing Completion Phase 1 exactly as defined by the approved Pricing Bounded Context Reconciliation.
