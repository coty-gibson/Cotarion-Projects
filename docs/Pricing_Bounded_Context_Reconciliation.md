# Pricing Bounded Context Reconciliation

Date: 2026-07-21

Sprint: Pricing Completion — Phase 0

Status: Product Architecture recommendation; implementation is not authorized

## Executive Summary

The Pricing Workspace is a substantial, Company-isolated Draft calculation capability, but the approved Pricing Projects capability is not complete. It implements five calculation methodologies, editable Draft persistence, immutable Pricing Configuration references, and Proposal-compatible commercial snapshots. It does not implement immutable `PricingVersion` records, governed Quality Review, approval evidence, lifecycle commands, authoritative `QUOTED` eligibility, or exact-Version Proposal consumption.

The repository contains a material governance contradiction. The Product Owner decision register in the Pricing Projects planning proposal says Versions are created only by an explicit **Save Version** action. Proposed ADR-021 instead says requesting Quality Review creates the Version automatically. Because ADR-021 remains `Proposed`, its review package remains awaiting Product Architect and Product Owner review, and the older document labels explicit Save Version “Approved and Locked,” implementation must not select either behavior silently.

This reconciliation recommends preserving the explicit Save Version contract. Saving a Version freezes a valid, server-recalculated Draft. Requesting Quality Review must bind the latest Version only when that Version still represents the working Draft. Review and approval do not create or mutate a Version. This keeps Version creation visible, separates commercial evidence from workflow decisions, supports a useful immutable history before review, and matches the approved completion scope.

ADR-021 should be amended to encode that contract and then approved. ADR-003, ADR-004, and ADR-008 are headings with `Proposed` status rather than usable decision records; they must be completed and approved, not treated as authoritative merely because their intended rules appear in code and specifications. Phase 1 must not begin until these governance gates and the remaining Product Owner decisions in this document are resolved.

## Current Repository State

### Implemented

- One Company-scoped `PricingProject` record supports `PROJECT`, `FIXED_RETAINER`, `PROFIT_SHARE_RETAINER`, `HYBRID_RETAINER`, and `ADVISORY_HOURLY`.
- The Pricing Domain owns fixed-decimal calculations, validation, rounding, model-specific inputs, outputs, and explanation evidence.
- Users can create, calculate, save, reopen, and edit Drafts through the Pricing Workspace.
- Pricing Projects retain an immutable estimate number and a same-Company Client, owner, and exact `PricingConfigurationVersion` reference.
- Service Catalog records and immutable Pricing Configuration Version snapshots are Company-scoped. Seed logic fails closed when an existing baseline differs.
- Draft input and output snapshots, model, methodology version, currency, service lines, complexity choices, and discounts are persisted.
- Persistence recognizes `DRAFT`, `IN_REVIEW`, `QUOTED`, and `ARCHIVED`, but recognizing status codes is not implementation of their governed transitions.
- Proposal Management freezes the supplied Pricing snapshot and never recalculates it.

### Not implemented

- No `PricingVersion` persistence model or repository contract exists.
- No current/candidate/approved Pricing Version binding exists on `PricingProject`.
- No explicit Save Version command, Version history, or read-only Version detail exists.
- No Quality Review request, approve, reject/request-changes, begin-revision, or archive application workflow exists.
- No Pricing review capability checks, reviewer-independence enforcement, review evidence, command idempotency, or aggregate revision exists.
- The Pricing Workspace can display non-Draft status labels but offers no lifecycle actions.
- No Pricing-owned eligibility query returns an authoritative current approved Version to Proposal Management.
- No architecture-conformance result, complete Product Owner operational acceptance, release record, clean release checkpoint, or release tag exists for the complete Pricing Projects capability.

### Repository and governance status

The capability tracker correctly records Pricing and Pricing Projects as `In Development`. The milestone report titled “Pricing Workspace Capability” accurately describes the implemented Draft calculation experience, but its broader statements that the complete approved Version 1 Pricing policy is complete and that no Product Owner attention is required conflict with the Pricing implementation plan, ADR-000 completion gates, proposed ADR-021, and the absence of Version/review/approval implementation.

The working tree is not clean. It contains approved but uncommitted Proposal work, Proposal migrations and documentation, Pricing/Proposal planning documentation, a capability-tracker update, and other modified application files. Phase 0 does not attribute those changes to Pricing Completion and does not alter them. A reviewed checkpoint is required before Phase 1 so Pricing Completion changes have a reliable baseline; that checkpoint is a governance/release prerequisite, not authorization to discard, stage, commit, or push current work.

## Architecture Reconciliation

### Authoritative answers to the primary questions

The answers below distinguish current evidence from the recommended contract. Items marked **Product Owner gate** are not authoritative until approved in an amended ADR.

