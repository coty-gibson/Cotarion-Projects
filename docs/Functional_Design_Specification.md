# Functional Design Specification

## Application Architecture Decision

The overall application is named **Cotarion Platform**.

The Cotarion Platform is the long-term business operating platform for Cotarion. It is designed to support multiple business functions over time while preserving shared foundations such as clients, users, ownership, departments, templates, documents, agreements, and historical records.

Version 1 focuses exclusively on the first module:

**Pricing & Proposals**

The Version 1 interface should expose only the Pricing & Proposals module and the administrative areas required to support it. Future modules must not appear as unfinished navigation items, disabled screens, placeholders, or visible menu options.

Future Cotarion Platform modules may include, but are not limited to:

- Engagement Management
- Client Success
- KPI & Performance
- Operational Diagnostics
- Reporting & Analytics
- Department Management
- Financial Tools
- Additional Cotarion group modules

The platform architecture should allow these modules to be added later without redesigning the core application.

## Version 1 Scope

Version 1 is the **Pricing & Proposals** module.

Its purpose is to support:

- Client records
- Proposal creation
- Proposal options
- Project pricing
- Retainer pricing
- Advisory Consulting pricing
- Complexity calculations
- AOP and profit-share calculations
- Discounts
- Internal pricing review
- Client-facing proposal preview
- Proposal PDF generation
- Agreement generation
- Historical snapshots
- Signed agreement records
- Automatic creation of an initial Engagement record after signing
- Administrative management of services, pricing rules, templates, and branding foundations

Version 1 should not attempt to build the future Engagement Management module beyond creating the initial Engagement record needed for future expansion.

## Naming Updates

All previous references to **Cotarion Pricing Tool** should be understood as **Cotarion Platform**.

All Version 1 pricing/proposal functionality belongs to the **Pricing & Proposals** module.

Correct naming examples:

- Application: Cotarion Platform
- Version 1 module: Pricing & Proposals
- Proposal builder: Pricing & Proposals proposal builder
- Admin pricing area: Pricing & Proposals administration
- Future engagement features: future Engagement Management module

## Cotarion Platform Design Principles

These principles are permanent architectural guidance for all future Cotarion Platform development.

### 1. Business First

Software exists to support Cotarion's business model and consulting philosophy, not force the business to adapt to software limitations.

### 2. Simple Before Powerful

Choose the simplest workflow that accomplishes the objective while preserving room for future growth.

### 3. Guide, Don't Overwhelm

The application should reveal information as it becomes relevant and avoid unnecessary clutter or complexity.

### 4. Transparent Calculations

Every price, adjustment, recommendation, discount, and calculation should be understandable and explainable.

### 5. Value Before Time

Projects are priced based on value, expertise, complexity, and outcomes, not hours worked. Hourly billing is reserved exclusively for Advisory Consulting.

### 6. Build For Growth

Every architectural decision should make future expansion easier, including additional consultants, departments, Cotarion groups, and future modules.

### 7. Preserve History

Finalized proposals, agreements, pricing rules, and templates should always remain historically accurate through immutable snapshots.

### 8. Configuration Over Code

Business users should be able to update pricing, services, templates, discounts, and business rules through administration whenever practical rather than requiring code changes.

### 9. Professional Experience

The application should feel like premium consulting software rather than a spreadsheet, accounting package, or generic CRM.

### 10. Deliberate Evolution

Every new feature must satisfy at least one of the following:

- Makes the platform easier to use.
- Makes the platform easier to maintain.
- Makes the platform easier to grow.

If a proposed feature does not accomplish at least one of these objectives, it should not be added.

## Services & Pricing Administration

The Version 1 navigation item for pricing administration is **Services & Pricing**.

This area manages:

- Service Catalog
- Retainer Catalog
- Advisory Consulting Rates
- Complexity Factors
- Discounts
- Pricing Rules
- Future pricing-related administration

Navigation terminology should always be immediately understandable to a new consultant.

## Formal Application Architecture

The Cotarion Platform must use a layered application architecture.

### Presentation Layer

Responsible for:

- Pages
- Screens
- Forms
- Reusable UI components
- Client-facing previews

### Application Layer

Responsible for:

- Use cases
- Workflows
- Proposal lifecycle actions
- Agreement lifecycle actions
- Ownership and permissions coordination

### Domain Layer

Responsible for:

- Pricing rules
- Project calculations
- Complexity logic
- Retainer calculations
- Advisory Consulting rules
- AOP calculations
- Profit-share recommendations
- Hybrid Payment calculations
- Discount eligibility
- Proposal snapshot rules
- Historical integrity rules

### Infrastructure Layer

Responsible for:

- PostgreSQL
- Prisma
- Authentication provider integration
- File storage
- PDF rendering
- Email or external integrations added later

### Permanent Architecture Rules

- Business logic must not be embedded inside React pages or UI components.
- Pricing and calculation rules must be independently testable.
- UI components may display results but must not define core business calculations.
- Database access must not be scattered throughout presentation components.
- The domain layer should remain reusable by future web, mobile, API, or AI interfaces.
- External vendors and infrastructure services should be replaceable without rewriting core business rules.

## Design Foundation

The Cotarion Platform should not be hard-coded around the current Excel workbook or only around Cotarion Consulting Group's current service offerings. The legacy workbook at `reference/Cotarion_Pricing_Tool.xlsx` remains a reference for current pricing rules, formulas, content, and business logic.

The platform should be designed so Cotarion can later add:

- New modules
- New Cotarion groups
- New departments
- New service catalogs
- New pricing rules
- New proposal and agreement templates
- New billing models
- New reporting capabilities

without rebuilding the core platform.
