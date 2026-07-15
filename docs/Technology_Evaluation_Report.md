# Technology Evaluation Report

## Project Context

**Application:** Cotarion Platform  
**Version 1 Module:** Pricing & Proposals  
**Sprint:** Sprint 0  
**Purpose:** Evaluate technology options before any code, scaffold, or project files are created.

This report evaluates technologies against the approved Functional Design Specification, User Experience Specification, and Development Charter.

This report records the approved Version 1 technology direction.

## Platform Requirements

The Cotarion Platform should support:

- Cotarion Consulting Group initially
- Multiple future Cotarion groups
- Multiple consultants
- Web-based access
- Professional UI
- Strong maintainability
- Good performance
- Secure authentication
- Role and ownership behavior
- PDF generation
- Proposal and agreement version history
- Administrative configuration
- Long-term expansion into additional platform modules

## Evaluation Sources

Official documentation reviewed:

- Next.js docs: https://nextjs.org/docs
- React docs: https://react.dev/
- PostgreSQL docs: https://www.postgresql.org/about/
- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Prisma docs: https://www.prisma.io/docs
- Drizzle docs: https://orm.drizzle.team/docs/overview
- Clerk docs: https://clerk.com/docs
- Auth.js docs: https://authjs.dev/
- Auth0 docs: https://auth0.com/docs
- Playwright PDF API docs: https://playwright.dev/docs/api/class-page#page-pdf
- Vercel docs: https://vercel.com/docs
- shadcn/ui docs: https://ui.shadcn.com/docs

## 1. Frontend Evaluation

### Options Considered

- Next.js with React
- React with Vite
- Remix / React Router Framework
- SvelteKit
- Vue / Nuxt
- Angular

### Recommended Option

**Next.js with React and TypeScript**

### Advantages

- Full-stack React framework suitable for authenticated business applications.
- Strong routing, layouts, forms, server rendering, and deployment ecosystem.
- Supports modular product growth well.
- Large hiring and support ecosystem.
- Good fit for professional dashboard-style applications.
- Works well with server-side authorization and data fetching.
- React component model fits reusable screens, forms, builders, and admin interfaces.

### Disadvantages

- More framework complexity than a simple React/Vite app.
- App Router patterns require discipline.
- Can become over-engineered if every feature uses advanced framework capabilities.
- Requires careful separation of domain logic from UI code.

### Long-Term Scalability

Strong. Next.js supports growth from a small Version 1 module into a larger platform with multiple modules, shared layouts, protected routes, server-side rendering, and API endpoints.

### Learning Curve

Moderate. React knowledge is common, but Next.js App Router, server/client components, and data mutation patterns need deliberate conventions.

### Development Speed

High once conventions are established. It provides enough structure to move quickly without separately assembling routing, build tooling, and backend-for-frontend patterns.

### Cost Considerations

The framework is open source. Hosting costs depend on deployment provider and usage.

### Fit For Cotarion Platform

Excellent. It supports the professional, guided, multi-screen workflow required for Pricing & Proposals while preserving future module expansion.

## 2. UI Component And Styling Evaluation

### Options Considered

- shadcn/ui with Tailwind CSS
- Tailwind CSS with custom components
- Material UI
- Chakra UI
- Ant Design
- Radix UI directly

### Recommended Option

**shadcn/ui with Tailwind CSS**

### Advantages

- Produces modern, professional interfaces without looking like a generic enterprise template.
- Components are owned in the codebase rather than locked behind a black-box package.
- Built on accessible primitives.
- Strong fit for forms, dialogs, tables, tabs, navigation, and admin screens.
- Easy to customize for Cotarion branding.

### Disadvantages

- Requires design discipline; it is not a complete design system by itself.
- Component updates are not automatic like a traditional package.
- Tailwind usage must be kept organized to avoid noisy components.

### Long-Term Scalability

Strong if a Cotarion design system layer is established early.

### Learning Curve

Moderate. Tailwind and component composition are approachable, but visual consistency requires clear patterns.

### Development Speed

High for Version 1 business screens.

### Cost Considerations

Open source. No direct licensing cost.

### Fit For Cotarion Platform

Strong. It supports the UXS goal of a clean, modern, serious consulting platform without forcing a generic accounting or CRM look.

## 3. Application Architecture Evaluation

### Recommended Option

**Layered application architecture: Presentation, Application, Domain, and Infrastructure**

### Required Layers

**Presentation Layer**

- Pages
- Screens
- Forms
- Reusable UI components
- Client-facing previews

**Application Layer**

