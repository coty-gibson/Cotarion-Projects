# Cotarion Platform Implementation Plan

## Scope

**Application:** Cotarion Platform  
**Version 1 Module:** Pricing & Proposals  
**Status:** Approved planning artifacts complete. Implementation not started.

This plan defines the safest, most maintainable development sequence for Version 1. It prioritizes stable foundations, independently testable modules, and usable software at the end of each sprint.

Each sprint is intended to represent approximately one to two weeks of work for a professional software engineer.

## Development Sequence

### Sprint 1: Project Foundation

**Objective:** Create the application scaffold and establish the technical foundation.

**Business Value:** Provides a stable base for all future development and prevents inconsistent structure from forming early.

**Features Included:**

- Next.js, React, TypeScript project setup
- shadcn/ui and Tailwind setup
- Basic layered folder structure
- Formatting and linting
- Basic test framework setup with Vitest
- Basic Playwright setup
- Documentation links from project README
- Initial placeholder shell page

**Dependencies:** Approved technology stack.

**Acceptance Criteria:**

- Application runs locally.
- Test command runs successfully.
- Lint/typecheck command runs successfully.
- Folder structure reflects Presentation, Application, Domain, and Infrastructure layers.
- No business functionality is implemented yet.

**Risks:** Overbuilding folder structure before real modules exist.

**Complexity:** Medium

**Deferred:** Authentication, database schema, pricing logic, proposal UI.

### Sprint 2: Authentication And User Foundation

**Objective:** Implement secure sign-in foundation and user identity model.

**Business Value:** Enables owner-based workspaces, future consultants, and secure access.

**Features Included:**

- Auth.js setup
- Microsoft sign-in
- Google sign-in
- Secure email/password sign-in using approved provider/session patterns
- User profile record in PostgreSQL
- Basic session handling
- Protected app shell

**Dependencies:** Sprint 1, managed PostgreSQL connection decision for development.

**Acceptance Criteria:**

- User can sign in and sign out.
- Authenticated routes are protected.
- Signed-in user maps to application user record.
- No custom password-security logic is hand-built.

**Risks:** Auth.js credentials flow must be implemented safely and not drift into custom security logic.

**Complexity:** Large

**Deferred:** Full user admin, invitation workflow, MFA, password reset customization.

### Sprint 3: Roles, Ownership, And Navigation Shell

**Objective:** Establish platform navigation, My Workspace, Company View foundations, and authorization primitives.

**Business Value:** Prevents the application from becoming a single-user tool and supports future consultant growth.

**Features Included:**

- Navigation shell for Pricing & Proposals
- My Workspace / Company View switch
- Role model: Administrator, Consultant, Read-only foundation
- Record ownership primitives
- Basic permission checks
- Empty Dashboard shell

**Dependencies:** Sprint 2.

**Acceptance Criteria:**

- Navigation exposes only Version 1 module areas.
- My Workspace and Company View are visible according to role.
- Authorization checks are centralized outside UI components.
- Owner field pattern is established.

**Risks:** Permission model can become too complex too early.

**Complexity:** Medium

**Deferred:** Department leader role, full user management, advanced approval workflow.

### Sprint 4: Client Management

**Objective:** Build reusable client and contact records.

**Business Value:** Establishes the business record foundation for proposals, agreements, documents, and engagements.

**Features Included:**

- Client list
- Client creation
- Client detail
- Basic contact records
- Owner assignment
- Duplicate client warning
- Client notes field

**Dependencies:** Sprint 3.

**Acceptance Criteria:**

- User can create, view, edit, and archive clients.
- Client records have owners.
- Client detail shows empty states for proposals, agreements, and engagements.
- Company View shows owner on client records.

**Risks:** Scope creep into CRM features.

**Complexity:** Medium

**Deferred:** CRM automation, client portal, document management, contact history.

### Sprint 5: Services & Pricing Administration Foundation

**Objective:** Build administrative configuration for services and core pricing records.

**Business Value:** Enables configuration over code and prevents hard-coded service/pricing data.

**Features Included:**

