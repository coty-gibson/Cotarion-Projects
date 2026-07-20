# Sprint 4 Implementation Plan: Pricing Projects

## Status and Authority

Planning artifact for Product Owner review. This document does not authorize implementation.

The authoritative functional specification is:

- `docs/Sprint_4_Pricing_Projects_Planning_Proposal.md`

If this implementation plan conflicts with the approved proposal, the approved proposal controls until the Product Owner explicitly approves a revision.

## Delivery Strategy

Sprint 4 should proceed through small, testable vertical increments while keeping calculation correctness ahead of interface breadth.

The recommended sequence is:

1. Prove the workbook methodology.
2. Define pure domain contracts.
3. Prove calculations with fixtures.
4. Add durable persistence and company isolation.
5. Add application workflows.
6. Add the user interface.
7. Add immutable versions.
8. Add print-ready Internal Review.
9. Complete parity, end-to-end validation, and release readiness.

No phase should hide unresolved pricing ambiguity inside implementation code. Product Owner questions discovered during workbook analysis must be resolved or explicitly documented before the affected formula is implemented.

## Phase 1 — Workbook Inventory & Formula Analysis

### Objective

Establish an approved, implementation-ready description of the current Excel Pricing Tool before calculation code or pricing schema is written.

### Deliverables

- Authoritative workbook file and checksum
- Workbook Inventory covering visible and hidden sheets
- Named-range inventory
- Input-cell inventory
- Formula-cell inventory
- Lookup-table inventory
- Cross-sheet Formula Dependency Map
- Service and price inventory
- Complexity-factor inventory
- Discount inventory
- Rounding and precision inventory
- Manual-step and default-assumption inventory
- Workbook error-behavior inventory
- List of stale, unused, duplicated, or contradictory logic
- Proposed initial Service Catalog seed data
- Proposed initial Pricing Configuration
- Pricing Validation Matrix with representative scenarios
- Open-question register
- Product Owner decision log
- Documented intentional differences from workbook behavior

### Dependencies

- Approved Sprint 4 Pricing Projects Planning Proposal
- Product Owner identification of the authoritative workbook
- Access to `reference/Cotarion_Pricing_Tool.xlsx`
- Product Owner or subject-matter expert availability

### Risks

- Hidden formulas or sheets may affect visible totals.
- Workbook formulas may encode accidental behavior.
- Manual steps may not be evident from formulas.
- Rounding may occur at intermediate stages.
- Service names or prices may no longer reflect approved offerings.
- Project pricing may be entangled with deferred Retainer or AOP logic.
- Formula analysis tooling may calculate formulas differently from Excel.

### Acceptance Criteria

- Every project-pricing input has a documented business meaning.
- Every project-pricing output traces to documented formulas and dependencies.
- All initial services and prices have an explicit approval state.
- Complexity factors, defaults, and combination behavior are documented.
- Discount eligibility, stacking, ordering, and limits are documented.
- Money, quantity, multiplier, percentage, and display rounding are documented.
- Deferred Retainer, AOP, Profit Share, and Hybrid Payment logic is clearly separated.
- The Pricing Validation Matrix contains approved expected results.
- Every ambiguity has a Product Owner decision, an assigned follow-up, or an explicit implementation block.
- Product Owner approves the workbook-analysis package before Phase 2 calculation implementation.

### Estimated Implementation Order

1. Record authoritative workbook metadata.
2. Inventory sheets, hidden content, named ranges, and lookups.
3. Trace project-pricing inputs and formulas.
4. Inventory services and configured prices.
5. Inventory complexity and discount behavior.
6. Document rounding and error behavior.
7. Separate deferred calculation methods.
8. Build representative manual scenarios.
9. Review discrepancies with Product Owner.
10. Approve seed data, Pricing Configuration, and validation fixtures.

## Phase 2 — Domain Model

### Objective

Implement a pure, permanent, independently testable project-pricing domain that reproduces the approved methodology without React, Prisma, authentication, or database dependencies.

