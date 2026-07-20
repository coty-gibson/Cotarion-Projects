# Sprint 4 Phase 3: Persistence Product Owner Review Package

## Status

Phase 3 implementation artifact for Product Owner review.

This phase adds durable Pricing Project persistence only. It does not add application
services, workflow orchestration, pages, API routes, React components, internal
review, Pricing Versions, proposals, agreements, or PDFs. The approved Phase 2
Pricing Domain remains the authoritative calculation engine and was not duplicated
in persistence code.

## Schema Summary

### Pricing Project

`PricingProject` stores:

- Immutable globally unique estimate number in `EST-######` format
- Required Company, Client, owner, and Pricing Configuration Version relationships
- Optional same-Company source Pricing Project for future duplication lineage
- Required project name
- `DRAFT`, `IN_REVIEW`, `QUOTED`, or `ARCHIVED` status
- Explicit `USD` currency
- Created and updated timestamps

Composite foreign keys enforce that the Client, owner, configuration version, and
optional source Pricing Project belong to the same Company as the Pricing Project.
Company-scoped status, Client, updated-date, owner, and source indexes support the
approved query patterns.

### Estimate Allocation

`PricingProjectSequence` is a singleton global counter. Creation atomically upserts
and increments its `BIGINT` value in a short allocation transaction before creating
the Pricing Project. The lock is released before child records are inserted, which
keeps concurrent creation from serializing entire Project writes. A failed later
write may leave a sequence gap, but allocated numbers are never reused.

A global counter is required because estimate numbers do not contain a Company
component and are globally unique. Per-Company counters could both allocate
`EST-000001`. The database also has a unique estimate-number index, a format check,
and an update trigger that prevents estimate-number changes.

Global numbering is approved for Sprint 4. The allocation policy should become
configurable in a future sprint if Cotarion later needs Company-specific sequences,
prefixes, regional numbering, or another reference-number policy. That future
configuration must preserve all previously issued estimate numbers.

### Service Catalog

`ServiceCatalogItem` stores:

- Immutable database ID
- Company
- Stable Phase 2 service code
- Business-facing name
- Optional description
- Base price in integer USD minor units
- Explicit USD currency
- Active/inactive status
- Sort order and timestamps

`PricingProjectLine` contains only a Service Catalog foreign key, positive
fixed-precision quantity, order, Company, and timestamps. It contains no free-text
service name, submitted unit price, manual price, override, or override reason.
Composite foreign keys prevent cross-Company Project/service relationships.

### Complexity and Discount Selections

`PricingComplexitySelection` stores one unique option code per factor code and
Pricing Project. `PricingDiscountSelection` is one-to-one with a Pricing Project.
Labels, increments, and discount rates remain versioned Pricing Configuration data,
not editable line data.

### Pricing Configuration

`PricingConfiguration` is a Company-owned aggregate with one row per Company.
`PricingConfigurationVersion` stores:

- Monotonic version number
- Active/retired status
- Phase 2 schema and engine versions
- Explicit USD currency
- Validated JSON configuration snapshot
- Effective and created dates

A partial unique database index permits only one active version per Company.
Pricing Projects reference a specific same-Company version. Database triggers prevent
deletion or changes to version identity, rules, currency, engine, schema, effective
date, or snapshot contents. Status may change from active to retired so later
configuration versions remain possible.

## Migration Summary

Migration:

- `prisma/migrations/20260720000100_pricing_projects_persistence/migration.sql`

The migration creates:

- Four pricing enums
- Seven pricing persistence tables plus the global sequence table
- Composite same-Company candidate keys and foreign keys
- Required query and uniqueness indexes
- One-active-configuration partial unique index
- Positive quantity, non-negative price, non-blank name, estimate format, and
  self-source checks
- Estimate-number immutability trigger
- Pricing Configuration Version immutability trigger

The migration was successfully deployed to the configured development PostgreSQL
database. Prisma schema validation and client generation pass.

## Seed Summary

`seedPricingFoundation(companyId)` provides the repeatable Company-scoped seed.

It creates:

- All 29 approved services
- Exact Phase 2 service names and prices
- Stable immutable service codes
- Integer USD prices
- Active status for every initial service
- Approved catalog ordering
- One Pricing Configuration aggregate
- Version 1 containing all service, category, complexity, discount, currency,
  precision, and rounding configuration required to reconstruct the Phase 2 domain

Descriptions remain null because Phase 1 approved exact names and prices but
explicitly reserved long-form workbook text for separate editorial approval.

The seed is deliberately non-destructive. A rerun:

- Preserves existing Service Catalog database IDs
- Verifies every baseline value
- Verifies the immutable configuration snapshot using canonical JSON comparison
- Returns the existing configuration version
- Fails on drift rather than overwriting catalog or historical configuration data

## Repository Summary

Repository contracts:

- `PricingProjectRepository`
- `ServiceCatalogRepository`
- `PricingConfigurationRepository`

Prisma implementations provide:

