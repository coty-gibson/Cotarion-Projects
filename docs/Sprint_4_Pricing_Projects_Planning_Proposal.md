# Sprint 4 Planning Proposal: Pricing Projects

## Status

Revised for Product Owner review. This proposal supersedes the post-Sprint-3 sequence in the legacy implementation plan. It is a planning artifact only and does not authorize implementation.

## Approved Roadmap

1. Sprint 4 — Pricing Projects
2. Sprint 5 — Proposal Builder
3. Sprint 6 — Services & Pricing Administration
4. Sprint 7 — Retainers & AOP
5. Sprint 8 — Engagements
6. Sprint 9 — Roles, Authorization & Workspace Views

## Product Principles

- Build the highest business value first.
- Clients are the center of operational records.
- Future modules reference prior records rather than recreate their data.
- Major business records receive immutable human-readable reference numbers.
- Client history should eventually form a chronological relationship timeline.
- The interface uses business terminology rather than technical terminology.
- Pricing remains value-based. Project pricing must not become hourly billing.
- Calculations must be transparent and independently testable.
- Historical pricing results must remain accurate after configuration changes.

## Business Objective

Replace the project-pricing responsibilities of the current Excel Pricing Tool with the permanent project-pricing engine for Cotarion Platform.

Sprint 4 will let an authenticated user create a client-linked Pricing Project, select predefined services, apply the approved project-pricing methodology, review an explainable result, save the draft, and explicitly preserve immutable versions for later use by Proposal Builder.

Workbook inventory and formula analysis is the first implementation task. No calculation code should be written until that analysis identifies the approved inputs, formulas, lookups, dependencies, defaults, and rounding behavior.

## Business Value

- Reduces reliance on a manually operated spreadsheet.
- Prevents formula drift and transcription mistakes.
- Connects pricing directly to the Client relationship.
- Gives Proposal Builder a stable, versioned pricing source.
- Makes every service, factor, adjustment, and total explainable.
- Preserves historical versions when pricing configuration changes.
- Creates structured data for future client history, reporting, and analytics.
- Establishes a reusable pricing engine without prematurely building administration, retainers, AOP, or authorization.

## Sprint Scope

### Included

- Workbook inventory and formula analysis
- Pricing Validation Matrix
- Client-linked Pricing Projects
- Immutable `EST-######` reference numbers
- Required user-defined project names
- Draft creation and editing
- Predefined Service Catalog
- Initial service and price seeding from the approved reference workbook
- Project service line calculations
- Project subtotal
- Approved project complexity calculations
- Standard / No Added Complexity behavior
- Combined project complexity multiplier
- Approved project discount calculations
- Non-stacking client discount rules
- Separate term discount behavior if confirmed by workbook analysis
- Single versioned Pricing Configuration
- Transparent calculation breakdown
- Explicit manual `Save Version` action
- Immutable pricing versions
- Print-ready internal review
- Client detail integration
- Company isolation

### Explicitly Deferred

- Proposal Builder and proposal options
- Generated or stored PDFs
- Proposal PDFs
- Service Catalog management UI
- Pricing Configuration management UI
- Multiple pricing methodologies
- Manual price overrides
- Override reasons
- Approval or audit workflows
- Retainers
- AOP
- Profit Share
- Hybrid Payment
- Advisory Consulting workflow unless separately approved
- Engagements
- Roles, authorization, and workspace views
- Imports
- Bulk actions
- Pricing Project duplication UI or action
- Client relationship timeline UI
- Email delivery
- AI pricing recommendations
- Multi-currency pricing

## Business Terminology

Use these user-facing terms:

- Pricing Project
- Project Name
- Estimate Number
- Services
- Complexity
- Discounts
- Project Subtotal
- Final Project Price
- Pricing Version
- Pricing Configuration
- Internal Review

Do not expose implementation terms such as aggregate, payload, rule engine, JSON snapshot, entity, or persistence model in normal UI.

## Pricing Project Identity and Lifecycle

Every Pricing Project includes:

- Immutable system-generated estimate number in `EST-######` format
- Required user-defined project name
- System-generated created date
- System-generated last updated date
- Status
- Existing Client
- Company inherited from and matching the Client
- Owner, defaulting to the current application user
- Explicitly stored currency, fixed to `USD` in Version 1

### Project Name

The project name describes the work, for example:

- Finance Operations Assessment
- Leadership Alignment Workshop
- Process Improvement Initiative