### Deliverables

- Money representation
- Quantity and precision rules
- Percentage and multiplier representations
- Currency contract fixed to explicit USD for Version 1
- Project service-line input model
- Complexity-selection model
- Discount-selection model
- Pricing Configuration contract and schema version
- Project-pricing input contract
- Project-pricing result contract
- Ordered calculation-step model
- Blocking validation issue and warning models
- Deterministic project-pricing calculation pipeline
- Domain validation functions
- Table-driven workbook parity fixtures
- Domain unit tests
- Domain invariants or property-style tests
- Engine-version convention

### Dependencies

- Approved Phase 1 Workbook Inventory
- Approved Service Catalog seed list
- Approved Pricing Configuration
- Approved rounding behavior
- Approved Pricing Validation Matrix

### Risks

- Binary floating-point arithmetic could create pricing discrepancies.
- Generic abstractions could obscure business logic.
- Workbook-shaped code could become difficult to maintain.
- Premature support for deferred pricing methods could enlarge scope.
- UI concerns could leak into domain results.
- Rounding at the wrong stage could pass simple tests while failing real scenarios.

### Acceptance Criteria

- Domain calculations require no database or framework.
- Money never uses binary floating-point persistence or arithmetic.
- Identical inputs and configuration versions produce identical results.
- Standard / No Added Complexity produces `1.00x` and `$0`.
- Service line totals and project subtotal match approved scenarios.
- Complexity behavior matches approved scenarios.
- Discount behavior matches approved scenarios.
- Invalid discount combinations are rejected.
- Final prices cannot become negative.
- Calculation results contain an ordered, explainable breakdown.
- Domain inputs are not mutated.
- Deferred Retainer, AOP, Profit Share, and Hybrid Payment calculations are absent.
- All approved Phase 1 fixtures pass.

### Estimated Implementation Order

1. Implement Money, currency, and precision primitives.
2. Implement service-line and subtotal calculations.
3. Implement validation-result types.
4. Implement Pricing Configuration validation.
5. Implement Standard complexity.
6. Implement approved complexity factors and combination.
7. Implement approved discounts and ordering.
8. Implement final rounding.
9. Produce the ordered calculation explanation.
10. Complete parity and invariant tests.

## Phase 3 — Database & Persistence

### Objective

Create durable, company-isolated persistence for Pricing Projects, predefined services, one versioned Pricing Configuration, editable draft selections, immutable reference numbers, and future duplication lineage.

### Deliverables

- `PricingProjectStatus` enum
- `PricingProject` model
- Transactional `PricingProjectSequence`
- Immutable `EST-######` allocation
- `ServiceCatalogItem` model
- `PricingProjectLine` model
- `PricingComplexitySelection` model
- `PricingDiscountSelection` model
- Versioned `PricingConfiguration` model
- Database representation for explicit USD
- Optional `sourcePricingProjectId` self-reference
- Required company, client, and owner relations
- Company-scoped indexes
- Database migration
- Approved initial Service Catalog seed mechanism
- Approved initial Pricing Configuration seed mechanism
- Repository interfaces
- Prisma repository implementation
- Database integration tests
- Concurrency test for estimate-number allocation
- Money-precision tests

`PricingVersion` persistence should be introduced in Phase 6 unless its foreign-key structure must be included in the initial migration to avoid unnecessary migration churn.

### Dependencies

- Stable Phase 2 domain contracts
- Approved database naming
- Approved Service Catalog seed data
- Approved Pricing Configuration representation
- Existing Client, Company, and ApplicationUser models

### Risks

- Editing an applied migration could damage development history.
- Estimate numbers could collide under concurrent creation.
- Catalog-price changes could alter drafts unexpectedly.
- Overusing JSON could make company-scoped queries difficult.
- Over-normalizing configuration could make Phase 6 administration expensive.
- Deleting or deactivating services could break historical records.
- Self-reference behavior could accidentally implement duplication before approval.