| # | Question | Recommended authoritative contract |
| --- | --- | --- |
| 1 | What is a Pricing Draft? | The mutable working state owned by a `PricingProject` while its lifecycle is `DRAFT`. It contains the current model-specific inputs, catalog/configuration references, server-calculated output, and explanatory evidence. It is not an immutable business record and is never Proposal eligible. |
| 2 | What is a Pricing Version? | An immutable, numbered child record of one Pricing Project that freezes one valid working Draft, the exact configuration and catalog evidence it used, its calculated output, its creator, and its creation evidence. Review evidence refers to the Version but does not alter its captured commercial content. |
| 3 | What becomes immutable? | Project/estimate/Company/Client/owner context; Version number and creator; pricing model, currency, configuration identity/version/snapshot reference, catalog line labels/descriptions/prices, methodology/engine/schema versions, normalized inputs, adjustments, output and rounding/explanation evidence, creation time, and content hash or equivalent deterministic currency evidence. Review decisions are append-only evidence. |
| 4 | When is a Version created? | **Recommendation and Product Owner gate:** only through explicit Save Version. The server validates and recalculates before atomically allocating and persisting it. Draft save, Review request, and Approval do not implicitly create Versions. |
| 5 | Can multiple Versions exist? | Yes. A Project owns an append-only history. Saved, rejected, previously approved, and superseded Versions remain readable permanently. |
| 6 | Version numbering | Positive integers, monotonically increasing and unique within a Pricing Project, allocated transactionally. Numbers are never reused. Estimate number plus Version number is the human-readable reference; the immutable ID is the integration identity. |
| 7 | Can Draft continue after Version creation? | Yes while the Project remains `DRAFT`. Editing makes the previously saved Version non-current relative to the Draft but never changes it. Draft editing is prohibited in `IN_REVIEW`, `QUOTED`, and `ARCHIVED`. |
| 8 | How do Draft and Version relate? | Draft is mutable working state; Version is a point-in-time immutable capture. The aggregate records a Draft revision or deterministic currency token on each Version. A Version represents the current Draft only while that evidence matches. UI comparison is forbidden; the domain/application projection supplies currency and permitted actions. |
| 9 | Reviewer independence | The decision actor must be an active, same-Company Founder/Admin with the effective Pricing Quality Review capability and must not be the Version creator. Identity, capability, Company, candidate binding, and concurrency are revalidated at commit. Higher role does not bypass independence. |
| 10 | What is Proposal eligible? | Exactly the current approved immutable Pricing Version selected by a Pricing Project whose current lifecycle is `QUOTED`, returned through the Pricing-owned eligibility contract. An older approved Version is historical but not eligible for a new Proposal. |
| 11 | Does Proposal reference Project or Version? | Both for lineage, but `pricingVersionId` is the authoritative commercial source. `pricingProjectId` and estimate number remain navigational/audit lineage. Proposal must freeze the Version snapshot and approval evidence. |
| 12 | Can Proposal consume a Draft? | Never. It must fail closed if the Project is not `QUOTED`, the Version is not current and approved, Company/Client/currency/operating-group compatibility fails, or evidence is incomplete. |
| 13 | How are Version corrections handled? | A Version never changes. Before approval, rejection returns the Project to Draft; edit and Save Version creates the next number. After `QUOTED`, Begin Revision returns the same Project to Draft and pauses new-Proposal eligibility; edit and save a new Version, then review again. Existing Proposals retain the earlier Version. |
| 14 | What creates a new Version? | Only successful explicit Save Version in the recommended contract. Review, approval, rejection, status display, ordinary Draft save, Proposal creation, and configuration publication do not create one. |
| 15 | Can a Version change? | Its captured content, identity, number, and creator cannot change or be deleted. Review evidence is appended separately and the aggregate may select it as candidate/current approved; those relationships do not mutate captured Version content. |
| 16 | Pricing Configuration Version vs Pricing Version | Configuration Version is immutable Company-scoped rule/data input reusable by many Projects. Pricing Version is immutable Project-specific commercial evidence produced using exactly one Configuration Version. A Pricing Version stores the configuration identity/version and sufficient snapshots for historical explanation; later configuration retirement or publication cannot change it. |
| 17 | Aggregate boundaries | `PricingProject` is the workflow aggregate root and owns Draft, Version sequence, candidate/current-approved bindings, review lifecycle, and invariant enforcement. `PricingConfiguration` is a separate aggregate root owning immutable Configuration Versions. The Company Service Catalog is a separate administration aggregate/boundary; a Pricing Version snapshots consumed catalog evidence. Value objects include estimate/version numbers, money/decimal/percentage, model-specific typed input/output snapshots, currency token, review findings, and actor/time evidence. |
| 18 | Lifecycle | `DRAFT` is mutable. Save Version is a same-state evidence action. Request Quality Review binds a Draft-current Version and moves to `IN_REVIEW`. Approve moves to `QUOTED`; Reject/Request Changes moves to `DRAFT`. Begin Revision moves `QUOTED` to `DRAFT` and pauses eligibility. Archive moves `DRAFT` or `QUOTED` to terminal `ARCHIVED`. All other transitions are illegal. |
| 19 | Timeline/business events | Immutable significant events: Project Created; Pricing Version Saved; Quality Review Requested; Quality Review Approved; Quality Review Changes Requested/Rejected; Revision Begun; Project Archived. Draft field saves are audit changes, not necessarily public business timeline events. Proposal consumption may record a cross-context reference/audit event without changing Pricing lifecycle. |
| 20 | Audit requirements | Permanently record Company, Project/estimate, Version ID/number, actor, occurred time, request/idempotency ID, Draft revision/currency evidence, transition, reviewer, decision, findings, resulting status, approved-Version binding, configuration/methodology/engine/schema identities, and Proposal references. Corrections append evidence; they never rewrite history. |
| 21 | Idempotency | Every mutating command requires a Company-scoped idempotency key. Replay returns the original result. Save Version must not allocate a second number; review request must not create/rebind another candidate; decisions and transitions must not duplicate evidence. Key reuse with different payload/target is rejected. |
| 22 | Concurrency | Use optimistic aggregate revision on every command and transactional uniqueness for `(pricingProjectId, versionNumber)`. Draft-current checks, reviewer independence, candidate binding, Version allocation, status transition, audit/event append, and current-approved selection commit atomically. Stale commands fail without partial state. |
| 23 | Future Proposal dependency | Proposal depends only on a Pricing-owned eligibility/read contract, not Pricing repositories or calculators. The contract returns the exact current approved Version snapshot. Proposal permanently stores `pricingVersionId`, Project lineage, approval/configuration/methodology evidence, and the frozen commercial snapshot. |
| 24 | Future Services & Pricing Administration dependency | Administration publishes new immutable Configuration Versions and manages catalog/configuration working state. Pricing Projects bind a specific effective Version and never reinterpret history using current administration data. Pricing lifecycle and review authority remain domain policy, not editable configuration. |
| 25 | Future Retainers dependency | Retainer level, term, rate, and AOP-related configuration may become versioned business configuration, while calculation invariants remain in the Pricing Domain. Every Retainer Pricing Version freezes exact inputs, selected definitions, methodology, and output needed for reproduction. |
| 26 | Future Engagement dependency | Engagement receives commercial provenance through accepted Proposal/Agreement records, not a mutable Pricing Draft or current catalog. It may retain Pricing Project/Version lineage but cannot recalculate or revise Pricing history. |