A project name must not require a date, version number, client name, or estimate number. The system provides identity, dates, and version history separately.

### Statuses

- `DRAFT`
- `IN_REVIEW`
- `QUOTED`
- `ARCHIVED`

Recommended transitions:

- `DRAFT` → `IN_REVIEW`
- `IN_REVIEW` → `DRAFT`
- `IN_REVIEW` → `QUOTED`
- `QUOTED` → `ARCHIVED`
- `DRAFT` → `ARCHIVED`
- `IN_REVIEW` → `ARCHIVED`

Returning a quoted project to draft is not recommended because Proposal Builder should later reference an immutable Pricing Version. Corrections should occur in the editable Pricing Project and produce a new saved version without changing prior versions.

## Features and Workflows

### Create Pricing Project

1. User starts from an existing Client.
2. User selects Create Pricing Project.
3. System assigns the next immutable `EST-######` number.
4. User enters a required project name.
5. System assigns the Client, matching Company, current owner, `USD`, created date, updated date, and `DRAFT` status.
6. User adds services from the predefined Service Catalog.

Pricing Projects cannot be created without a Client.

### Configure Services

- Every line references an active predefined Service Catalog item.
- Free-text service names are prohibited.
- The line displays the approved service name and description.
- Quantity may be entered where the workbook methodology permits it.
- The applicable configured service price is resolved by the engine.
- Manual unit-price and total-price overrides are not included.
- A service may not be silently substituted or recreated.

### Configure Complexity

- User selects only approved complexity factors and options.
- Standard / No Added Complexity remains available.
- The combined multiplier is calculated, never directly entered.
- Each factor and its effect appears in Internal Review.

### Apply Discounts

- Only approved configured discounts are selectable.
- Standard client discounts cannot stack.
- Term discounts remain separate if confirmed as part of project pricing.
- Discounts cannot produce a negative total.
- Manual discount creation and percentage entry are prohibited.

### Save Draft

- Normal saves update the mutable Pricing Project.
- Normal saves update the system-generated last updated date.
- Normal saves do not create immutable versions.
- The server recalculates before persistence.

### Save Version

- A user explicitly selects `Save Version`.
- The current Pricing Project must pass all blocking validation.
- The system stores immutable input and result snapshots.
- The saved version records the Pricing Configuration version and engine version.
- Later draft edits do not alter a saved version.
- Sprint 5 Proposal Builder must reference an immutable Pricing Version.

### Internal Review

The print-ready Internal Review displays:

1. Client
2. Estimate number
3. Project name
4. Status
5. Created and last updated dates
6. Service lines
7. Project subtotal
8. Complexity selections
9. Combined complexity multiplier
10. Complexity adjustment
11. Approved discounts
12. Rounding adjustment where applicable
13. Final project price
14. Pricing Configuration version
15. Engine version
16. Validation warnings

The review is printable through the browser. Sprint 4 does not generate, upload, or store PDF files.

## Architecture

### Domain Layer

All calculation logic belongs in `src/domain/pricing`.

Recommended concepts:

- `Money`
- `Percentage`
- `Multiplier`
- `ProjectServiceLine`
- `ComplexitySelection`
- `DiscountSelection`
- `PricingConfiguration`
- `ProjectPricingInput`
- `ProjectPricingResult`
- `CalculationStep`
- `PricingValidationIssue`
- `ProjectPricingEngine`

The core operation should be deterministic and resemble:

```text
calculateProjectPricing(input, configuration) → result
```

It must:

- Avoid React, Prisma, authentication, and database dependencies.
- Avoid JavaScript floating-point arithmetic for money.
- Return a complete ordered explanation, not only a final total.
- Distinguish blocking validation issues from non-blocking warnings.
- Never mutate its inputs.
- Produce identical results for identical input and configuration versions.

### Application Layer

Application workflows coordinate:

- Current application user and Company
- Client validation
- Estimate-number allocation
- Pricing Project creation and editing
- Active Service Catalog lookup
- Pricing Configuration lookup
- Domain calculation
- Status transitions
- Explicit version creation
- Client-linked listing and detail retrieval

Suggested use cases:

- Create Pricing Project for Client
- Update Pricing Project
- Calculate Pricing Project
- Submit Pricing Project for Review
- Mark Pricing Project Quoted
- Archive Pricing Project
- Save Pricing Version
- List Pricing Projects for Client
- Get Internal Review