### Acceptance Criteria

- Every Pricing Project belongs to one existing Client.
- Pricing Project and Client Company must match.
- Every Pricing Project has one immutable unique estimate number.
- Concurrent creation produces unique monotonically increasing numbers.
- Required project name, status, owner, currency, and timestamps persist.
- Status supports `DRAFT`, `IN_REVIEW`, `QUOTED`, and `ARCHIVED`.
- Currency is explicitly stored as USD.
- Every line references a Service Catalog item.
- Free-text service-name and manual-price columns do not exist.
- One active Pricing Configuration is enforceable per Company.
- Configuration versions used by history cannot be destructively changed.
- Source Pricing Project lineage is representable without implementing duplication.
- All repository reads and writes require company scope.
- Migration and seed processes are repeatable and documented.
- Integration tests pass against the development PostgreSQL database.

### Estimated Implementation Order

1. Finalize schema names and relations.
2. Add estimate-number sequence design.
3. Add Pricing Project lifecycle data.
4. Add Service Catalog and project-line relations.
5. Add complexity and discount selections.
6. Add versioned Pricing Configuration.
7. Add future source-project lineage.
8. Create migration.
9. Create seed mechanism.
10. Implement repositories and integration tests.

## Phase 4 — Application Services

### Objective

Coordinate authentication, Client and Company isolation, persistence, configuration loading, domain calculation, lifecycle transitions, and server-authoritative saves.

### Deliverables

- Create Pricing Project for Client use case
- Get Pricing Project use case
- List Pricing Projects for Client use case
- Update Project Details use case
- Add, reorder, update, and remove Service selections
- Update Complexity selections
- Update Discount selections
- Calculate Pricing Project use case
- Save Pricing Project use case
- Submit for Internal Review use case
- Return to Draft use case
- Mark Quoted use case
- Archive use case
- Server-side input validation
- Same-Company Client validation
- Active Service Catalog validation
- Active Pricing Configuration selection
- Status-transition policy
- Optimistic concurrency or stale-save protection
- Application-service unit tests

### Dependencies

- Phase 2 project-pricing domain
- Phase 3 repositories and persistence
- Existing authentication and current `ApplicationUser`
- Existing Client company-isolation pattern

### Risks

- Presentation concerns may leak into application workflows.
- The browser may submit calculated totals or prices that must not be trusted.
- Stale edits could overwrite newer changes.
- Status behavior may become confused with future Proposal status.
- Current Company-wide access remains broad until Sprint 9.

### Acceptance Criteria

- Pricing Projects can only be created from same-Company Clients.
- Estimate numbers, Company, owner, currency, and dates are assigned server-side.
- Project name is required and validated.
- All service selections reference active same-Company catalog records.
- Submitted prices, totals, estimate numbers, dates, Company IDs, and configuration versions are not trusted.
- The server recalculates before saving.
- Normal draft saves do not create immutable Pricing Versions.
- Only valid Pricing Projects may enter `IN_REVIEW`.
- Only a Pricing Project with an immutable version may enter `QUOTED`.
- Archived records are protected according to the approved restoration decision.
- Cross-company access returns not found without disclosure.
- Application tests cover success, validation, stale-save, transition, and isolation cases.

### Estimated Implementation Order

1. Implement company-scoped query use cases.
2. Implement Pricing Project creation.
3. Implement project-detail save.
4. Implement service-selection workflows.
5. Implement complexity and discount workflows.
6. Integrate server-authoritative calculation.
7. Implement lifecycle transitions.
8. Add stale-save protection.
9. Complete application tests.

## Phase 5 — User Interface

### Objective

Deliver a professional, client-centered Pricing Project workflow that uses business terminology, predefined services, progressive input sections, live feedback, and server-authoritative persistence.

### Deliverables