### Lifecycle

```text
Create
  -> DRAFT
       |-- Save Version N --------------------------> DRAFT
       |     (immutable evidence; Draft may continue)
       |-- Request Quality Review of Draft-current N -> IN_REVIEW
       |                                                |-- Approve -> QUOTED
       |                                                `-- Reject / Request Changes -> DRAFT
       `-- Archive ------------------------------------> ARCHIVED

QUOTED -- Begin Revision -> DRAFT
QUOTED -- Archive --------> ARCHIVED
```

Additional rules:

- Request Review requires a Version and rejects a stale Version whose saved Draft-revision evidence no longer represents the working Draft.
- `IN_REVIEW` binds exactly one candidate and freezes working content.
- Approval selects the bound candidate as current approved; it does not recalculate or modify it.
- `QUOTED` has one precise meaning: one current independently approved Version is eligible for new Proposal creation.
- `ARCHIVED` is terminal in Version 1 and preserves all evidence.

## Current Contradictions and Required Disposition

| Evidence | Contradiction | Required disposition |
| --- | --- | --- |
| Pricing Projects planning proposal: explicit Save Version is “Approved and Locked.” | Proposed ADR-021 creates a candidate Version automatically on Review request. | Product Owner must choose. This document recommends explicit Save Version and an ADR-021 amendment before approval. |
| Planning proposal discourages returning `QUOTED` to Draft, while its correction wording assumes editable Project work. | Proposed ADR-021 explicitly defines Begin Revision `QUOTED` → `DRAFT`. | Adopt ADR-021’s explicit Begin Revision semantics; amend the older plan rather than leaving ambiguous correction behavior. |
| Milestone report calls the Pricing Workspace capability complete and says no Product Owner attention is required. | Versioning, review, approval, acceptance, release, and multiple governance gates are absent. | Retain the report as evidence of the Draft workspace milestone; do not use it as complete capability/release evidence. |
| ADR-003, ADR-004, ADR-008 are listed as governing ADRs and their themes exist in requirements/code. | Each file contains only title/date/`Proposed`, with no decision, scope, invariants, or approval. | Complete and approve them; implementation is not a substitute for an ADR. |
| ADR-016 is `Accepted` and delegates lifecycle to ADR-021. | ADR-021 remains `Proposed`; its review package says approval is pending. | ADR-016 remains historical and valid for model/aggregate strategy, but lifecycle work must wait for ADR-021 approval. |
| Prisma and persistence allow direct status updates to all four status codes. | No application/domain lifecycle authority, evidence, independence, or atomic transition contract exists. | Treat status persistence as infrastructure scaffolding only; Phase 1 must put transitions behind the aggregate/application boundary. |
| Proposal contracts say Proposal consumes approved Pricing evidence. | `ProposalPricingSnapshotV1` and `ProposalPricingSource` contain Project identity but no Pricing Version identity; creation accepts the snapshot through HTTP. | Add `pricingVersionId` and use a server-side Pricing eligibility contract in a later approved integration milestone. Do not trust client-asserted eligibility. |
| Configuration-over-code requirements describe administration. | The initial catalog/configuration is hard-coded and seeded; no administration workflow exists. | Preserve the baseline for migration, then introduce governed publication in the separate Services & Pricing Administration capability. Do not make invariants editable. |
| Product Owner Refinement item POR-003 for Retainer pricing remains `Recorded`. | Five Retainer-related models are implemented and the milestone calls them complete. | Product Owner must review, validate, reclassify, or close POR-003; engineering cannot change its status. |
| Legacy Implementation Plan says approved planning artifacts are complete and implementation not started. | Foundation, Pricing, and Proposal work now exists under later capability plans. | Preserve the legacy plan historically; use capability names and current tracker/ADRs for new work. |

