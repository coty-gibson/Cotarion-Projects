# Cotarion Platform Next-Capability Planning Recommendation

## Document status

- Date: 2026-07-21
- Type: roadmap reconciliation and implementation-readiness recommendation
- Governing methodology: ADR-000
- Recommendation: complete Pricing Projects before Proposal delivery or Services & Pricing Administration
- Authority: planning only; this document does not authorize implementation

## 1. Executive recommendation

The correct next implementation capability is **Pricing Projects Completion & Release Readiness**. The repository contains a capable five-model Pricing engine and editable Draft workspace, but it does not contain the immutable `PricingVersion`, explicit Save Version workflow, governed review/approval path to `QUOTED`, or full release evidence required by the approved Pricing Projects plan and ADR-021. Tests and the Pricing Workspace completion report prove a major implementation milestone, not completion or release of the approved capability.

Services & Pricing Administration is not next for implementation. It is the next new administration capability to prepare through discovery and Product Governance. Proposal Representations & Delivery remains the next approved Proposal slice after its prerequisites are operational, but it depends on a reliably submitted Proposal sourced from eligible immutable Pricing evidence.

A reviewed clean repository checkpoint is required before implementation: substantial approved Pricing and Proposal work remains uncommitted.

## 2. Current platform-state reconciliation

| Capability | Actual evidence | Methodology status |
| --- | --- | --- |
| Foundation | Version 0.1 release record | Released |
| Authentication and Users | Version 0.2 release record | Released |
| Clients and Contacts | Version 0.3 release record | Released |
| Pricing calculations/workspace | Five calculation models, Draft persistence, Company isolation, static versioned configuration reference, UI, tests | Implemented milestone |
| Pricing Projects capability | No immutable Pricing Version model/workflow; no operational review/QUOTED path; no explicit acceptance/release record | In Development |
| Proposal Management | Domain through interactive internal workspace implemented; Product Architect approved Sprint 3.5B scope | In Development; ADR-018 Sprints 4–6 remain |
| Services & Pricing Administration | Static catalog/configuration foundation and requirements only | Discovery |

ADR-000 says code and passing tests do not establish completion or release. Pricing’s changelog remains `Unreleased`; Proposal review packages and working tree are uncommitted; neither capability has complete Product Owner operational acceptance and release evidence.

## 3. Correct next capability and rationale

**Pricing Projects Completion & Release Readiness** is next because it closes the earliest unmet approved dependency:

1. The Pricing plan requires explicit immutable versions, review, `QUOTED` eligibility, internal review, validation, acceptance, and release.
2. ADR-021 requires an approved immutable source before Proposal creation.
3. Prisma and source searches show no `PricingVersion` model or Save Version use case.
4. Current Pricing editing is restricted to `DRAFT`; no application/UI transition completes approval.
5. Services administration must not be built on an incompletely governed publication/version model.
6. Proposal delivery should not leapfrog the authoritative Pricing-to-Proposal source gate.

## 4. Capability classification and bounded-context relationship

Pricing Projects Completion is work inside the existing **Pricing bounded context**.

Services & Pricing Administration should later be a **supporting business-configuration subdomain for Pricing plus a Company administration capability**. It is not a generic calculation bounded context. Pricing owns interpretation and validation; administration owns controlled configuration drafting, versioning, activation, retirement, and presentation metadata.

## 5. Business objective

Complete the approved Pricing Project workflow so an authenticated Company user can preserve an immutable Pricing Version, complete governed approval to `QUOTED`, and supply an eligible reproducible snapshot to Proposal Management.

The later Services & Pricing objective is controlled configuration without code deployment, while preserving Pricing-domain invariants and history.

## 6. Business value

- Closes the current gap between calculated Drafts and Proposal-eligible approved Pricing.
- Makes the Pricing-to-Proposal dependency operational rather than fixture/API dependent.
- Preserves exact historical calculations and configuration.
- Establishes the lifecycle/versioning semantics future administration must respect.
- Prevents editable administration from becoming the accidental authority for past Pricing or Proposals.

## 7. Users and authority

Pricing approval must follow ADR-021: Company-scoped effective capabilities and independent review. UI visibility is not authority.

Services administration authority remains unresolved. The Product Owner must define capabilities for catalog/configuration viewing, drafting, publishing, activation, and retirement; whether independent review or Business Justification applies; and which actions require permanent evidence. The legacy word “Admin” is insufficient under ADR-019.

## 8. Included scope

### Immediate Pricing completion

- immutable Pricing Version persistence and exact snapshots;
- monotonic project-local version numbers;
- explicit Save Version application/API/UI workflow;
- governed review request, change request, approval, and `QUOTED` transition under ADR-021;
- reviewer-independence and Company isolation;
- immutable-version detail/history and Internal Review;
- Proposal-ready approved snapshot retrieval;
- migration, integration, end-to-end, conformance, acceptance, and release evidence.