- Client detail Pricing Projects section
- Create Pricing Project action
- Pricing Projects list for a Client
- New Pricing Project page
- Pricing Project detail/edit page
- Project Details section
- Service Catalog selection interface
- Service-line ordering and quantity controls
- Complexity selection interface
- Discount selection interface
- Sticky or prominent Pricing Summary
- Validation summary and field-level feedback
- Save Draft behavior
- Lifecycle status display
- Submit for Review action
- Archive action
- Loading, empty, success, and error states
- Responsive layout
- Keyboard and screen-reader accessibility
- Presentation tests where useful
- Initial end-to-end draft workflow

### Dependencies

- Phase 4 application services
- Approved user-facing terminology
- Approved service names and descriptions
- Approved status-transition behavior

### Risks

- Spreadsheet-like density could make the workflow difficult to understand.
- Live client-side calculations could diverge from server results.
- Service selection could accidentally allow free text.
- Too much autosave complexity could introduce race conditions.
- Pricing and Proposal concepts could be mixed prematurely.

### Acceptance Criteria

- User starts a Pricing Project from an existing Client.
- Estimate number and dates are displayed but not editable.
- Project name is clearly separate from estimate number and version.
- Users can add only predefined services.
- No free-text service or price override input exists.
- Complexity and discount choices expose only configured options.
- Pricing Summary clearly shows subtotal, adjustments, and final price.
- Normal save updates the draft without creating a version.
- Validation is accessible and preserves user input.
- UI uses Pricing Project, Estimate Number, Services, Internal Review, and Pricing Version terminology.
- UI contains no formulas or independent authoritative totals.
- Future modules remain scoped according to the approved roadmap.

### Estimated Implementation Order

1. Add Client detail entry point and list.
2. Add create form.
3. Add project details and status presentation.
4. Add Service Catalog selector and service lines.
5. Add Complexity inputs.
6. Add Discount inputs.
7. Add summary and validation.
8. Add save and lifecycle actions.
9. Complete accessibility and E2E draft tests.

## Phase 6 — Versioning

### Objective

Provide explicit, immutable Pricing Versions so future modules can reference approved historical pricing without copying or recalculating mutable draft data.

### Deliverables

- `PricingVersion` persistence model
- Monotonic version number within each Pricing Project
- Explicit `Save Version` application workflow
- Immutable input snapshot
- Immutable result snapshot
- Service name, description, quantity, and price snapshots
- Pricing Configuration ID and version
- Engine version
- Client and Company identity
- Created-by identity and timestamp
- Currency
- Version History interface
- Read-only Pricing Version detail
- Quoted-status dependency on a saved version
- Version repository and application tests
- Snapshot serialization compatibility tests
- End-to-end versioning workflow

### Dependencies

- Stable domain input and result formats
- Phase 3 persistence
- Phase 4 application services
- Phase 5 Pricing Project interface
- Approved version-number and status behavior

### Risks

- Mutable nested objects could undermine snapshot immutability.
- Future engine changes could make old snapshots unreadable.
- Saving every draft accidentally would create noisy history.
- Proposal Builder may be tempted to reference mutable project data.
- Snapshot payloads could omit context needed for historical explanation.

### Acceptance Criteria

- `Save Version` is an explicit user action.
- Saving a draft does not create a version.
- Invalid Pricing Projects cannot create a version.
- Each version number increases monotonically.
- Saved inputs and results cannot be edited through ordinary application behavior.
- Draft edits do not change prior versions.
- Historical service and configuration values remain available.
- Version detail renders without recalculating against current configuration.
- `QUOTED` requires at least one saved version.
- Proposal Builder can later reference `PricingVersion.id`.
- Tests prove immutability and version preservation.

### Estimated Implementation Order

1. Finalize snapshot schemas and compatibility version.
2. Add Pricing Version persistence.
3. Implement transactional version-number allocation.
4. Implement `Save Version`.
5. Add read-only version retrieval.
6. Add Version History UI.
7. Enforce quoted-version requirement.
8. Complete integration and E2E tests.

## Phase 7 — Internal Review

### Objective