## Domain Rules Classification

### A. Domain invariants — never configurable

- Project pricing is value-based; hours worked do not determine Project price.
- Hourly billing is limited to Advisory Consulting.
- Every calculation uses a supported explicit Pricing Model and server-owned domain policy.
- Money, decimal precision, allowed arithmetic behavior, and historical reproducibility are protected.
- A Draft is never Proposal eligible.
- A Pricing Version’s captured content is immutable and numbers are never reused.
- `QUOTED` requires one current independently approved immutable Version.
- Version creator cannot approve that Version; Company isolation is mandatory.
- Proposal consumes one eligible Version and never recalculates or retroactively refreshes it.
- Later catalog, configuration, methodology, review, revision, or archival activity never changes existing Pricing Versions or Proposal snapshots.
- Lifecycle transitions, review authority, idempotency, concurrency, and atomic evidence are domain/application rules, not administration fields.

### B. Versioned business configuration — potentially administrable after approval

- Service offerings, codes, descriptions, active/inactive state, default unit and price.
- Service/category ordering and operating-group applicability.
- Retainer level and term definitions, descriptions, base fees, and allowed selections.
- Advisory rate values and effective dates, while Advisory-only hourly eligibility remains invariant.
- Complexity factor/option definitions and configured increments.
- Discount definitions, configured rates, display eligibility metadata, and effective dates, while stacking/calculation-order invariants remain domain-owned unless explicitly amended.
- Approved methodology/configuration parameters whose variability is specifically defined by an ADR.
- Configuration schema, engine compatibility, effective dates, publication/retirement state, and Company/operating-group applicability.

Publication creates a new immutable Configuration Version. Existing versions and records are never edited retroactively.

### C. Presentation configuration

- Display labels and client-facing descriptions.
- Workspace grouping, ordering, help text, and visibility of inactive choices in administration.
- Formatting metadata that cannot alter arithmetic, authority, eligibility, or historical meaning.

Presentation configuration must be snapshotted when its historical wording is evidence shown in a Version or Proposal.

### D. Deferred concepts

- Unrestricted formula builders, executable user-authored rules, arbitrary scripting, and runtime code expressions.
- Cross-Company/global administration or cross-Company configuration access.
- Retroactive configuration application, manual historical Pricing mutation, or Proposal recalculation.
- Self-approval, Executive Authorization bypass for Pricing, parallel approvers, reviewer assignment queues, approval delegation, and restoration from Archive.
- Semantic comparison, automatic version creation on every Draft save, bulk repricing, and automatic Proposal updates.
- A generic rules engine shared with Retainers, Engagements, or other operating groups before their policies are approved.

## Aggregate Design

### Aggregate roots and entities

**PricingProject aggregate root**

- Owns permanent Project identity, estimate number, Company/Client/owner, lifecycle status, mutable Draft, aggregate revision, and Version sequence.
- Owns `PricingVersion` entities and candidate/current-approved Version bindings.
- Owns review-request and decision evidence needed to enforce one decision per candidate.
- Enforces Draft currency, legal transitions, reviewer independence inputs, and Proposal eligibility state.