### Infrastructure Layer

Repositories:

- Always scope Pricing Projects by `companyId`.
- Validate that the Client belongs to the same Company.
- Allocate estimate numbers transactionally.
- Load the single active Pricing Configuration version.
- Load active Service Catalog items.
- Save drafts and service selections transactionally.
- Append immutable Pricing Versions.
- Never contain calculation formulas.

### Presentation Layer

- Collects approved inputs.
- Presents Service Catalog choices.
- Displays domain results and validation.
- Does not implement formulas.
- Does not trust client-side calculated totals when saving.
- Uses business language throughout.

### Future Duplication Support

The data model should include an optional self-reference such as `sourcePricingProjectId`.

This permits a future workflow to duplicate a quoted or completed Pricing Project while:

- Assigning a new `EST-######` reference.
- Creating a new Pricing Project identity.
- Preserving the source relationship.
- Copying approved inputs as a new mutable draft.
- Leaving source versions immutable.

Sprint 4 does not expose or implement duplication.

## Pricing Configuration

Sprint 4 uses one pricing methodology represented by a single versioned Pricing Configuration.

Requirements:

- Only one active configuration applies to new calculations for a Company.
- Configuration versions are immutable after use by a saved Pricing Version.
- A newer version may replace the active version without altering history.
- Saved Pricing Versions record the exact configuration version used.
- No Pricing Configuration management UI is included.
- Initial configuration is seeded from the approved workbook.
- Configuration structure is validated by application code.

The term Pricing Rule Set should not be used.

## Service Catalog

Sprint 4 requires a predefined Service Catalog.

Requirements:

- Seed initial approved services and prices from `reference/Cotarion_Pricing_Tool.xlsx`.
- Every Pricing Project line references a Service Catalog item.
- No free-text service name or custom service is allowed.
- Services have stable internal IDs and business-facing names.
- Inactive services remain available to historical versions but cannot be added to new drafts.
- Saved Pricing Versions snapshot service name, description, quantity, and configured price.
- Sprint 6 adds Services & Pricing Administration.

## Database Design

### `PricingProject`

- `id`
- `estimateNumber` — immutable and unique, formatted `EST-######`
- `companyId`
- `clientId`
- `ownerId`
- `sourcePricingProjectId` — nullable future duplication lineage
- `projectName`
- `status`
- `currency` — explicitly stored, `USD` only in Version 1
- `createdAt`
- `updatedAt`

Indexes:

- Unique estimate number
- Company and status
- Company and client
- Company and updated date
- Owner
- Source Pricing Project

### `PricingProjectSequence`

- `companyId`
- `lastValue`

The counter is incremented transactionally. Reference numbers are never reused or edited.

### `ServiceCatalogItem`

- `id`
- `companyId`
- `code`
- `name`
- `description`
- `basePriceMinor`
- `currency`
- `status`
- `sortOrder`
- `createdAt`
- `updatedAt`

Suggested statuses:

- `ACTIVE`
- `INACTIVE`

Service Catalog management remains deferred.

### `PricingProjectLine`

- `id`
- `pricingProjectId`
- `serviceCatalogItemId`
- `quantity`
- `sortOrder`
- `createdAt`
- `updatedAt`

The editable draft references the current catalog item. A saved Pricing Version stores the historical service and price snapshot.

### `PricingComplexitySelection`

- `id`
- `pricingProjectId`
- `factorCode`
- `optionCode`
- `sortOrder`

Labels and multipliers come from the active Pricing Configuration.

### `PricingDiscountSelection`

- `id`
- `pricingProjectId`
- `discountCode`
- `sortOrder`

Discount definitions and values come from the active Pricing Configuration. There are no manual discount fields.

### `PricingConfiguration`

- `id`
- `companyId`
- `version`
- `status`
- `configuration`
- `effectiveFrom`
- `createdAt`

Suggested statuses:

- `ACTIVE`
- `RETIRED`

Only one active configuration is permitted per Company.

### `PricingVersion`

- `id`
- `pricingProjectId`
- `companyId`
- `clientId`
- `createdById`
- `versionNumber`
- `engineVersion`
- `pricingConfigurationId`
- `pricingConfigurationVersion`
- `currency`
- `inputSnapshot`
- `resultSnapshot`
- `createdAt`

Pricing Versions are append-only through ordinary application behavior.

### Money Storage