- Use cases
- Workflows
- Proposal lifecycle actions
- Agreement lifecycle actions
- Ownership and permissions coordination

**Domain Layer**

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

**Infrastructure Layer**

- PostgreSQL
- Prisma
- Authentication provider integration
- File storage
- PDF rendering
- Email or external integrations added later

### Permanent Rules

- Business logic must not be embedded inside React pages or UI components.
- Pricing and calculation rules must be independently testable.
- UI components may display results but must not define core business calculations.
- Database access must not be scattered throughout presentation components.
- The domain layer should remain reusable by future web, mobile, API, or AI interfaces.
- External vendors and infrastructure services should be replaceable without rewriting core business rules.

### Advantages

- Protects Cotarion's business rules from framework churn.
- Keeps pricing logic testable and explainable.
- Supports future modules without turning the codebase into page-specific scripts.
- Makes vendor replacement more realistic because integrations are isolated in infrastructure.

### Disadvantages

- Requires discipline and clear folder conventions.
- Adds some up-front structure compared with a page-first implementation.
- Developers must avoid over-abstracting simple workflows.

### Long-Term Scalability

Excellent. This structure directly supports the Cotarion Platform's long-term module growth.

### Learning Curve

Moderate. The concept is straightforward, but consistency matters.

### Development Speed

Moderate at the beginning, faster over time as repeatable patterns emerge.

### Cost Considerations

No direct licensing cost. The cost is developer discipline and initial architecture setup.

### Fit For Cotarion Platform

Excellent. The approved FDS and Development Charter require transparent, maintainable, independently testable business logic.

## 4. Backend Evaluation

### Options Considered

- Next.js server actions and route handlers
- Separate Node.js API service
- NestJS backend
- Django / Python backend
- Ruby on Rails
- .NET backend

### Recommended Option

**Next.js backend-for-frontend with server-side domain modules**

### Advantages

- Keeps Version 1 simpler by avoiding a separate backend service.
- Good fit for a small-to-medium internal business platform.
- Allows server-side validation, authorization, and database access.
- Reduces deployment complexity.
- Supports future extraction into separate services if needed.

### Disadvantages

- Requires discipline to avoid mixing UI and business logic.
- Heavy background jobs or complex integrations may eventually require separate services.
- Long-running PDF generation or document workflows may need worker architecture later.

### Long-Term Scalability

Good for the expected early and mid-stage platform. If future modules require intensive background processing, the architecture can add workers or separate services later.

### Learning Curve

Moderate.

### Development Speed

High, especially for Version 1.

### Cost Considerations

Lower operational cost than managing separate frontend and backend services.

### Fit For Cotarion Platform

Strong. It satisfies the Development Charter principle of Simple Before Powerful while preserving future growth.

## 5. Database Evaluation

### Options Considered

- PostgreSQL
- MySQL
- SQLite
- Firebase / Firestore
- MongoDB
- Airtable-like database

### Approved Option

**Managed PostgreSQL with standards-based database access**

### Advantages

- Mature relational database with strong data integrity.
- Excellent fit for clients, proposals, versions, options, agreements, owners, departments, templates, and snapshots.
- Strong support for transactions, constraints, indexes, JSON fields, and row-level security.
- Good long-term portability across hosting providers.
- Proven fit for business systems that need auditability and historical accuracy.
- Keeps the permanent architecture independent of a specific managed database provider.

### Disadvantages

- Requires schema design discipline.
- More setup than a document database.
- Schema migrations must be managed carefully.

### Long-Term Scalability

Excellent. PostgreSQL is appropriate for many years of growth and complex relational records.

### Learning Curve

Moderate. Relational modeling requires care, but the data in this platform is naturally relational.

### Development Speed

Moderate to high once schema conventions are established.

### Cost Considerations

Open source. Managed hosting cost depends on provider and scale.

### Fit For Cotarion Platform

Excellent. Historical snapshots, proposals, agreements, ownership, and configurable pricing rules need relational integrity.

### Provider Decision

The specific managed PostgreSQL provider is deferred as a deployment decision. Supabase, Neon, AWS RDS, Render, Railway, Vercel marketplace options, and other managed PostgreSQL providers may be evaluated later based on cost, maintenance, backups, performance, recovery, and operational fit.

The permanent architecture must not depend on provider-specific database features unless separately approved.

## 6. ORM / Data Access Evaluation

### Options Considered

- Prisma ORM
- Drizzle ORM
- Direct SQL
- Supabase client directly

### Recommended Option

**Prisma ORM**

### Advantages