**PricingConfiguration aggregate root**

- Owns a Company’s immutable `PricingConfigurationVersion` entities and publication/retirement rules.
- Does not own Pricing Projects or rewrite their history.

**Company Service Catalog administration boundary**

- Owns service identities and working/published catalog state.
- Supplies versioned inputs to Configuration publication; Pricing Version snapshots consumed evidence.
- Its exact aggregate granularity belongs to the Services & Pricing Administration ADR, not this implementation phase.

### Value objects

- `EstimateNumber`, `PricingVersionNumber`, `CompanyId`, `ClientId`, `UserId`.
- `Money`, `Currency`, fixed `Decimal`, `Percentage`, duration/increment values.
- Typed model-specific Draft input and output snapshots.
- `PricingConfigurationReference`, `MethodologyReference`, `EngineReference`, schema version.
- Draft revision/currency token and optional deterministic content hash.
- Review findings and immutable actor/timestamp/request evidence.

### Repositories

- `PricingProjectRepository`: Company-scoped load/save with expected revision; persists the whole transactional workflow boundary.
- `PricingConfigurationRepository`: resolves exact and active Company-scoped Configuration Versions.
- `ServiceCatalogRepository`: resolves permitted Company-scoped catalog evidence for Draft calculation.
- `PricingEligibilityReader`: read-only Pricing-owned contract returning exactly one eligible Version snapshot to Proposal.
- Durable event/outbox and idempotency storage are infrastructure implementations behind application contracts, not domain imports.

### Application services

- Create/load/list/update Draft and recalculate authoritatively.
- Save Version.
- Request Quality Review.
- Approve or request changes/reject.
- Begin Revision and Archive.
- Load Version history/detail and review evidence.
- Resolve actor identity, effective Company-scoped capabilities, and record access.
- Execute idempotency, optimistic concurrency, transactions, and safe error mapping.
- Serve the Pricing eligibility read contract to Proposal Management.

## Version and Historical Accuracy Strategy

Save Version must recalculate from normalized Draft inputs against the Project’s bound Configuration Version before persistence. It must reject invalid, incomplete, stale, cross-Company, or incompatible state. Persisted Version content must be self-describing through schema, engine, methodology, and configuration references and must include enough consumed catalog/configuration evidence to render and explain without current tables or recalculation.

The historical record is the captured input/output/explanation, not a promise that old executable code will always be rerun. Compatibility readers may deserialize older schemas, but must never silently reinterpret them using current rules. Data migrations are additive and preserve original serialized evidence.

Pricing Configuration Versions and Pricing Versions solve different problems. Configuration Versions preserve reusable rule/data publication; Pricing Versions preserve one Project result. Both are immutable after use. Retirement affects future selection only.

## Review and Approval Strategy

Quality Review evaluates a frozen Version; it is not a second calculation engine and cannot edit the candidate. The request command binds an already saved, Draft-current Version. The reviewer sees immutable inputs, output, explanation, configuration/methodology evidence, creator, and prior findings.

Approval and rejection/request-changes are domain commands. Approval atomically appends decision evidence, selects the candidate, and moves to `QUOTED`. Rejection requires actionable findings, appends evidence, clears the candidate, and returns to Draft. The candidate Version remains immutable in both cases.

No Pricing Executive Authorization path is recommended for Version 1. If the business cannot satisfy two-person independence, that is a Product Owner operating-policy issue requiring an ADR amendment; implementation must not insert a bypass.

## Proposal Integration

The current Proposal boundary correctly freezes Pricing data and prohibits recalculation, but exact source authority is incomplete. The future flow must be:

```text
Proposal application command
  -> PricingEligibilityReader(companyId, clientId, pricingVersionId)
  -> Pricing validates QUOTED + current approved + compatibility
  -> immutable eligible Version snapshot
  -> Proposal freezes Version identity and snapshot
```

HTTP must accept an eligible Pricing Version identifier, not a caller-authored approval assertion or arbitrary full snapshot. Proposal Domain may validate frozen snapshot compatibility as defense in depth, but Pricing remains the eligibility authority. Company-safe not-found semantics must prevent cross-Company disclosure.

Existing Proposal records must remain readable. An additive snapshot schema version should introduce `pricingVersionId`; records created under schema V1 remain distinguishable as legacy Project-level provenance rather than being assigned fabricated Version identities.

## Services & Pricing Administration Integration

Administration is a supporting platform capability adjacent to, not inside, Pricing Project workflow. Authorized same-Company administrators prepare and publish catalog/configuration changes. Publication creates immutable effective-dated Configuration Versions; Pricing Projects select one according to an approved policy and retain it.