### Services & Pricing planning only

- catalog/configuration ownership and field classification;
- authority, audit, lifecycle, effective dating, operating-group strategy;
- migration from static TypeScript baselines;
- future API/workspace architecture.

## 9. Explicit exclusions

- Services & Pricing implementation during the Pricing completion milestone;
- unrestricted formula builders, scripts, executable rules, or cross-Company administration;
- historical Pricing mutation or retroactive Proposal recalculation;
- changing approved calculation formulas to simplify administration;
- Proposal representation/delivery, Agreements, Engagements, billing, analytics, or new operating groups;
- rewriting historical roadmap documents or applied migrations.

## 10. Domain invariants versus configurable data

### A. Protected domain invariants

- Project Pricing is value-based; hourly billing is Advisory-only.
- Pricing models remain explicit typed calculation boundaries.
- exact decimal arithmetic, rounding, calculation order, and validation remain Pricing-owned;
- complexity cannot be directly overridden;
- standard client discounts do not stack and term discounts remain distinct;
- only approved immutable Pricing evidence is Proposal-eligible;
- Pricing Versions and Proposal Pricing snapshots are immutable;
- Proposal never recalculates Pricing;
- Company/Client/configuration consistency is mandatory.

### B. Candidate versioned business configuration

- services, stable codes, status, names, descriptions, base prices, category, order, and applicability;
- complexity labels/options/increments inside approved schema bounds;
- discount definitions/rates/evidence/eligibility;
- Retainer levels, fees, descriptions, and terms;
- Advisory rate;
- effective dates, operating-group applicability, activation, and retirement.

Candidate does not mean approved for editing. A dedicated ADR must name the exact editable set.

### C. Presentation configuration

- ordering, grouping, display labels, Client-facing descriptions, and help text that does not change calculation meaning.

### D. Deferred concepts

- formula authoring, arbitrary scripting, global multi-company administration, manual historical changes, and retroactive calculations.

## 11. Versioning and historical-accuracy strategy

Pricing completion must introduce the approved immutable Pricing Version record, not treat mutable project snapshots as a substitute. Each Version binds project, Company, Client, creator, time, configuration ID/version, methodology/engine/schema versions, currency, input/output, service snapshots, validation evidence, and approval evidence.

Published Pricing Configuration versions remain immutable and atomically active/retired. Existing Pricing Projects retain their assigned version; adoption of newer configuration must never happen silently. Historical Pricing and Proposal views use stored snapshots without current-data recalculation.

## 12. Company and operating-group isolation

Pricing Projects, Versions, catalog, configuration, authority, and audit are Company-scoped. Every repository and API requires authenticated Company scope.

Current catalog/configuration tables lack operating-group identity while Version 1 is Consulting-only. Product Owner and Product Architect must decide before Services administration whether configuration remains Company-wide or becomes explicitly operating-group-owned. Names and UI grouping cannot imply ownership.

## 13. Integration with Pricing Projects

The immediate milestone completes the aggregate’s approved immutable Version and approval boundaries. New Projects resolve active configuration server-side; saved Versions freeze all material context. Current Drafts cannot be silently reinterpreted after configuration changes.

Future administration supplies only schema-valid, approved configuration. It does not calculate or accept authoritative totals from clients.

## 14. Integration with Proposal Management

Proposal creation must consume a `QUOTED`, immutable, Company/Client-compatible Pricing snapshot under ADR-021. It must not accept a mutable Draft or reconstruct values from current catalog/configuration. Existing Proposal snapshots remain unchanged by future administration.

After Pricing completion, Proposal Management may continue ADR-018 with Representations & Delivery, Lifecycle/Timeline, and Release Readiness.

## 15. Future Retainers/AOP dependencies

Retainer, Profit-Share, Hybrid, and Advisory calculators already exist and must be preserved. Retainer levels/terms and Advisory rates may later be versioned configuration.

AOP monthly values are Pricing Project inputs, not administration configuration. Profit-share/Hybrid formulas, half-percentage rounding, caps, and validation remain domain-owned. POR-003 remains Recorded and requires Product Owner disposition rather than silent closure.

## 16. Future Engagement dependencies

Engagements must consume accepted Proposal/Agreement evidence, never mutable current service prices. Stable service and operating-group identities may support future references, but this milestone does not invent Engagement behavior.

## 17. Application-layer responsibilities

Pricing completion application services must authenticate active actors, enforce Company scope/capabilities/reviewer independence, create immutable Versions transactionally, coordinate review/approval, expose safe read models, and return exact Proposal-ready snapshots.