- Services & Pricing navigation area
- Service categories
- Service catalog items
- Internal and client-facing service names
- Base price
- Default descriptions and deliverables
- Active/inactive state
- Retainer levels and base prices
- Advisory hourly rate

**Dependencies:** Sprint 3.

**Acceptance Criteria:**

- Admin can manage service catalog records.
- Admin can manage retainer levels.
- Admin can manage advisory hourly rate.
- Pricing records are associated with Cotarion Consulting Group foundation.
- No proposal logic depends on hard-coded services.

**Risks:** Admin UI can become too broad.

**Complexity:** Large

**Deferred:** Bulk import, advanced catalog versioning UI, multiple Cotarion group UI.

### Sprint 6A: Core Pricing Engine

**Objective:** Build the core pricing domain before any proposal workflow depends on it.

**Business Value:** Validates the core value-based pricing foundation before user-facing proposal workflows depend on it.

**Features Included:**

- Project line total calculation
- Project subtotal calculation
- Project calculations
- Retainer calculations
- Advisory Consulting calculations
- Advisory 30-minute increment enforcement
- Term discount calculation
- Domain-layer implementation only
- Comprehensive unit tests
- Pricing Validation Matrix for core pricing scenarios

**Dependencies:** Sprint 5.

**Acceptance Criteria:**

- Pricing logic is in the Domain Layer.
- UI does not define pricing calculations.
- Unit tests pass.
- Manual comparison against the approved Excel workbook at `reference/Cotarion_Pricing_Tool.xlsx` confirms matching calculations.
- Advisory Consulting cannot use non-30-minute increments.
- Project pricing contains no hourly billing model.
- Proposal Builder and UI workflows are not included.

**Risks:** Manual Excel comparison may reveal workbook ambiguities that require documented intentional differences.

**Complexity:** Medium

**Deferred:** Proposal Builder, UI workflows, complexity, discounts, profit-share, Hybrid Payment.

### Sprint 6B: Advanced Pricing Engine

**Objective:** Complete the remaining business rules after the core pricing engine is validated.

**Business Value:** Covers the most business-critical pricing rules from the approved requirements.

**Features Included:**

- Complexity calculations
- Standard / No Added Complexity option
- Standard complexity handling
- Combined project complexity multiplier
- Retainer complexity compatibility logic
- Discount eligibility
- Standard discount eligibility
- Non-stacking client discount rule
- AOP calculations
- AOP average
- Profit-share recommendation
- Hybrid Payment recommendation
- Rounding to nearest 0.5%
- Validation rules
- Domain-layer implementation only
- Comprehensive unit tests
- Pricing Validation Matrix for advanced pricing scenarios

**Dependencies:** Sprint 6A.

**Acceptance Criteria:**

- All advanced calculations remain inside the Domain Layer.
- All calculations are independently tested.
- Unit tests pass.
- Manual comparison against the approved Excel workbook at `reference/Cotarion_Pricing_Tool.xlsx` confirms matching calculations.
- Complexity cannot be directly overridden.
- Standard discounts cannot stack.
- Term discounts remain separate from client discounts.
- Profit-share and Hybrid Payment overrides require note-ready validation.
- No proposal workflow is required for pricing validation.

**Risks:** This sprint may be large due to calculation breadth.

**Complexity:** Large

**Deferred:** Proposal UI integration, approval workflow, caps/floors unless explicitly configured.

### Sprint 7: Proposal Builder Foundation

**Objective:** Create proposals, proposal options, and draft workflow.

**Business Value:** Produces the first usable proposal-building experience.

**Features Included:**

- Create proposal from client
- Proposal setup fields
- Engagement type selection
- Proposal owner
- Proposal status: Draft
- Proposal option creation
- Autosave draft behavior
- Basic proposal builder navigation

**Dependencies:** Sprints 4, 6A.

**Acceptance Criteria:**

- User can create a proposal from a client.
- User can add at least one proposal option.
- Autosave preserves draft work.
- Builder shows only relevant sections for selected engagement type.
- Proposal remains editable while Draft.

**Risks:** Autosave and versioning boundaries must be clear.

**Complexity:** Large

**Deferred:** PDF generation, agreement generation, finalized snapshots.