- Store money in integer minor units, such as cents, or an explicitly approved fixed-precision decimal.
- Never persist currency amounts as binary floating-point values.
- Store `USD` explicitly even though Version 1 is single-currency.

### Historical Strategy

Use relational columns for identity, Client and Company relationships, lifecycle, and common queries. Use validated immutable snapshots for historical inputs and calculated results.

Future modules should reference `PricingVersion.id` rather than copy editable Pricing Project data.

## Validation Rules

### Identity and Relationships

- Project name is required after trimming.
- Project name describes the work and has a documented maximum length.
- Dates and version identifiers are not required in the project name.
- Estimate number is system generated and immutable.
- Client is required.
- Client must belong to the current Company.
- Pricing Project Company must equal Client Company.
- Owner must be an active application user in the same Company.
- Currency must be `USD`.

### Services

- At least one active service is required before review or versioning.
- Every line references a known active Service Catalog item.
- Free-text services are rejected.
- Quantity must be positive and within the approved precision.
- Duplicate service behavior must follow the workbook analysis decision.
- No manual price fields are accepted.

### Complexity

- Required factors must be selected.
- Only configured options are accepted.
- Standard / No Added Complexity produces `1.00x` and a `$0` adjustment.
- Combined multiplier cannot be entered or overridden directly.

### Discounts

- Only configured discounts are accepted.
- Standard client discounts do not stack.
- Term discounts remain separate if included.
- Discounts cannot exceed configured limits.
- Discounts cannot produce a negative total.
- No manual discount value is accepted.

### Status

- Only approved transitions are permitted.
- `IN_REVIEW` requires a valid current calculation.
- `QUOTED` requires at least one immutable Pricing Version.
- Archived projects remain viewable and cannot be edited without an explicitly approved restoration workflow.

### Versioning

- `Save Version` is explicit.
- Normal draft saves never create versions.
- Only a valid Pricing Project can be versioned.
- Version numbers increase monotonically within a Pricing Project.
- Existing versions cannot be edited or recalculated.

### Rounding

Workbook analysis must define:

- Internal money precision
- Quantity precision
- Percentage precision
- Multiplier precision
- The exact step where each rounding operation occurs
- Display rounding
- Any nearest-dollar or other project-pricing convention

UI formatting must not change calculation values.

## Calculation Engine

Recommended pipeline:

```text
validate input and relationships
        ↓
load referenced services
        ↓
load active Pricing Configuration
        ↓
calculate service line totals
        ↓
calculate project subtotal
        ↓
resolve complexity selections
        ↓
calculate combined complexity multiplier
        ↓
calculate complexity adjustment
        ↓
apply configured project discounts
        ↓
apply confirmed term discount behavior
        ↓
apply approved rounding
        ↓
return total, calculation steps, warnings, and blocking issues
```

The result includes:

- Service line totals
- Project subtotal
- Complexity multiplier
- Complexity adjustment
- Discount amounts
- Rounding adjustment
- Final project price
- Ordered calculation explanation
- Applied configuration version
- Engine version
- Warnings
- Blocking validation issues

## Workbook Inventory and Formula Analysis

This is implementation task one and a blocking prerequisite for calculation code.

The inventory must identify:

- All workbook sheets, including hidden sheets
- Named ranges
- Input cells
- Formula cells
- Lookup tables
- Service definitions and prices
- Complexity factors and options
- Discount definitions and eligibility
- Cross-sheet dependencies
- Default assumptions
- Error behavior
- Manual steps
- Formula order
- Rounding locations
- Stale, unused, or contradictory workbook logic

Deliverables:

- Workbook Inventory
- Formula Dependency Map
- Approved Service Catalog seed list
- Approved Pricing Configuration seed
- Pricing Validation Matrix
- List of ambiguities requiring Product Owner decisions
- Documented intentional differences

The workbook is a reference for intended methodology, not automatic authority for demonstrable defects.

## UI and UX

### Recommended Routes

- `/clients/[clientId]/pricing-projects`
- `/clients/[clientId]/pricing-projects/new`
- `/pricing-projects/[pricingProjectId]`
- `/pricing-projects/[pricingProjectId]/review`
- `/pricing-projects/[pricingProjectId]/versions/[pricingVersionId]`

### Client Integration

Client detail gains a Pricing Projects section showing:

- Estimate number
- Project name
- Status
- Final project price when valid
- Created date
- Last updated date
- Most recent saved version

This structure prepares Pricing Projects to appear later in the Client relationship timeline.