Provide a complete, explainable, print-ready internal pricing review based on current draft calculations or an immutable Pricing Version without generating or storing a PDF.

### Deliverables

- Internal Review application view model
- Current-draft review route
- Immutable-version review route
- Client and estimate identity
- Project name and lifecycle metadata
- Service-line breakdown
- Project subtotal
- Complexity breakdown
- Discount breakdown
- Rounding disclosure
- Final project price
- Pricing Configuration and engine versions
- Validation warnings
- Print-specific CSS
- Navigation-free print layout
- Screen and print accessibility review
- Manual print verification
- End-to-end Internal Review test

### Dependencies

- Phase 2 explanation model
- Phase 5 interface
- Phase 6 immutable versions
- Approved Internal Review content

### Risks

- Review output could drift from the engine explanation.
- Print CSS may vary between browsers.
- Generated-PDF scope could enter Sprint 4 accidentally.
- Internal review may be mistaken for client-facing proposal content.

### Acceptance Criteria

- Every displayed amount comes from the domain result or stored snapshot.
- The review explains how the final price was reached.
- Draft review is clearly identified as mutable.
- Version review is clearly identified as immutable.
- Client, estimate number, project name, dates, status, configuration version, and engine version are visible.
- Browser printing produces a professional, navigation-free layout.
- No server-generated PDF, stored file, object-storage record, or proposal document is created.
- Internal language is not presented as final client-facing proposal copy.

### Estimated Implementation Order

1. Define shared review view model.
2. Render current draft review.
3. Render immutable version review.
4. Add calculation explanation sections.
5. Add print CSS.
6. Complete accessibility and manual print checks.
7. Add end-to-end review coverage.

## Phase 8 — Testing & Validation

### Objective

Demonstrate calculation parity, architectural isolation, persistence correctness, security boundaries, version immutability, and end-to-end workflow reliability.

### Deliverables

- Completed Pricing Validation Matrix
- Workbook-to-platform comparison evidence
- Approved intentional-difference register
- Complete domain unit suite
- Domain invariant tests
- Application-service tests
- Repository integration tests
- Company-isolation tests
- Estimate-number concurrency tests
- Money-precision tests
- Snapshot immutability tests
- Status-transition tests
- End-to-end browser suite
- Authentication regression tests
- Client regression tests
- Print-review verification
- Performance sanity check for calculation and project loading
- Manual acceptance checklist

### Dependencies

- Phases 1–7 complete
- Approved expected results
- Development database migration applied
- Stable test fixtures

### Risks

- Testing only workbook happy paths could miss unsafe inputs.
- Tests that depend directly on Excel may be fragile in CI.
- Synthetic test records may remain in the development database.
- Parallel authentication tests may interfere through a shared development identity.
- Snapshot tests may validate structure without validating historical completeness.

### Acceptance Criteria

- All approved workbook scenarios match or have Product Owner-approved differences.
- CI fixtures no longer require Excel to calculate expected values.
- All domain, application, integration, and browser tests pass.
- Cross-company access is rejected for every Pricing Project resource.
- Concurrent estimate-number generation is safe.
- Money precision is preserved end to end.
- Draft saves and explicit version saves behave differently as specified.
- Saved versions remain unchanged after draft and configuration changes.
- Existing authentication and Clients tests remain green.
- Browser print review is manually verified.
- Synthetic test records and generated artifacts are cleaned.

### Estimated Implementation Order

1. Run domain and parity suites continuously from Phase 2 onward.
2. Add persistence tests during Phase 3.
3. Add application tests during Phase 4.
4. Add browser tests during Phases 5–7.
5. Execute the complete regression suite.
6. Complete manual workbook comparisons.
7. Complete print verification.
8. Resolve or approve all discrepancies.

## Phase 9 — Release Readiness

### Objective

Prepare a reviewable, documented, reproducible Sprint 4 release without expanding into Sprint 5.

### Deliverables