Data potentially varies first by Company. Future Cotarion operating-group applicability must be explicit within the Company boundary and versioned; it must not enable cross-Company administration. Platform-wide domain invariants do not become Company overrides. A future administration ADR must decide draft/publish authority, effective dating, conflict handling, operating-group precedence, deactivation effects, and migration from the current baseline.

## Future Capability Dependencies

### Retainers and AOP

Retainers depend on stable model-specific Version schemas and versioned definitions for levels, terms, rates, AOP inputs, and calculation explanations. They must not create a second approval/version system.

### Engagements

Engagement creation depends downstream on accepted Proposal/Agreement evidence. Pricing lineage is retained for audit, but Engagement neither reads mutable Draft state nor owns Pricing approval.

### Operating-group expansion

The shared Pricing Project abstraction may support new groups only after each group’s methodology and configuration policies are approved. Company scope remains primary; operating group is an additional applicability dimension, never a substitute for isolation.

## Audit, Idempotency, and Concurrency Strategy

Significant Pricing state and evidence must be committed with durable events/outbox records in the same transaction. Events carry stable event ID, Company, Project, Version where applicable, actor, occurred time, aggregate revision, and safe typed metadata. Internal calculations or confidential AOP detail must not leak into public timelines by default.

Idempotency is mandatory at the application command boundary. The stored result includes target aggregate, command kind, request fingerprint, resulting revision/Version, and replayable response. Optimistic concurrency is mandatory because a correct permission decision or Draft-current check can become stale between read and commit.

## Migration Strategy

1. Establish and approve the contract before schema design.
2. Add Version, review/evidence, idempotency/event, and aggregate-revision persistence through forward-only migrations.
3. Add current candidate/approved Version bindings with same-Company integrity and transactional constraints.
4. Leave existing Draft projects as Drafts. Their mutable stored snapshots may seed working Draft state but do not become immutable Versions automatically.
5. Inventory any existing `IN_REVIEW`, `QUOTED`, or `ARCHIVED` rows. Do not synthesize review, approval, creator, or Version evidence. Fail closed and require a Product Owner-approved reconciliation procedure.
6. Preserve existing Configuration Version identities and baseline catalog/configuration data.
7. Introduce Proposal Pricing snapshot schema V2 additively with `pricingVersionId`; keep legacy V1 readable and clearly classified.
8. Do not retroactively recalculate, renumber, or mutate existing Proposal snapshots.
9. Deploy integrity constraints only after dry-run inventory proves existing data is compatible or governed exceptions are resolved.

## Repository Changes Required in Later Authorized Phases

This is a prospective inventory, not authorization to modify these areas now.

- Complete/amend and approve Pricing ADRs and roadmap.
- Add typed Pricing aggregate lifecycle, Version, review, event, error, and value-object contracts.
- Add additive Prisma models/relations/constraints/triggers or equivalent protections for immutable Versions and evidence.
- Replace unrestricted persistence status updates with aggregate-controlled transactional saves.
- Add capability definitions and Company-scoped authorization adapters consistent with ADR-019/020.
- Add application commands, query/read models, idempotency, concurrency, and outbox integration.
- Add Pricing command/read HTTP boundary or another explicitly approved server boundary; presentation must not call repositories.
- Extend the Pricing Workspace with server-permitted actions, Version history, review evidence, and accessible command dialogs.
- Add Pricing-owned Proposal eligibility resolution and exact-Version Proposal provenance.
- Add domain, application, persistence, HTTP, presentation, concurrency, isolation, migration, and end-to-end tests.
- Reconcile documentation, tracker, acceptance, release notes, operating guide, and release checkpoint.

## ADR Recommendations

### ADR-003 — Value-Based Project Pricing Philosophy

**Recommendation: leave `Proposed` now; materially amend, then seek Product Owner Approved status.** The intended invariant is supported by the FDS and implementation, but the ADR contains no decision content. It must define value-based Project pricing, prohibited time-based derivation, scope across models, and relationship to configurable inputs. It should not be marked Accepted based on code.

### ADR-004 — Advisory Consulting as the Only Hourly Billing Model

**Recommendation: leave `Proposed` now; materially amend, then seek Product Owner Approved status.** The title matches implemented behavior and the FDS, but scope, invariants, billing increments/rates, future-group implications, and governance are undocumented.

### ADR-008 — Domain Isolation for Pricing and Business Rules

**Recommendation: leave `Proposed` now; materially amend, then seek Product Owner Approved status.** Its title aligns with layered code and charter rules, but it has no enforceable dependency, calculation ownership, configuration, historical reader, or integration decision content.

### ADR-016 — Shared Pricing Project With Explicit Pricing Models