### Pricing Project Screen

Recommended sections:

1. Project Details
2. Services
3. Complexity
4. Discounts
5. Pricing Summary
6. Internal Review
7. Version History

The summary remains visible while editing on desktop. The server is authoritative for saved calculations.

### Print-Ready Review

- Optimized print CSS
- No application navigation in print
- Clear client and estimate identity
- Complete calculation explanation
- Pricing Configuration and engine versions
- Browser print only
- No generated file
- No object storage

## Security and Company Isolation

- Authentication is required.
- Current `ApplicationUser` must be active.
- Every Pricing Project query includes `companyId`.
- Every Client lookup includes `companyId`.
- Client and Pricing Project Company must match.
- Service Catalog and Pricing Configuration are Company scoped.
- A record ID alone never grants access.
- Cross-company records return not found without disclosing existence.
- Submitted company, owner, price, configuration, calculated total, date, and reference-number values are not trusted.
- The server recalculates before save and before `Save Version`.
- Existing Microsoft and development authentication behavior remains unchanged.
- Sprint 9 will introduce broader role policies; Sprint 4 retains the current authenticated Company access model.

## PDF Approach

Sprint 4 provides only a print-ready Internal Review.

Explicitly excluded:

- Server-generated PDF
- PDF download
- Object storage
- Document records
- Permanent PDF retention

Sprint 5 Proposal Builder owns proposal PDF scope. Future PDF generation should render from immutable records and reference a `PricingVersion`, never a mutable Pricing Project.

## Acceptance Criteria

- Workbook Inventory and Formula Analysis are completed and approved before calculation code begins.
- Initial Service Catalog services and prices match the approved workbook inventory.
- Initial Pricing Configuration matches approved project-pricing methodology.
- User can create a Pricing Project only from an existing same-Company Client.
- System assigns a unique immutable `EST-######` number safely under concurrent creation.
- Project name is required and independent of date or version identity.
- Created and last updated dates are system managed.
- Status supports `DRAFT`, `IN_REVIEW`, `QUOTED`, and `ARCHIVED`.
- Currency is explicitly stored as `USD`.
- User can add only predefined active Service Catalog items.
- Free-text service names and manual price overrides are unavailable and rejected server-side.
- Service lines, subtotal, complexity, discounts, rounding, and final project price match approved workbook scenarios.
- Standard complexity produces `1.00x` and `$0`.
- Invalid or incomplete projects cannot enter review or save a version.
- Normal draft saves do not create Pricing Versions.
- Explicit `Save Version` creates an immutable version.
- Draft changes after versioning do not alter prior versions.
- `QUOTED` requires an immutable Pricing Version.
- Proposal Builder can later reference `PricingVersion.id`.
- Client detail shows associated Pricing Projects.
- Internal Review is print ready and contains an explainable calculation breakdown.
- No generated or stored PDF exists.
- Data model includes future duplication lineage without implementing duplication.
- All pricing formulas reside in the Domain Layer.
- UI, application workflows, and repositories do not duplicate formulas.
- Company isolation is enforced on every read and write.
- Existing Clients and authentication workflows remain green.
- Pricing Validation Matrix matches Excel or records Product Owner-approved differences.
- All release validation gates pass.

## Testing Strategy

### Workbook Parity

Create approved fixtures from the Pricing Validation Matrix. CI should not require Excel after expected results are approved.

Scenarios include:

- Single service
- Multiple services
- Quantity variations
- Standard complexity
- Every approved complexity option
- Combined complexity
- Each approved discount
- Discount conflicts
- Term discount behavior if included
- Rounding boundaries
- Zero, missing, negative, and excessive inputs
- Large totals
- Workbook error states

### Domain Unit Tests

- Money arithmetic
- Service line totals
- Project subtotal
- Complexity selection and combination
- Standard complexity
- Configured discounts
- Non-stacking rules
- Rounding
- Invalid input handling
- Determinism
- Input immutability
- Calculation explanation order

### Domain Invariants

- Final price never becomes negative.
- Adding a positive service line cannot reduce pre-discount subtotal.
- Reordering lines does not change totals.
- Standard complexity does not change subtotal.
- Discounts never increase totals.
- Identical input and configuration versions produce identical results.

### Application Tests

- Client and Company validation
- Estimate-number allocation
- Required project name
- Status transitions
- Active Service Catalog selection
- Active Pricing Configuration selection
- Draft save behavior
- Explicit version creation
- Quoted-version requirement
- Cross-company rejection