### Sprint 8: Project, Retainer, And Advisory Proposal Configuration

**Objective:** Connect proposal options to project services, retainer settings, and advisory consulting.

**Business Value:** Enables realistic pricing proposals across the main engagement types.

**Features Included:**

- Add catalog services to proposal option
- Add custom service
- Edit client-facing name and description per proposal
- Quantity and price override with reason
- Retainer level and term selection
- Retainer client-facing scope customization
- Advisory duration and fee calculation

**Dependencies:** Sprints 5, 6A, 7.

**Acceptance Criteria:**

- Project proposals can calculate subtotal.
- Retainer-only proposals include client-facing support description.
- Advisory proposals enforce 30-minute increments.
- Price overrides require internal reason.
- Client-facing text is separate from internal catalog names.

**Risks:** Proposal builder could become cluttered if not guided.

**Complexity:** Large

**Deferred:** Proposal PDF, agreement PDF, full template admin.

### Sprint 9: Complexity, Discounts, And AOP In Proposal Builder

**Objective:** Integrate advanced pricing rules into the proposal workflow.

**Business Value:** Allows full internal pricing review for project, retainer, hybrid, and profit-share proposals.

**Features Included:**

- Complexity selection UI
- Complexity breakdown display
- Discount application UI
- AOP entry
- Profit-share recommendation display
- Hybrid Payment recommendation display
- Override note validation
- Internal pricing review screen

**Dependencies:** Sprints 6B, 8.

**Acceptance Criteria:**

- Project proposals require complexity selections.
- Standard/no-added complexity displays 1.00x and $0 adjustment.
- Internal review shows how every total was reached.
- Profit-share recommendations are explainable.
- Invalid or incomplete pricing blocks preview readiness.

**Risks:** Large interaction surface and many validation states.

**Complexity:** Large

**Deferred:** Approval workflow, advanced margin alerts, client-facing interactive explanations.

### Sprint 10: Templates And Client Proposal Preview

**Objective:** Add managed proposal language and client-facing preview.

**Business Value:** Ensures proposals explain what the client receives and align with Cotarion branding.

**Features Included:**

- Basic proposal template records
- Retainer scope template records
- Advisory template language
- Client-facing proposal preview
- Internal notes hidden from preview
- Custom legal language flag foundation for later agreement work

**Dependencies:** Sprints 8, 9.

**Acceptance Criteria:**

- Preview displays proposal option scope, deliverables, pricing summary, and assumptions.
- Retainer-only proposal clearly explains provided support.
- Internal notes do not appear in client preview.
- Template edits affect future drafts only.

**Risks:** Template system can become too flexible too early.

**Complexity:** Medium

**Deferred:** Multiple PDF layout templates, rich clause library, Word export.

### Sprint 11: Proposal Versioning And Historical Snapshots

**Objective:** Preserve proposal versions and immutable pricing/template snapshots.

**Business Value:** Protects historical accuracy and supports revisions without overwriting prior work.

**Features Included:**

- Save named proposal version
- Snapshot services, prices, pricing rules, templates, and calculated results
- Version history view
- Create revision from sent proposal
- Lock finalized proposal version

**Dependencies:** Sprints 7-10.

**Acceptance Criteria:**

- Saving a version creates immutable snapshot data.
- Revisions create new versions.
- Finalized versions cannot be silently changed.
- Version history shows owner, timestamp, status, and notes.

**Risks:** Snapshot design must be carefully modeled to avoid later migration pain.

**Complexity:** Large

**Deferred:** Diff viewer between versions, client-facing version portal.

### Sprint 12: Document Storage And Proposal PDF Generation

**Objective:** Generate and permanently store proposal PDFs.

**Business Value:** Delivers the core client-facing artifact for Version 1.

**Features Included:**

- HTML/CSS PDF rendering path
- Proposal PDF generation from saved version
- Object storage abstraction
- Permanent document record
- Document association with client, proposal, version, and option(s)
- Basic download/view behavior

**Dependencies:** Sprints 10, 11.

**Acceptance Criteria:**