Retain its historical `Accepted` status and decision. Add a related-decision note only if needed after lifecycle approval; do not rewrite its history. Its shared aggregate/model decision remains compatible with this reconciliation.

### ADR-021 — Pricing Approval & QUOTED Lifecycle

ADR-021 is the correct lifecycle ADR and should be **amended**, not replaced by a brand-new ADR. Amend candidate creation from implicit Review-request creation to explicit Save Version plus Draft-currency validation at Review request; clarify Version creator, Version review status as separate append-only evidence, idempotency, optimistic concurrency, and Proposal `pricingVersionId`. Then obtain Product Architect and Product Owner approval using ADR-000 statuses.

A new lifecycle ADR would duplicate ADR-021 and fragment authority. Create a new ADR only if reviewers choose to supersede ADR-021 wholesale rather than amend it; that is not recommended.

## Remaining Product Owner Decisions

The following decisions block Phase 1 because they affect invariants, evidence, or workflow:

1. Confirm explicit Save Version versus automatic Version creation at Review request. Recommendation: explicit Save Version.
2. Confirm whether any authorized Pricing user may Save Version and request review, and whether Version creator is always the Save Version actor.
3. Confirm strict two-person independence even for a single-user Company; recommendation: no bypass in Version 1.
4. Confirm rejection terminology (`Reject` versus `Request Changes`) and required findings length/visibility.
5. Confirm Begin Revision authority and whether a `QUOTED` project returning to Draft intentionally pauses eligibility for every new Proposal.
6. Confirm Archive authority and terminal/no-restore policy.
7. Confirm whether multiple unreviewed saved Versions are desirable history or whether only the latest may be submitted. Recommendation: retain all; only Draft-current latest may be submitted.
8. Confirm whether Save Version requires a revision reason, optional note, or no narrative. Recommendation: optional on first Version, required after rejection or prior approval.
9. Approve Version numbering/display convention and whether `EST-###### vN` is the business-facing reference.
10. Confirm retention and visibility of rejected findings and whether any fields are internal/confidential.
11. Approve legacy data handling for any persisted non-Draft statuses; recommendation: never fabricate approval evidence.
12. Approve the Proposal transition from client-supplied snapshot assertions to server-resolved `pricingVersionId`, including treatment of legacy Proposal snapshot V1 records.
13. Review POR-003 Retainer Pricing and decide its governance status based on operational validation.
14. Complete unresolved catalog, complexity, discount, rounding, engine-version, and internal-review decisions still recorded in the Phase 1 workbook package, or explicitly identify the later authoritative approvals that resolved each one.

## Implementation Phases

### Milestone 1 — Pricing Governance Approval

**Purpose:** turn this reconciliation into authoritative policy.

**Dependencies:** Product Architect review; Product Owner decisions above.

**Out of scope:** code, schema, APIs, UI, migrations.

**Acceptance criteria:** ADR-003/004/008 contain complete decisions and are Product Owner Approved; ADR-021 is amended and Product Owner Approved; contradiction register is dispositioned; implementation roadmap and clean baseline are approved.

### Milestone 2 — Pricing Version Domain Contract

**Purpose:** implement the pure aggregate, Version, lifecycle, review, event, idempotency semantics, and typed snapshots.

**Dependencies:** Milestone 1.

**Out of scope:** Prisma, HTTP, React, Proposal integration.

**Acceptance criteria:** all legal/illegal transitions, Draft currency, immutable Version history, monotonic numbering intent, reviewer independence, eligibility, stale commands, and event evidence are covered by pure tests; no infrastructure imports enter the domain.

### Milestone 3 — Version and Governance Persistence

**Purpose:** persist aggregate revision, Versions, candidate/current-approved bindings, reviews, idempotency, and events atomically.

**Dependencies:** Milestone 2; approved legacy-data inventory.

**Out of scope:** UI and Proposal changes.

**Acceptance criteria:** forward-only migration; same-Company constraints; immutable/non-deletable Version content; transactional Version allocation; optimistic concurrency; idempotent replay; atomic event/evidence; migration and rollback plan; legacy rows fail closed.

### Milestone 4 — Pricing Application and Read Boundaries

**Purpose:** expose authorized commands and authoritative workspace/eligibility read models.

**Dependencies:** Milestone 3; ADR-019/020 capability mapping.

**Out of scope:** React and Proposal persistence.

**Acceptance criteria:** Company-scoped Save/Review/Decide/Revise/Archive services; permitted actions derived server-side; stable errors; no direct status repository command bypass; Pricing eligibility reader returns only the current approved Version; focused application/integration tests pass.

### Milestone 5 — Pricing Workspace Completion

**Purpose:** add Version history, immutable review, governed actions, evidence, and lifecycle usability to the existing Workspace.

**Dependencies:** Milestone 4.