Future administration services will create validated configuration Versions, atomically activate/retire them, preserve prior evidence, enforce capabilities, and append audit records. Neither layer embeds formulas.

## 18. HTTP/API boundary

Pricing completion needs typed authenticated endpoints for Save Version, review commands, approval/`QUOTED`, Version history/detail, and approved snapshot retrieval. HTTP validates transport shapes and maps errors; application/domain layers decide authority and lifecycle. Idempotency and optimistic concurrency are required.

Future administration endpoints require a separately approved lifecycle. They must reject supplied Company overrides, calculated results, scripts, and mutation of immutable versions.

## 19. Persistence implications

Pricing requires an additive `PricingVersion` design plus immutable snapshot/approval relationships and append-only audit/outbox evidence as approved. Existing project/configuration IDs must remain intact; applied migrations are never rewritten.

The later administration capability may need catalog revisions/effective dating, configuration authorship/approval, concurrency, categories, operating-group identity, and audit evidence. Those are not authorized by this plan.

## 20. Workspace/UI information architecture

Immediate Pricing UI additions:

- Version history and read-only Version detail;
- Save Version action separate from Save Draft;
- Quality Review request/change/approve evidence and server-permitted actions;
- clear Draft versus immutable/approved indicators;
- print-ready Internal Review from Draft or Version as approved;
- Proposal eligibility evidence after `QUOTED`.

Future **Services & Pricing** workspace may contain Overview, Services, Pricing Configuration, Complexity/Discounts, Retainers/Advisory, and Audit—but only after governance approval. It must not expose JSON or formula builders.

## 21. Audit and evidence requirements

Pricing Version creation and approval must retain actor, time, Company, project/version, review method, reviewer, immutable snapshot identity, and correlation/request identity. Reviewer independence is permanent evidence.

Future significant configuration actions likely include publication, activation, retirement, price/rate changes, and eligibility changes. Product Owner policy must decide reason/Business Justification requirements. Evidence is append-only and Company-scoped.

## 22. Migration strategy for existing static data

1. Inventory all Pricing Projects and referenced configuration versions.
2. Confirm no claimed immutable Pricing Versions exist under another representation.
3. Add forward-only Version/evidence structures.
4. Backfill nothing as “approved” without authoritative approval evidence.
5. Preserve current Draft snapshots and configuration IDs.
6. Rehearse migration and validate counts/references.
7. For later administration, reconcile the 29 seeded services and configuration v2 by stable code/snapshot and fail closed on drift.
8. Never overwrite Company-owned configuration during bootstrap.

## 23. Testing strategy

- Pricing-domain parity/regression for all five models;
- Version immutability, monotonic numbering, snapshot completeness, and serialization;
- review/approval lifecycle and reviewer-independence tests;
- Company isolation, capability, inactive-user, idempotency, concurrency, and transaction tests;
- Proposal source eligibility and cross-Company/Client rejection;
- UI Draft/Version distinction and server-permitted actions;
- end-to-end Draft → Version → Review → `QUOTED` → Proposal source workflow;
- migration/backfill and historical rendering tests;
- later administration tests for schema validation, activation, drift, history, and no retroactive change.

## 24. Product Owner decisions required

### Pricing completion

1. Confirm the approved Pricing Version snapshot contents and naming.
2. Confirm Save Version timing and whether review automatically creates a Version.
3. Confirm `IN_REVIEW` edit/freeze behavior and changes-requested evidence.
4. Confirm exact review/approval roles/capabilities under ADR-021.
5. Confirm whether existing Draft records require migration or remain Draft-only.
6. Accept or amend outstanding Pricing plan decisions and reconcile ADR-003/004/008, which still say `Proposed`, with implemented policy and ADR-016/021.
7. Approve operational acceptance and release criteria.

### Services & Pricing Administration

8. Decide authority for view/draft/publish/activate/retire and audit requirements.
9. Decide Company-wide versus operating-group ownership.
10. Define exact editable fields versus protected invariants.
11. Define service revision/effective-date/retirement/reactivation policy.
12. Define configuration draft/publish/activate, scheduling, correction, and one-active-version policy.
13. Decide how open Pricing Drafts may explicitly adopt new configuration.
14. Approve discount eligibility/evidence and Pro Bono authorization.
15. Define Retainer/Advisory administrable data and resolve POR-003 disposition.
16. Define new-Company bootstrap policy.

## 25. Architecture risks

- treating the current mutable Pricing snapshot as an immutable approved Version;
- Proposal consumption without durable Pricing approval evidence;
- code/report language overstating capability completion;
- turning administration into an untyped rule engine;
- silent configuration adoption by open Drafts;
- historical mutation through catalog edits;
- Company-wide schema blocking future operating groups;
- role checks replacing capabilities;
- beginning new work in a mixed uncommitted tree;
- conflicting `Proposed` ADR statuses and claimed approved implementation policy.