### Repository Integration Tests

- Concurrent unique estimate-number generation
- Pricing Project persistence
- Company-scoped queries
- Client relation enforcement
- Service references
- Line ordering
- Transaction rollback
- Immutable Pricing Versions
- Monotonic version numbering
- Money precision
- Configuration-version preservation
- Source Pricing Project self-reference support without duplication behavior

### End-to-End Tests

- Start Pricing Project from Client
- Confirm generated estimate number and dates
- Enter project name
- Add predefined services
- Select complexity
- Apply approved discount
- Review calculation explanation
- Save and reopen draft without creating a version
- Save Version explicitly
- Edit draft and confirm prior version is unchanged
- Move valid project into review
- Mark versioned project quoted
- Print Internal Review
- Reject cross-company access
- Preserve authentication behavior

### Release Gates

- Prisma validate
- Prisma generate
- Migration deployment
- Lint
- Typecheck
- Domain and application tests
- Database integration tests
- Pricing Validation Matrix
- Chromium end-to-end tests
- Production build with development authentication disabled
- Manual calculation comparison
- Print review verification
- Secret and generated-artifact audit
- Clean repository state

## Risks

- Workbook formulas may contain hidden assumptions or inconsistent rounding.
- Service and price data may require Product Owner cleanup before seeding.
- Implementing before workbook analysis is approved could encode incorrect methodology.
- Project pricing could expand into deferred Retainer or AOP scope.
- A configuration structure that is too rigid may complicate Sprint 6.
- A configuration structure that is too generic may be hard to validate or explain.
- Incorrect money representation could create material discrepancies.
- Status transitions may become confused with future proposal status.
- Print work could distract from calculation correctness.
- Without roles until Sprint 9, all active Company users retain current Company-level access.
- Historical accuracy fails if Proposal Builder references mutable drafts.

## Product Owner Decisions

### Approved and Locked

- User-facing term is Pricing Project.
- Estimate number format is `EST-######`.
- Estimate number is immutable and system generated.
- Project name is required and describes the work.
- Project name does not require date or version information.
- Dates are system generated.
- Statuses are `DRAFT`, `IN_REVIEW`, `QUOTED`, and `ARCHIVED`.
- Every Pricing Project belongs to an existing same-Company Client.
- Sprint 4 uses one versioned Pricing Configuration.
- No Pricing Configuration management UI exists in Sprint 4.
- Predefined Service Catalog is required.
- Free-text services are prohibited.
- Initial services and prices are seeded from the workbook.
- No manual price overrides exist.
- Sprint 4 calculation scope is project pricing only.
- Currency is `USD`, stored explicitly.
- Versions are created only through explicit `Save Version`.
- Proposal Builder consumes an immutable Pricing Version.
- Sprint 4 provides print-ready review, not generated PDF.
- Workbook analysis precedes calculation code.
- Architecture supports future duplication lineage without implementing duplication.
- Clients remain the center of operational records.

### Remaining Decisions Before Calculation Implementation

1. Approve the Workbook Inventory and Formula Dependency Map.
2. Approve the initial Service Catalog names, codes, descriptions, prices, and ordering.
3. Decide whether the same service may appear more than once in one Pricing Project.
4. Approve every complexity factor, option, multiplier, default, and combination rule.
5. Approve every project discount, eligibility rule, percentage, limit, and calculation order.
6. Confirm whether term discounts belong in Sprint 4 project pricing.
7. Approve exact money, quantity, multiplier, percentage, and display rounding.
8. Confirm whether archived Pricing Projects can be restored in Sprint 4.
9. Confirm whether `IN_REVIEW` projects remain editable or must return to `DRAFT`.
10. Confirm who may mark a Pricing Project `QUOTED` before Sprint 9 roles exist.
11. Approve the maximum project-name length and naming guidance.
12. Approve the initial engine-version convention.
13. Designate the Product Owner approver for intentional differences from workbook behavior.
14. Confirm whether Advisory Consulting project pricing is excluded entirely until a later roadmap decision.

## Definition of Ready

Sprint 4 implementation is ready to begin only after:

- This revised proposal is approved.
- Workbook Inventory ownership is assigned.
- Product Owner identifies the authoritative workbook version.
- Initial service data is approved or a review process is scheduled.
- Remaining calculation decisions have an approval path.