**Out of scope:** administration editors, PDFs, formula builders, Proposal workflow redesign.

**Acceptance criteria:** UI renders only server-permitted actions; successful commands replace state from server read models; accessible forms/dialogs/errors; immutable Version detail does not recalculate; reviewer independence/status/currency are not inferred in React; responsive and end-to-end validation passes.

### Milestone 6 — Proposal Exact-Version Integration

**Purpose:** make Proposal creation consume authoritative eligible Pricing Version evidence.

**Dependencies:** Milestone 4 and Proposal contract review.

**Out of scope:** Proposal lifecycle redesign or recalculation.

**Acceptance criteria:** Proposal request selects a Version identity; server resolves eligibility through Pricing; snapshot V2 stores `pricingVersionId`; cross-Company and stale/noncurrent sources fail closed; existing V1 records remain readable; no client-authored approval assertion is trusted; existing Proposal snapshots never change.

### Milestone 7 — Conformance, Product Acceptance, and Release

**Purpose:** complete ADR-000 Phases 7–9 for the full Pricing capability.

**Dependencies:** Milestones 1–6.

**Out of scope:** Services & Pricing Administration implementation and future bounded contexts.

**Acceptance criteria:** complete regression/validation matrix; architecture-conformance report; Product Owner operational scenarios and explicit acceptance; POR-003 disposition; operating guide, release notes, migration record, known limitations, tracker update, clean reviewed checkpoint, and approved release record/tag.

## Architecture Risks

- Approving ADR-021 without resolving Save Version semantics would make tests and UI encode contradictory policy.
- Treating the mutable Project snapshot as a Version would create false historical evidence.
- Allowing Proposal HTTP callers to assert `QUOTED`/approval data would bypass Pricing authority.
- Adding a Version ID without a server eligibility check would provide identity but not authority.
- Mutable JSON or inadequate schema/version readers could undermine historical reproducibility.
- Separate writes for Version, status, decision, and events could create commercially inconsistent state.
- Missing optimistic concurrency could approve a stale candidate or lose Draft edits.
- A generic configuration/rules engine could make protected invariants editable and create unsafe scope.
- Strict independence may block a one-user Company; solving this through a hidden bypass would violate governance.
- The dirty working tree makes scope attribution and migration review risky until a checkpoint is established.

## Definition of Ready for Phase 1

Phase 1 is ready only when:

- Product Architect accepts this reconciliation or records amendments.
- Product Owner decides every blocking item above.
- ADR-003, ADR-004, ADR-008, and amended ADR-021 reach the required ADR-000 approval status.
- The explicit Version contract, lifecycle, reviewer independence, Proposal eligibility, legacy data policy, audit, idempotency, and concurrency rules are testable and unambiguous.
- Proposal snapshot V2/integration migration direction is approved.
- The implementation milestones and acceptance criteria are approved.
- Current uncommitted work is reviewed and placed at a clean, traceable checkpoint without discarding history.
- No implementation task must invent business policy.

## Acceptance Gates

Each implementation milestone requires its own review package, validations, files changed, known omissions, and explicit Product Architect approval before dependent work. Material deviations require implementation correction or an amended/superseding ADR. The full capability cannot be marked complete or Released until architecture conformance, Product Owner operational acceptance, release documentation, migrations/integrations, regression boundaries, and tracker updates satisfy ADR-000.

## Recommended Phase 1

The next phase should be named **Pricing Completion — Phase 1: Pricing Version & Governance Domain Contract**.

It should implement only the pure Pricing aggregate contract and tests after the governance gate closes: immutable Version capture semantics, explicit Save Version, Draft currency, lifecycle transitions, review evidence, reviewer independence, current-approved selection, Proposal eligibility state, audit event definitions, idempotency command semantics, and optimistic-revision behavior. It must not add Prisma models, migrations, HTTP routes, React workflows, or Proposal changes. Persistence should begin only after Product Architect review of that domain contract.

## Phase 0 Validation and Evidence Index

Reviewed evidence includes ADR-000, ADR-003, ADR-004, ADR-008, ADR-016, ADR-021 and its Sprint 2.6 review package; both Sprint 4 Pricing Projects planning documents; Pricing Phase 1/3/4 review packages; the Pricing Workspace milestone report; Functional Design Specification; User Experience Specification; Development Charter; Product Owner Refinement Backlog; capability tracker; legacy Implementation Plan; current Pricing domain/application/presentation/routes; current Prisma schema and migrations; Pricing tests; Proposal Pricing contracts/application/HTTP/persistence/workspace evidence; git history; and current working-tree status.

No application code, schema, migration, test, HTTP, React, application-service, domain-service, or configuration file was modified by Phase 0. No build or test command is required or authorized for this documentation-only sprint.
