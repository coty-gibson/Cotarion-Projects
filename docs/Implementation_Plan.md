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

### Sprint 2A: Authentication Foundation

**Objective:** Prove the secure authentication architecture and application user-profile mapping without allowing external OAuth configuration to block development.

**Business Value:** Establishes secure access, durable session handling, and the application-owned user identity foundation needed before workspace, ownership, proposal, and client records are introduced.

**Recommended Development PostgreSQL Option:** Neon is recommended for local/development managed PostgreSQL because it provides serverless managed Postgres, a free plan, connection strings that work with Prisma, and database branching that is useful for development workflows. The application must still use only standards-compliant PostgreSQL and Prisma-supported behavior so the provider remains replaceable.

**Features Included:**

- Managed PostgreSQL development database connection
- Prisma setup and migrations
- Auth.js foundation
- Secure session handling
- Protected application routes
- Unauthenticated redirect to the sign-in screen
- Application-owned user profile record linked to the authenticated identity
- Sign-in and sign-out flow
- Temporary development-only authentication method that is clearly isolated and cannot be enabled in production accidentally
- Unit and integration tests for user-profile mapping and session helpers
- Playwright coverage for protected-route behavior and the development sign-in flow
- Existing Sprint 1 checks remain green

**Dependencies:** Sprint 1; Neon development database or another standards-compliant managed PostgreSQL database connection string.

**Do Not Include:**

- Microsoft OAuth
- Google OAuth
- Email/password authentication
- Password storage
- Password reset
- MFA
- User administration
- Invitations
- Roles beyond the minimum structure needed for the current authenticated user
- My Workspace / Company View
- Client, proposal, pricing, agreement, or engagement functionality

**Temporary Development Authentication Method:**

- Use an Auth.js development-only provider/path that creates a deterministic non-production authenticated identity, such as `dev-owner@cotarion.local`, without accepting or storing a password.
- Enable it only when `NODE_ENV === "development"` and an explicit development flag such as `ENABLE_DEV_AUTH=true` is present.
- Fail closed if the development provider is configured in production, preview, CI production-like builds, or any environment where `NODE_ENV !== "development"`.
- Keep all development-auth files and environment variables clearly named with `dev` and exclude the provider from the production Auth.js provider list.
- Treat the development identity like any other authenticated identity after sign-in so user-profile mapping, sessions, route protection, and sign-out are tested through the real application path.

**Database Records And Relationships Required:**

- Auth.js adapter tables for users, accounts, sessions, and verification tokens as required by the selected Auth.js Prisma adapter.
- Company table with a seeded Version 1 company record for Cotarion Consulting Group.
- Application-owned `ApplicationUser` profile table.
- `ApplicationUser` has a required one-to-one relationship to the Auth.js user identity.
- `ApplicationUser` belongs to exactly one `Company`.
- `ApplicationUser` stores application concerns such as display name, active status, created timestamp, updated timestamp, and the minimum current-user role/status structure needed by later authorization work.
- No password hashes, reset tokens, MFA secrets, or provider-specific PostgreSQL objects are created.

**Expected Files Created Or Modified In Implementation:**

- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/infrastructure/auth/**`
- `src/infrastructure/database/**`
- `src/application/users/**`
- `src/application/companies/**`
- `src/application/session/**`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/sign-in/page.tsx`
- `src/app/sign-out/route.ts`
- `src/app/(protected)/layout.tsx`
- `src/app/(protected)/page.tsx`
- Existing shell routes/pages as needed to move authenticated content under the protected route group
- `src/middleware.ts` if route-level middleware is chosen for protection
- `src/test/**` or colocated unit/integration test files for session helpers and user-profile mapping
- `tests/e2e/**` Playwright tests for protected-route redirects and development sign-in
- `README.md` only for environment setup notes if needed

**Testing Strategy:**

- Unit tests verify session helper behavior, production guard behavior, and no-session behavior.
- Integration tests verify authenticated identity to `ApplicationUser` mapping, idempotent profile creation, and existing profile lookup.
- Integration tests verify the mapped `ApplicationUser` is assigned to the single Version 1 company, Cotarion Consulting Group.
- Integration tests use the managed development PostgreSQL database or a dedicated test database/schema configured through environment variables.
- Playwright tests verify unauthenticated protected routes redirect to sign-in, development sign-in reaches the protected app, and sign-out returns the user to unauthenticated behavior.
- Existing Sprint 1 lint, typecheck, unit, and Playwright smoke checks must remain green.

**Risks And Safeguards:**

- Risk: Development sign-in leaks into production. Safeguard: explicit environment flag, `NODE_ENV` check, production startup failure if enabled, and tests covering the guard.
- Risk: Auth.js provider records are mistaken for application users. Safeguard: keep `ApplicationUser` in the Application Layer and require mapping through a dedicated workflow/helper.
- Risk: Authorization logic drifts into React components. Safeguard: route protection and session/current-user helpers live outside UI components.
- Risk: Database choice creates lock-in. Safeguard: no provider-specific PostgreSQL features; Prisma migrations remain portable.
- Risk: OAuth configuration delays authentication architecture. Safeguard: defer external OAuth to Sprint 2B.

**Acceptance Criteria:**

- The app connects to a managed PostgreSQL development database through Prisma.
- Prisma migrations create Auth.js persistence and application user-profile records.
- Auth.js is configured with secure session handling.
- Protected application routes require authentication.
- Unauthenticated users are redirected to the sign-in screen.
- A signed-in identity maps to exactly one application-owned user profile.
- Each application user belongs to exactly one company, seeded as Cotarion Consulting Group for Version 1.
- No company administration, switching, invitations, or management UI is exposed.
- The development-only sign-in flow works in development without passwords or external OAuth.
- The development-only sign-in method cannot be enabled outside development accidentally.
- Users can sign in and sign out.
- Unit, integration, and Playwright tests cover the authentication foundation.
- Sprint 1 checks remain green.

**Complexity:** Medium

**Deferred:** Microsoft OAuth, Google OAuth, email/password authentication, password storage, password reset, MFA, full user administration, invitations, role management, My Workspace, Company View, and business record functionality.

### Sprint 2B: Microsoft Authentication

**Objective:** Add Microsoft Entra ID / Microsoft 365 sign-in through Auth.js after the authentication architecture and user-profile mapping have been proven.

**Business Value:** Enables Cotarion's expected Microsoft 365 identity flow without blocking Sprint 2A on external OAuth tenant and callback configuration.

**Features Included:**

- Microsoft Entra ID / Microsoft 365 sign-in through Auth.js
- Secure OAuth callback configuration
- Mapping Microsoft identities to existing application user profiles
- Manual and automated verification where practical
- Removal or continued strict isolation of the development-only sign-in path

**Dependencies:** Sprint 2A; Microsoft Entra ID app registration; approved callback URLs for local, preview, and production environments.

**Do Not Include:**

- Google sign-in
- Email/password authentication
- Password storage
- Password reset
- MFA
- User administration
- Invitations
- Client, proposal, pricing, agreement, or engagement functionality

**Acceptance Criteria:**

- User can sign in and sign out with Microsoft 365.
- Microsoft OAuth callback configuration is documented for each environment.
- Microsoft-authenticated users map to the correct existing `ApplicationUser` record.
- Development-only sign-in remains blocked outside development or is removed if no longer needed.
- Existing Sprint 2A tests remain green, with Microsoft-specific automated coverage where practical.

**Risks:** OAuth tenant configuration, callback URL mismatch, and identity matching rules must be handled carefully to avoid duplicate application profiles.

**Complexity:** Medium

**Deferred:** Google sign-in until demonstrated business need; email/password authentication unless explicitly reopened by the Product Owner.

### Sprint 3: Clients Foundation

**Objective:** Deliver the first usable Clients module using the existing authentication, company isolation, protected routes, `ApplicationUser` ownership, and layered architecture.

**Business Value:** Establishes the first durable business records without introducing unrelated modules or a premature CRM.

**Features Included:**

- Clients-focused dashboard with client count, recent clients, and first-client empty state
- Client list, creation, detail, and editing
- Immutable sequential client IDs in `CLI-######` format
- Prospect, Active Client, and Inactive statuses
- Optional controlled industry, logo/image URL, website, and one business address
- Optional primary contact
- Expanded relationship and meeting notes
- Company-scoped search by client name, website, contact name, email, and phone
- Status filtering
- Duplicate normalized-name warning with explicit override
- Current user as default owner
- Dashboard and Clients as active navigation
- Pricing, Proposals, Agreements, Engagements, Services & Pricing, Templates, and Admin visible but disabled with a Coming Soon indicator

**Dependencies:** Version 0.2 Authentication.

**Acceptance Criteria:**

- Authenticated active users can create, view, edit, search, and filter company clients.
- All client reads and writes enforce company isolation outside presentation components.
- Client IDs are generated automatically, remain immutable, and are safe under concurrent creation.
- The dashboard presents useful client information and an actionable empty state.
- Existing authentication and protected-route behavior remains intact.
- Automated validation, repository integration, and end-to-end client workflows pass.

**Risks:** Scope creep into CRM activity tracking, broader authorization, or future business modules.

**Complexity:** Medium

**Deferred:** Pricing, proposals, agreements, engagements, document generation, lead tracking, imports, broader role management, user deletion, permanent client deletion, CRM automation, client portal, multiple-contact management, and contact history.

The former standalone Sprint 4 Client Management scope is incorporated into Sprint 3. Future sprint numbering and the previously proposed roles/navigation work must be replanned after Sprint 3 approval.

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

- Authentication depends on a development PostgreSQL provider decision. Neon is recommended for Sprint 2A, while the schema must remain standards-compliant and provider-portable.
- Microsoft OAuth depends on Microsoft Entra ID app registration and callback URL configuration. This is intentionally deferred to Sprint 2B so Sprint 2A can prove the auth architecture without external OAuth blocking progress.
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
2. Auth foundation and application user mapping
3. Microsoft authentication
4. Roles/navigation/ownership
5. Clients
6. Services & Pricing
7. Pricing engine
8. Advanced pricing logic
9. Proposal builder

Recommended refinements:

- Keep Sprint 6 and Sprint 7 strongly domain/test focused before major UI integration.
- Keep Sprint 2A free of external OAuth so authentication architecture can be validated independently.
- Keep Google sign-in deferred until there is a demonstrated business need.
- Keep email/password authentication out of Version 1 unless the Product Owner explicitly reopens the decision.
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