- Strong schema modeling and type-safe database access.
- Good developer experience.
- Clear migration workflow.
- Easier for future developers to understand quickly.
- Works well with PostgreSQL and TypeScript.

### Disadvantages

- Adds an abstraction layer over SQL.
- Some advanced SQL features may require raw SQL.
- Generated client and migration workflow require discipline.

### Long-Term Scalability

Strong for a business application with many related entities.

### Learning Curve

Low to moderate.

### Development Speed

High.

### Cost Considerations

Prisma ORM is open source. Prisma-hosted products are optional and not required by this recommendation.

### Fit For Cotarion Platform

Strong. The platform benefits from explicit schema modeling and type-safe access. Drizzle is also strong, but Prisma is likely faster and easier for a maintainable Version 1.

## 7. Authentication And Authorization Evaluation

### Options Considered

- Clerk
- Supabase Auth
- Auth0
- Auth.js
- Custom authentication

### Approved Option

**Auth.js for authentication, with application-owned authorization**

### Advantages

- Reduces long-term vendor dependency.
- Maintains greater control over Cotarion user accounts and access behavior.
- Keeps authentication portable.
- Avoids unnecessary recurring dependency for an internal professional platform.
- Supports future Microsoft, Google, magic-link, or credential-based sign-in as approved later.
- Works well with application-owned roles, permissions, ownership, departments, and authorization rules stored in PostgreSQL.

### Disadvantages

- More implementation responsibility than a managed auth product like Clerk.
- User management screens may need to be built rather than purchased.
- Provider configuration, session handling, and security updates require discipline.
- Must avoid custom password handling or security-sensitive authentication logic from scratch.

### Long-Term Scalability

Strong. Auth.js keeps authentication portable while Cotarion-specific authorization remains in PostgreSQL.

### Learning Curve

Moderate.

### Development Speed

Moderate. Slower than Clerk initially, but better aligned with Cotarion's portability and ownership goals.

### Cost Considerations

Auth.js is open source. Costs depend on selected identity providers, email delivery for magic links, hosting, and database usage.

### Fit For Cotarion Platform

Strong. It supports secure authentication without locking Cotarion's user and authorization model into a proprietary identity platform.

### Version 1 Sign-In Methods

Version 1 should support:

- Microsoft sign-in
- Google sign-in
- Email and password sign-in

Microsoft is especially important because Cotarion currently uses Microsoft 365.

Magic-link authentication may be added later but is not required for Version 1.

Do not build password security logic from scratch. Auth.js should use established provider and secure session patterns.

### Notes On Alternatives

Clerk remains a strong alternative if Cotarion later prioritizes fastest implementation and managed user administration over portability. Supabase Auth is attractive if Supabase is chosen as the database platform. Auth0 is powerful but likely heavier than needed for Version 1. Custom password handling and security-sensitive authentication logic should be avoided.

## 8. PDF Generation Evaluation

### Options Considered

- Playwright / Chromium HTML-to-PDF
- React PDF
- Puppeteer
- Server-side document service
- Browser print-to-PDF only

### Approved Option

**HTML-to-PDF using Playwright or Chromium, initially within the application deployment**

### Advantages

- Allows proposal and agreement PDFs to match web previews closely.
- Good fit for branded documents.
- Supports CSS-based layout control.
- Can reuse document preview templates.
- Practical for Version 1 proposal/agreement generation.

### Disadvantages

- Requires careful print CSS.
- Browser rendering can behave differently across hosting environments.
- Serverless environments may need special deployment handling.
- Large or complex PDFs may require worker-based generation later.

### Long-Term Scalability

Good. For high volume, PDF generation can be moved to background jobs or a dedicated service.

### Learning Curve

Moderate.

### Development Speed

Moderate to high.

### Cost Considerations

Open-source tooling. Hosting resources may increase if PDF generation is frequent or heavy.

### Fit For Cotarion Platform

Strong. The UXS requires professional PDF proposals and agreements that align with client-facing previews.

### PDF Rendering Decision

Version 1 should initially generate PDFs within the application's deployment architecture.

Do not create a separate PDF worker or service unless deployment testing shows that runtime limits, performance, reliability, or document volume require it.

The infrastructure layer must isolate PDF rendering so it can be moved to a separate worker or service later without changing proposal or agreement business logic.

## 9. Hosting And Deployment Evaluation

### Options Considered

- Vercel
- Render
- Fly.io
- AWS
- Azure
- Google Cloud
- Self-hosted VPS

### Recommended Option

**Vercel for the web application, with managed PostgreSQL separately**

### Advantages

