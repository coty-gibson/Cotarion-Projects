# User Experience Specification

## Product Naming

The overall product experience is for **Cotarion Platform**.

Version 1 exposes one module:

**Pricing & Proposals**

The user should experience Version 1 as a focused pricing, proposal, and agreement workspace inside the broader Cotarion Platform foundation.

## Platform Experience Direction

Cotarion Platform is not "Coty's personal tool." It is a Cotarion business platform that must support additional consultants, owners, departments, and Cotarion groups later.

The experience should personalize itself to the logged-in user while preserving company-level visibility for administrators.

Core UX concepts:

- My Workspace
- Company View
- Record ownership
- Reassignable ownership
- Proposal and agreement history
- Department-ready structure
- Future module-ready architecture

## Version 1 Navigation

Version 1 navigation should expose only the active Pricing & Proposals experience:

- Dashboard
- Clients
- Proposals
- Agreements
- Engagements
- Services & Pricing
- Templates
- Admin

During the Sprint 3 Clients foundation, **Dashboard** and **Clients** are active. Pricing, Proposals, Agreements, Engagements, Services & Pricing, Templates, and Admin remain visible for product orientation but are disabled and clearly labeled **Coming Soon** until their approved implementation sprints.

The interface should not expose future unfinished modules such as:

- Engagement Management
- Client Success
- KPI & Performance
- Operational Diagnostics
- Reporting & Analytics
- Department Management
- Financial Tools

Those modules may exist as future architectural concepts, but they should not appear in Version 1 navigation until they are actually built.

## Services & Pricing Navigation

The navigation item **Services & Pricing** should be used instead of **Catalog** because it is clearer to a new consultant.

This area is where authorized users manage:

- Service Catalog
- Retainer Catalog
- Advisory Consulting Rates
- Complexity Factors
- Discounts
- Pricing Rules
- Future pricing-related administration

## Dashboard Experience

The Version 1 dashboard is the entry point into **Pricing & Proposals**.

It should focus on useful work-in-progress information:

- My draft proposals
- Sent proposals awaiting outcome
- Agreements awaiting signature
- Recently updated clients
- Recently accepted work
- Quick actions for creating clients and proposals

It should not become an analytics, reporting, CRM, task-management, calendar, payment, or KPI dashboard in Version 1.

## My Workspace And Company View

**My Workspace** shows records owned by the logged-in user:

- My clients
- My proposals
- My agreements
- My engagement records

**Company View** is available to administrators and shows all Pricing & Proposals records across the company, with ownership clearly displayed.

Future department leaders should eventually be able to view their department's work, but Version 1 does not need to expose an unfinished Department View.

## Ownership Behavior

Each major record should have an assigned owner:

- Client
- Proposal
- Agreement
- Engagement

Ownership must be reassignable by authorized users if a consultant leaves, responsibilities change, or work needs to be transferred.

Reassignment should support:

- Reassigning the client only
- Reassigning open proposals
- Reassigning agreements
- Reassigning active engagement records
- Capturing a reassignment reason
- Preserving reassignment history

## Module Boundary

Version 1 should feel complete within its module boundary.

The user should not feel like they are navigating around missing sections of a larger system. The Cotarion Platform foundation should be present through naming, ownership, administration, and data structure, while the visible product experience remains focused on Pricing & Proposals.