- Transactional Pricing Project creation and estimate allocation
- Company-scoped find and Client-list operations
- Persistence-only draft data replacement
- Persistence-only status update
- Active Company Service Catalog lookup
- Company-scoped service lookup
- Active Pricing Configuration lookup
- Historical configuration-version lookup

The repositories accept Service Catalog IDs and configuration-version IDs. They do
not accept calculated totals, manual prices, estimate numbers, Company IDs from
untrusted project input, or free-text service names.

Lifecycle policy and calculation orchestration remain Phase 4 concerns.

## Constraint Summary

The database, rather than repository convention alone, enforces:

- Pricing Project and Client Company equality
- Pricing Project and owner Company equality
- Pricing Project and Pricing Configuration Version Company equality
- Pricing Project Line, Pricing Project, and Service Catalog Company equality
- Optional source Pricing Project Company equality
- Globally unique, correctly formatted, immutable estimate numbers
- Positive line quantities with two-decimal fixed precision
- Non-negative integer catalog prices
- Non-blank project and service names
- One complexity option per factor and Pricing Project
- One discount selection per Pricing Project
- One active Pricing Configuration Version per Company
- Immutable and non-deletable Pricing Configuration Version contents
- Explicit USD currency

Integration tests intentionally attempt each cross-Company relationship and confirm
that PostgreSQL rejects it.

## Integration Test Results

Phase 3 integration coverage verifies:

- Idempotent 29-service seed
- Exact names, prices, status, currency, and stable database IDs
- Six complexity factors
- Four approved discounts
- Configuration snapshot, schema version, and engine version
- Baseline drift raises an error and does not overwrite the changed row
- Company-scoped catalog and configuration reads
- Pricing Project creation and read
- Draft replacement without changing estimate or configuration identity
- Status changes through `IN_REVIEW`, `QUOTED`, and `ARCHIVED`
- Client Pricing Project listing
- Exact fixed-decimal quantity persistence
- Integer money precision persistence
- Six complexity selections and one discount selection
- Cross-Company Client rejection
- Cross-Company ApplicationUser owner rejection
- Cross-Company Pricing Configuration Version rejection
- Cross-Company Service Catalog item rejection
- Estimate and configuration-version immutability
- Historical Pricing Project configuration-version reference preservation
- Project-name, positive-quantity, factor-uniqueness, and one-active-configuration
  database checks
- Twelve concurrent Pricing Project creations
- Unique, consecutive, monotonically increasing estimate allocation

Integration-created Pricing Projects, Clients, users, and secondary Company records
are removed by test cleanup. The approved Cotarion Company pricing seed remains as
intended.

Focused Phase 3 result:

- 10 integration tests passed
- 0 failed

## Concurrency Test Results

Twelve Pricing Projects are created concurrently against the configured PostgreSQL
database.

The test confirms:

- Every creation succeeds
- Every estimate number matches `EST-######`
- No estimate number is duplicated
- Numeric allocations are consecutive and monotonically increasing
- The short global allocation transaction releases its lock before Project child
  records are written

The integration harness restores the pre-test allocator value after deleting its
test Projects, provided the total Project count is unchanged. This prevents tests
from consuming production-like estimate numbers.

## Precision Test Results

Persistence uses:

- `BIGINT` minor units for Service Catalog money
- `DECIMAL(18,2)` for quantities
- Strings at the repository boundary for decimal quantities
- JavaScript `bigint` at the repository boundary for money minor units

Verified round trips include:

- Quantity `0.01`
- Quantity `1.25`
- Quantity `0.33`
- Quantity `2.50`
- Quantity `999999999999.99`
- Price `25000` minor units
- Price `650000` minor units

Values return exactly as stored. No binary floating-point conversion participates in
money or quantity persistence.

## Validation Results

- Prisma schema validation: passed
- Prisma client generation: passed
- Migration deployment: passed
- Migration status: database schema up to date
- TypeScript typecheck: passed
- ESLint: passed
- Prettier: passed
- `git diff --check`: passed
- Focused Phase 3 integration suite: 10 passed
- Complete unit and integration suite: 64 passed
- Temporary Pricing Projects after validation: 0
- Temporary test users after validation: 0
- Temporary secondary Companies after validation: 0
- Test allocator state after validation: restored

Non-blocking dependency notices:

- Vite reports that its current CommonJS Node API build is deprecated.
- The PostgreSQL driver reports an upcoming SSL-mode semantic change.
- The PostgreSQL driver reports that concurrent `client.query()` usage will change
  in its next major version. This originates in the current adapter/driver path
  during the concurrency test; the allocation test itself passes.

## Scope Confirmation

Phase 3 did not implement:

- Pricing calculations outside the Phase 2 domain
- Application services
- UI, pages, or React components
- API routes
- Internal Review
- Pricing Version snapshots or version UI
- Proposal Builder
- Agreement or PDF generation
- Retainers, AOP, Profit Share, or Hybrid pricing
- Roles or Service Catalog Administration

Phase 4 must not begin without Product Owner approval.