- Excellent fit for Next.js.
- Fast preview deployments.
- Low operational overhead.
- Strong developer workflow.
- Good for professional web app delivery.

### Disadvantages

- Vendor coupling to Vercel platform conventions.
- Serverless limits may affect heavy PDF generation or long-running jobs.
- Database should be chosen deliberately rather than by default.
- Costs should be reviewed before production.

### Long-Term Scalability

Strong for web application hosting. If future modules require background processing or heavier backend services, additional infrastructure can be added.

### Learning Curve

Low to moderate.

### Development Speed

High.

### Cost Considerations

Usually low early, but production usage, team seats, bandwidth, functions, and preview deployments should be reviewed.

### Fit For Cotarion Platform

Strong for Version 1 because it reduces operational overhead and supports fast reviewable sprint delivery.

### Hosting Priority

Production hosting should prioritize:

1. Lowest maintenance
2. Reliability
3. Reasonable cost
4. Future scalability

Cotarion should not take on unnecessary infrastructure-management responsibility during Version 1. Selected providers should support easy deployment, backups, monitoring, and recovery without requiring Cotarion to operate its own servers.

## 10. Database Hosting Evaluation

### Options Considered

- Supabase Postgres
- Neon
- Railway Postgres
- Render Postgres
- AWS RDS
- Vercel Postgres / marketplace options

### Approved Option

**Managed PostgreSQL provider deferred as a deployment decision**

### Provider Options

Provider options may include:

- Supabase Postgres
- Neon
- Railway Postgres
- Render Postgres
- AWS RDS
- Vercel marketplace PostgreSQL options
- Other standards-compliant managed PostgreSQL providers

### Advantages Of Deferring Provider Selection

- Keeps the Cotarion Platform portable.
- Avoids making Supabase, Neon, or any provider part of the permanent architecture.
- Allows selection later based on cost, maintenance, backups, performance, monitoring, recovery, and operational fit.

### Example Provider Advantages

- Managed PostgreSQL.
- Built-in auth and storage options if needed later.
- Row-level security support aligns with future ownership and department access rules.
- Good dashboard and developer tooling.
- Managed serverless PostgreSQL.
- Strong branching and development workflow.
- Good fit for modern serverless deployment.
- Keeps auth and database concerns separate.

### Disadvantages Of Deferring Provider Selection

- Final deployment details remain unresolved until provider selection.
- Connection pooling, backups, monitoring, and migration workflows must be confirmed during deployment planning.

### Long-Term Scalability

Strong. PostgreSQL portability is preserved as long as provider-specific features are avoided.

### Learning Curve

Low to moderate.

### Development Speed

High once a provider is selected.

### Cost Considerations

Production cost should be reviewed based on storage, compute, backups, branching, retention, monitoring, and recovery requirements.

### Fit For Cotarion Platform

Strong. The platform gets managed PostgreSQL without making any specific provider a permanent architectural dependency.

## 11. File And Document Storage Evaluation

### Options Considered

- Supabase Storage
- AWS S3
- Cloudflare R2
- Vercel Blob
- Database-only storage

### Approved Option

**Standards-compliant object storage with provider selection deferred**

### Advantages

- Appropriate for generated PDFs, signed agreements, and future documents.
- Avoids storing large binary files directly in the database.
- Can support future document-management features.
- Keeps storage portable when isolated behind the infrastructure layer.

### Disadvantages

- Requires access-control design.
- Adds another service to manage.
- Signed URLs and retention policies must be handled correctly.

### Long-Term Scalability

Strong.

### Learning Curve

Moderate.

### Development Speed

Moderate.

### Cost Considerations

Usually low early. Costs grow with storage and bandwidth.

### Fit For Cotarion Platform

Strong. Generated proposals and agreements should be stored as immutable document records.

### Provider Decision

The specific object storage provider is deferred as a deployment decision. Supabase Storage, AWS S3, Cloudflare R2, Vercel Blob, and other standards-compliant object storage providers may be evaluated later.

The infrastructure layer must isolate storage access so providers can be changed without rewriting the domain or application layers.

### Document Retention Decision

Version 1 must permanently store:

- Generated proposal PDFs
- Generated agreement PDFs
- Uploaded signed agreements

Stored documents must remain associated with the correct:

- Client
- Proposal
- Proposal version
- Accepted option or options
- Agreement
- Engagement, when applicable

Finalized documents must not be silently overwritten. Revisions should create new document records or versions.

## 12. Testing Evaluation

### Options Considered

- Vitest
- Jest
- Playwright
- Cypress
- React Testing Library

### Recommended Option

**Vitest for unit/business-logic tests and Playwright for critical workflow tests**