## 26. Recommended milestone decomposition

### Pricing Projects Completion

1. **Pricing Completion — Contract and Governance Reconciliation**
2. **Pricing Completion — Immutable Version Domain and Persistence**
3. **Pricing Completion — Review, Approval, and Proposal Eligibility**
4. **Pricing Completion — Version/Internal Review Workspace**
5. **Pricing Completion — Conformance, Product Acceptance, and Release**

### Then Proposal continuation

1. Proposal Representations & Delivery
2. Proposal Lifecycle & Client Timeline Completion
3. Proposal Hardening, Product Acceptance, and Release

### Services & Pricing Administration

1. Discovery and Configuration Governance
2. Dedicated Architecture/ADR
3. Configuration Contracts and Read Models
4. Persistence/Migration Foundation
5. Application Services and HTTP API
6. Services & Pricing Workspace
7. Conformance, Product Acceptance, and Release

## 27. Acceptance gates

Pricing gates: Product Owner policy reconciliation; approved architecture; immutable Version and approval workflow; Proposal eligibility integration; migration/integration/E2E validation; architecture conformance; operational acceptance; release artifacts; clean tracker update.

Services administration gates: approved discovery, resolved section 24 policies, dedicated Product Owner-approved ADR/roadmap, drift-safe migration, authority/isolation tests, historical parity, operational acceptance, and release.

## 28. Definition of Ready

The first Pricing completion implementation is Ready only after section 24 Pricing decisions are resolved, the contradictory ADR statuses are reconciled, the Version/approval contract is approved, and the current working tree has a reviewed clean checkpoint.

Services & Pricing engineering is not Ready until its dedicated ADR, governance, migration, and authority model are approved.

## 29. Recommended next Codex implementation phase

The exact next implementation phase should be:

**Pricing Completion — Immutable Version Domain and Persistence**

It should begin only after **Pricing Completion — Contract and Governance Reconciliation** is approved. The implementation phase should add the approved Pricing Version contract, pure invariant tests, additive persistence/migration, repository behavior, immutable snapshot evidence, and integration tests. It should not add administration UI, Proposal delivery, or change formulas.

The immediate next Codex activity before coding is documentation/governance: produce the Pricing completion decision package and reconcile ADR-003, ADR-004, ADR-008, the Pricing plan, ADR-021, and the current implementation.

## 30. Roadmap renumbering recommendation

Preserve historical sprint documents. Retire ambiguous platform-wide sprint numbers because “Sprint 4,” “Sprint 5,” and “Sprint 6” refer to conflicting scopes across legacy and capability-local plans. Use capability-qualified milestone names.

Do not call the next effort Sprint 6. Call it **Pricing Completion — Contract and Governance Reconciliation**, followed by **Pricing Completion — Immutable Version Domain and Persistence**.

## Decision-question answers

1. **Correct next capability:** Pricing Projects Completion & Release Readiness.
2. **Services & Pricing truly next?** No; it is next for new-capability discovery only.
3. **Classification:** supporting Pricing configuration subdomain plus Company administration capability.
4. **Depends on:** Foundation, Company identity, authority, Pricing Domain/Projects, catalog/configuration persistence.
5. **Dependents:** Proposal eligibility, Proposal delivery, future Retainers/AOP changes, Engagements, operating-group expansion.
6. **Static data replaced later:** TypeScript/seed service categories/services, complexity/discount definitions, Retainer levels/terms, Advisory rate, activation.
7. **Domain-owned rules:** model boundaries, value-based/Advisory-only-hourly policy, formulas, validation, exact arithmetic, immutable history, Proposal no-recalculation.
8. **Company-scoped:** projects, Versions, catalog, configuration, authority, audit, APIs.
9. **Potential operating-group variance:** services, presentation, rates, Retainer definitions, applicability, future methodologies.
10. **Immutable/versioned:** Pricing Versions, published configuration, used service values, approval/effective evidence, Proposal snapshots, audit.
11. **Unresolved policies:** section 24.
12. **Required gates:** clean checkpoint, Pricing contract/governance reconciliation and completion/release, Proposal roadmap continuation, Services ADR before its implementation.
13. **Numbering:** preserve history; use capability names.
14. **Next milestone:** Pricing Completion — Contract and Governance Reconciliation.

## Repository-state gate

The working tree contains approved but uncommitted Proposal domain, persistence, application, HTTP, workspace, migrations, and review packages plus Pricing-related modifications. Before implementation, establish an intentionally reviewed clean checkpoint using the normal commit/release process. This review does not stage, commit, reset, or alter those changes.