- User can generate PDF from saved proposal version.
- Generated PDF is stored permanently.
- Regeneration creates a new document record or version.
- Document is linked to correct business records.
- PDF output visually matches approved preview closely.

**Risks:** Playwright/Chromium behavior in deployment may require adjustment.

**Complexity:** Large

**Deferred:** Word export, email sending, e-signature.

### Sprint 13: Agreement Generation

**Objective:** Generate agreement drafts from accepted proposal option(s).

**Business Value:** Converts accepted proposal work into contract-ready documentation.

**Features Included:**

- Mark proposal option(s) accepted
- Agreement draft record
- Agreement template basics
- Payment terms population
- Retainer/profit-share terms population
- Custom legal language flag
- Agreement PDF generation and storage

**Dependencies:** Sprints 11, 12.

**Acceptance Criteria:**

- Agreement can be generated only from accepted option(s).
- Multiple accepted options can be combined.
- Agreement PDF is stored permanently.
- Legal language modifications flag Custom Legal Language.
- Agreement links to client, proposal, option(s), and document records.

**Risks:** Agreement content must not drift into unauthorized legal complexity.

**Complexity:** Large

**Deferred:** E-signature, Word export, legal review workflow.

### Sprint 14: Signed Agreement And Engagement Creation

**Objective:** Record signed agreements and automatically create active engagement records.

**Business Value:** Completes the proposal-to-engagement lifecycle foundation.

**Features Included:**

- Upload signed agreement
- Permanent signed document storage
- Mark agreement signed
- Lock signed agreement
- Auto-create Engagement record
- Basic engagement detail page

**Dependencies:** Sprint 13.

**Acceptance Criteria:**

- Signed agreement upload is stored permanently.
- Signed agreement is linked to correct client, proposal, agreement, and engagement.
- Marking agreement signed automatically creates engagement.
- Engagement owner defaults correctly.
- Engagement record is intentionally simple.

**Risks:** Scope creep into Engagement Management module.

**Complexity:** Medium

**Deferred:** Meetings, milestones, deliverables, renewals, engagement task management.

### Sprint 15: Audit History And Reassignment

**Objective:** Track sensitive changes and support ownership reassignment.

**Business Value:** Supports governance, future consultants, and administrative continuity.

**Features Included:**

- Audit event model
- Audit events for price overrides, legal language edits, status changes, ownership changes
- Reassign client and related active work
- Reassignment reason
- Basic audit history display

**Dependencies:** Sprints 3, 4, 7, 13, 14.

**Acceptance Criteria:**

- Admin can reassign ownership with reason.
- Audit history captures sensitive changes.
- Reassignment can include client, open proposals, agreements, and active engagements.
- Audit records are not editable through normal UI.

**Risks:** Audit model can expand quickly if every minor field edit is tracked.

**Complexity:** Medium

**Deferred:** Full compliance audit dashboard, external audit export.

### Sprint 16: Dashboard And Administration Polish

**Objective:** Make Version 1 coherent and efficient for daily use.

**Business Value:** Helps users resume work quickly without overbuilding analytics.

**Features Included:**

- My Workspace dashboard cards
- Company View dashboard for admins
- Draft proposals
- Sent proposals awaiting outcome
- Agreements awaiting signature
- Recently updated clients
- Admin settings polish
- Empty states and success states

**Dependencies:** Sprints 3, 4, 7, 13, 14.

**Acceptance Criteria:**

- Dashboard shows useful work-in-progress records.
- Admin can switch to Company View.
- Dashboard does not expose unfinished future modules.
- Empty states guide useful next actions.

**Risks:** Dashboard scope creep into reporting/analytics.

**Complexity:** Medium

**Deferred:** KPI dashboards, revenue forecasting, charts, analytics.

### Sprint 17: Hardening, Performance, And Production Readiness

**Objective:** Prepare Version 1 for reliable production use.

**Business Value:** Reduces launch risk and confirms the system is maintainable.

**Features Included:**

- End-to-end workflow tests
- Authorization review
- Validation review
- PDF rendering deployment verification
- Basic performance checks
- Error-state review
- Backup and recovery verification with selected providers
- Production environment configuration checklist
- Release notes