### Advantages

- Vitest is fast and well-suited for TypeScript domain logic.
- Playwright supports browser-level workflow testing and PDF-related verification.
- Fits Development Charter requirements for testing calculations and critical workflows.

### Disadvantages

- End-to-end tests require discipline to avoid brittleness.
- More setup than unit tests alone.

### Long-Term Scalability

Strong.

### Learning Curve

Moderate.

### Development Speed

Good if tests are scoped to business-critical behavior.

### Cost Considerations

Open source. CI usage may create hosting/runner costs.

### Fit For Cotarion Platform

Excellent. Pricing calculations, validation, proposal lifecycle, and document generation need test coverage.

## Approved Complete Technology Stack

This is the approved Version 1 technology direction.

- Frontend: Next.js, React, and TypeScript
- UI: shadcn/ui and Tailwind CSS
- Application architecture: Presentation, Application, Domain, and Infrastructure layers
- Backend: Next.js server-side modules, route handlers, and server actions where appropriate
- Database: Managed PostgreSQL
- ORM: Prisma
- Authentication: Auth.js
- Version 1 sign-in: Microsoft, Google, and secure email/password
- Authorization: Application-owned roles, permissions, record ownership, and department access stored in PostgreSQL
- PDF generation: HTML/CSS rendered through Playwright or Chromium, initially within the application deployment
- Hosting: Vercel for the web app
- Database provider: Deferred deployment decision
- Object storage provider: Deferred deployment decision
- Document retention: Permanent storage of generated and signed records
- Testing: Vitest for domain and calculation tests; Playwright for critical workflows
- Documentation: Markdown under `docs/`, with ADRs under `docs/adr/`

## Why This Stack Is Recommended

This stack best fits the Cotarion Platform because it:

- Supports rapid Version 1 delivery without overbuilding.
- Uses proven, mainstream technologies.
- Keeps the app web-based and professional.
- Supports future users, ownership, departments, and modules.
- Fits a relational business domain.
- Makes calculations testable.
- Avoids custom security-sensitive authentication logic while reducing long-term auth vendor dependency.
- Supports branded PDF generation from web previews.
- Preserves room for future services or workers without requiring them on day one.

## Alternatives Considered

### React + Vite

Good for frontend apps, but would require assembling routing, backend/API structure, SSR, and deployment conventions separately.

### SvelteKit / Nuxt

Capable frameworks, but React/Next.js has a broader hiring and ecosystem advantage for this project.

### NestJS Separate Backend

More structured for large APIs, but too much operational overhead for Version 1.

### Django / Rails

Excellent full-stack productivity, but less aligned with the React-centered professional UI and PDF preview workflow recommended here.

### Supabase-Only Backend

Fast and powerful, but the Cotarion Platform has enough custom business logic that an explicit application domain layer is preferable.

### Auth0

Enterprise-grade, but heavier than needed for Version 1.

### Auth.js

Recommended for this platform because it balances portability, control, and secure provider-based authentication. It requires more implementation discipline than Clerk.

### Clerk

Strong managed authentication and user management product, but not selected as the preferred recommendation because Cotarion has approved reducing long-term vendor dependency and keeping user/access behavior more application-owned.

### Drizzle ORM

Strong and SQL-like, but Prisma is likely faster for maintainable Version 1 schema modeling.

### AWS-First Hosting

Highly scalable, but too much infrastructure complexity for Version 1.

## Risks Of The Recommendation

- Vercel plus Playwright PDF generation may require careful deployment handling.
- Auth.js requires more implementation responsibility than a managed authentication provider.
- Prisma can hide some SQL details and may need raw SQL for advanced cases.
- Next.js requires clear conventions to prevent business logic from spreading into UI components.
- Database provider remains a deployment decision.
- Object storage provider remains a deployment decision.
- Costs should be reviewed before production deployment.

## Compliance And Privacy Direction

Version 1 has no known special regulatory hosting requirement such as HIPAA, CJIS, or ITAR.

The platform must still follow normal professional business-data practices, including:

- Secure authentication
- Role-based authorization
- Access control
- Encryption in transit
- Secure provider configuration
- Protection of client financial and proposal information
- Database backups
- Auditability for sensitive changes
- No credentials or secrets stored in source control

The architecture should allow additional compliance controls to be added later if Cotarion's client base requires them.

## Remaining Material Blockers

No material technology decisions remain that block application scaffolding.

## Recommendation Status

The technology stack is approved for Version 1. Sprint 0 technology selection is complete.

No code has been written, and no application scaffold has been created.
