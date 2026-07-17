# Cotarion Platform

Version 1 module: **Pricing & Proposals**

This repository contains the Cotarion Platform application foundation.

## Version 0.2 Authentication

**Status:** Complete, approved, and locally verified.

Version 0.2 completes the Microsoft Entra authentication milestone. Microsoft sign-in and sign-out have been successfully verified through the local application.

### Included

- Microsoft Entra ID sign-in through Auth.js
- Auth.js session persistence using the Prisma adapter
- Protected routes with unauthenticated users redirected to sign-in
- Microsoft identity mapping to the application-owned `ApplicationUser` profile
- `Account.ext_expires_in` Prisma schema and database migration
- Development sign-in remaining strictly development-only and failing closed outside development
- Successful manual Microsoft sign-in and sign-out verification

## Version 0.1 Foundation

**Status:** Complete and approved.

Version 0.1 includes Sprint 1 and Sprint 2A. It establishes the approved project scaffold, layered architecture, development tooling, managed PostgreSQL foundation, Prisma migrations, Auth.js foundation, protected routes, secure session handling, development-only sign-in, and application-owned user-profile mapping.

### Included

- Next.js, React, and TypeScript
- Tailwind CSS
- shadcn/ui configuration
- Presentation, Application, Domain, and Infrastructure layer folders
- ESLint and Prettier
- Vitest test setup
- Playwright test setup
- Protected application shell and navigation framework
- Managed PostgreSQL development database foundation
- Prisma schema, migration, and generated client workflow
- Auth.js foundation
- Secure session handling
- Protected route redirect to sign-in
- Temporary development-only authentication path
- Application-owned `ApplicationUser` profile mapping
- Cotarion Consulting Group as the single Version 1 `Company`
- Race-safe user/company/profile creation with Prisma transactions and upserts

### Not Included

- Business logic
- Pricing engine
- Clients
- Proposals
- Agreements
- Engagements
- PDF generation
- Object storage
- Google authentication
- Email/password authentication
- Password storage, password reset, or MFA
- User administration, invitations, company switching, or company management UI

## Commands

```bash
npm run dev
npm run db:generate
npm run db:migrate
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Authentication Environment

Create `.env` from `.env.example` and set `DATABASE_URL` to the managed PostgreSQL development database connection string. Neon is the recommended low-maintenance development option.

`ENABLE_DEV_AUTH=true` may be used only for local development. The application fails closed if development authentication is enabled outside `NODE_ENV=development`.

Microsoft Entra authentication requires the client ID, client secret, and tenant ID settings documented in `.env.example`.

## Architecture

The application uses the approved layered architecture:

- `src/presentation` - pages, screens, layouts, reusable UI, and previews
- `src/application` - future use cases and workflow coordination
- `src/domain` - future business rules, pricing logic, and historical integrity rules
- `src/infrastructure` - future database, auth, storage, PDF, and external integrations

Business logic must not be embedded in React pages or UI components.

## Approved Documentation

- [Functional Design Specification](docs/Functional_Design_Specification.md)
- [User Experience Specification](docs/User_Experience_Specification.md)
- [Development Charter](docs/Development_Charter.md)
- [Technology Evaluation Report](docs/Technology_Evaluation_Report.md)
- [Implementation Plan](docs/Implementation_Plan.md)
- [Architecture Decision Records](docs/adr/README.md)