**Dependencies:** All prior sprints.

**Acceptance Criteria:**

- Core workflows pass manual and automated verification.
- No known critical authorization gaps.
- No secrets committed to source control.
- PDF generation works in deployment environment.
- Backup/recovery approach is documented.
- Version 1 release candidate is reviewable.

**Risks:** Late discovery of PDF/runtime/provider constraints.

**Complexity:** Large

**Deferred:** Advanced observability, formal security audit, SOC2-style controls.

## Sprints That May Need Splitting

- **Sprint 6B: Advanced Pricing Engine** may need to split into:
  - Complexity and discounts
  - AOP, profit-share, and Hybrid Payment

- **Sprint 9: Project, Retainer, And Advisory Proposal Configuration** may need to split into:
  - Project services in proposals
  - Retainer and Advisory configuration

- **Sprint 10: Complexity, Discounts, And AOP In Proposal Builder** may need to split because it combines several complex UI and validation paths.

- **Sprint 13: Document Storage And Proposal PDF Generation** may need to split if deployment PDF rendering introduces infrastructure issues.

- **Sprint 14: Agreement Generation** may need to split if agreement templates require more content work than expected.

## Dependency Risk Review

Potential risks:

- Authentication depends on a development PostgreSQL provider decision. This should be resolved before Sprint 2.
- Object storage provider is deferred, but Sprint 13 cannot start without a provider selected for development/testing.
- PDF rendering can reveal deployment constraints late. A minimal PDF proof should be done early in Sprint 13 or as a spike before it.
- Snapshot modeling in Sprint 12 is foundational for documents and agreements. It should not be rushed.
- Template administration could expand too much before proposal workflows prove the minimum template model.

## Pricing Validation Matrix Requirement

Every pricing-related sprint must include a Pricing Validation Matrix comparing the Cotarion Platform against the approved Excel workbook at `reference/Cotarion_Pricing_Tool.xlsx`.

Representative scenarios should cover:

- Project pricing
- Retainer pricing
- Advisory Consulting
- Complexity
- Discounts
- Profit Share
- Hybrid Payment
- Invalid inputs
- Boundary conditions

Each scenario should include:

- Scenario Name
- Workbook Result
- Platform Result
- Match: Yes or No
- Notes

A pricing-related sprint cannot be considered complete until all required scenarios match or any approved intentional differences are documented.

## Recommended Sprint Order Improvements

The proposed order is generally safe because it builds foundations first:

1. Foundation
2. Auth/users
3. Roles/navigation/ownership
4. Clients
5. Services & Pricing
6. Pricing engine
7. Advanced pricing logic
8. Proposal builder

Recommended refinements:

- Keep Sprint 6 and Sprint 7 strongly domain/test focused before major UI integration.
- Do a lightweight PDF feasibility spike before or at the start of Sprint 13.
- Keep dashboard polish late so it reflects real records instead of imagined metrics.
- Keep engagement features minimal until proposal/agreement flow is complete.

## Ideal Sprint 1

The ideal Sprint 1 is **Project Foundation**.

It should only create:

- Application scaffold
- Tooling
- Layered folder structure
- Test setup
- Lint/typecheck setup
- Minimal shell page
- Documentation references

It should not implement authentication, database schema, proposal logic, pricing logic, or real UI workflows.

This keeps the first sprint small, reviewable, and aligned with the Development Charter.

## Do Not Build Until Later Versions

Do not build these in Version 1 unless requirements are explicitly reopened:

- Full CRM automation
- Client portal
- Calendar or scheduling
- Task management
- Email sending from the app
- Payment collection
- Invoice generation
- E-signature integration
- Word export
- Advanced analytics dashboards
- KPI & Performance module
- Operational Diagnostics module
- Full Engagement Management module
- Department Management module UI
- Multi-brand theme editor
- AI proposal generation
- Automated financial report ingestion
- Margin modeling beyond approved pricing review
- Approval chains beyond flags/foundations
- Mobile-first proposal building

## Implementation Plan Status

This implementation plan is ready for review. No application code, scaffold, source files, or project configuration files have been created.