- Updated authoritative documentation
- Updated roadmap
- Database migration review
- Seed-data review
- Deployment instructions
- Pricing Configuration version documentation
- Engine version documentation
- Workbook Inventory archive or reference
- Final Pricing Validation Matrix
- Release notes
- Manual acceptance results
- Secret audit
- Generated-artifact audit
- Synthetic-test-data audit
- Clean Git working tree
- Recommended release commit and semantic version tag

### Dependencies

- Phases 1–8 accepted
- All Product Owner decisions resolved
- Complete automated validation
- Successful development migration

### Risks

- Late workbook discrepancies may require formula changes.
- Seed data may be correct technically but not approved commercially.
- Production configuration may differ from validated development configuration.
- Release documentation may omit intentional workbook differences.
- Sprint 5 work may begin before Sprint 4 is formally accepted.

### Acceptance Criteria

- Prisma schema validates and client generation succeeds.
- Database migrations apply successfully.
- Lint and typecheck pass.
- Domain, application, and integration tests pass.
- End-to-end browser tests pass.
- Production build passes with development authentication disabled.
- Pricing Validation Matrix is complete.
- Product Owner approves intentional workbook differences.
- Initial Service Catalog and Pricing Configuration are approved.
- Print-ready Internal Review is accepted.
- `.env` remains ignored and no secrets are staged.
- No unintended generated files or test records remain.
- Working tree is clean after release.
- Release commit and tag are verified remotely.
- No Sprint 5 implementation is included.

### Estimated Implementation Order

1. Freeze Sprint 4 scope.
2. Complete documentation and validation evidence.
3. Run full validation suite.
4. Audit migration and seed behavior.
5. Complete manual acceptance review.
6. Resolve release blockers.
7. Prepare release commit and tag for Product Owner approval.
8. Publish only after approval.

## Cross-Phase Implementation Order

Recommended dependency chain:

```text
Phase 1 workbook analysis
        ↓
Phase 2 domain primitives and core formulas
        ↓
Phase 3 database and repositories
        ↓
Phase 4 application workflows
        ↓
Phase 5 editable Pricing Project UI
        ↓
Phase 6 immutable versions
        ↓
Phase 7 print-ready Internal Review
        ↓
Phase 8 complete validation
        ↓
Phase 9 release readiness
```

Testing should not be postponed until Phase 8. Each phase owns its corresponding automated tests; Phase 8 completes cross-phase parity and regression validation.

## Recommended Git Commit Boundaries

Commits should be small enough to review and independently understandable. Avoid mixing workbook decisions, domain formulas, persistence, and UI in one commit.

Recommended boundaries:

1. `docs(pricing): inventory workbook methodology`
2. `docs(pricing): approve validation matrix and seed data`
3. `feat(pricing): add money and pricing domain contracts`
4. `feat(pricing): implement service line and subtotal calculations`
5. `feat(pricing): implement project complexity calculations`
6. `feat(pricing): implement configured project discounts`
7. `test(pricing): complete workbook parity coverage`
8. `feat(pricing): add Pricing Project persistence`
9. `feat(pricing): seed service catalog and pricing configuration`
10. `feat(pricing): add company-scoped Pricing Project services`
11. `feat(pricing): add Client Pricing Projects workflow`
12. `feat(pricing): add Pricing Project calculator interface`
13. `feat(pricing): add immutable Pricing Versions`
14. `feat(pricing): add print-ready Internal Review`
15. `test(pricing): complete Pricing Project end-to-end coverage`
16. `docs(release): finalize Sprint 4 Pricing Projects`

Commit boundaries may be combined when a smaller commit would leave the repository uncompilable. Generated Prisma client output should not be committed unless the repository policy changes.

## Suggested Pull Request Boundaries

If pull requests are used, prefer three reviewable PRs rather than one very large PR:

### PR 1 — Workbook Analysis and Pricing Domain

- Phase 1 deliverables
- Phase 2 domain contracts and calculations
- Pricing Validation Matrix fixtures
- No database or UI

Exit condition: Product Owner approves parity and formula behavior.

### PR 2 — Pricing Project Persistence and Application Services

- Phase 3 database and repositories
- Phase 4 application workflows
- Migration and seed behavior
- Integration and company-isolation tests

Exit condition: Pricing Projects persist safely and calculate server-side.

### PR 3 — Pricing Project Experience, Versions, and Release

- Phase 5 UI
- Phase 6 versioning
- Phase 7 Internal Review
- Phase 8 end-to-end validation
- Phase 9 release documentation

Exit condition: complete approved workflow and release readiness.

If the Product Owner prefers direct commits to `main`, preserve the same logical commit boundaries and require explicit approval before migration deployment and release.

## Potential Implementation Pitfalls

- Writing formulas before workbook analysis is approved
- Treating spreadsheet behavior as correct without business review
- Using floating-point arithmetic for money
- Rounding only for display when workbook rounds intermediate values
- Embedding calculation logic in React, server actions, or repositories
- Accepting submitted totals, prices, Company IDs, dates, or estimate numbers
- Allowing free-text services through an alternate request path
- Storing only the final total without an explanation
- Letting current catalog or configuration changes alter historical versions
- Creating a Pricing Version on every draft save
- Allowing Proposal Builder to reference mutable drafts
- Confusing Pricing Project status with Proposal status
- Implementing project duplication while only lineage support is approved
- Adding generated PDF or object-storage scope
- Expanding into Retainers, AOP, Profit Share, or Hybrid Payment
- Building Service Catalog administration before Sprint 6
- Building role management before Sprint 9
- Failing to test concurrent estimate-number generation
- Leaving synthetic pricing records in the development database

## Product Owner Review Checkpoints

Extra Product Owner review is required:

### Before Domain Calculation Code

- Authoritative workbook version
- Workbook Inventory
- Formula Dependency Map
- Initial Service Catalog
- Initial Pricing Configuration
- Complexity rules
- Discount rules
- Term-discount scope
- Rounding rules
- Intentional differences

### Before Database Migration

- Model names and business terminology
- Estimate-number scope and sequencing
- Status-transition rules
- Project-name length
- Archived restoration behavior
- `IN_REVIEW` editing behavior
- Source Pricing Project lineage
- Seed-data migration strategy

### Before User Interface Completion

- Service-selection experience
- Pricing Summary terminology
- Validation and warning language
- Lifecycle actions
- Client detail integration

### Before Versioning Completion

- Version-number presentation
- Save Version confirmation behavior
- Quoted-status requirements
- Immutable version content

### Before Release

- Pricing Validation Matrix
- Intentional workbook differences
- Initial production Service Catalog
- Initial production Pricing Configuration version
- Internal Review print output
- Manual end-to-end acceptance

## Intentionally Deferred Technical Debt

The following are deliberate roadmap deferrals, not Sprint 4 omissions to fix opportunistically:

- Service Catalog administration until Sprint 6
- Pricing Configuration administration until Sprint 6
- Retainer and AOP calculations until Sprint 7
- Profit Share and Hybrid Payment until Sprint 7
- Engagement integration until Sprint 8
- Roles, authorization, and workspace views until Sprint 9
- Pricing Project duplication workflow
- Client relationship timeline UI
- Generated and stored PDFs
- Proposal PDF generation until Sprint 5
- Multi-currency support
- Custom services
- Manual price overrides
- Approval and audit workflows
- Rich calculation-difference viewer
- Advanced pricing analytics

Deferred items should remain visible in architecture only where needed to prevent redesign, such as `sourcePricingProjectId`, explicit currency, immutable Pricing Version references, and configuration versioning.

## Definition of Ready for Implementation

Implementation may begin only after:

- Product Owner approves this implementation plan.
- Phase 1 workbook-analysis ownership and review process are confirmed.
- The authoritative workbook is identified.
- Required Product Owner decision checkpoints have owners.
- The team agrees not to write calculation code before Phase 1 approval.

