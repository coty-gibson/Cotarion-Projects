# Changelog

## Version 0.2 Authentication - 2026-07-17

Version 0.2 completes and locally verifies the Cotarion Platform authentication milestone.

### Included

- Microsoft Entra ID sign-in through Auth.js.
- Auth.js session persistence using the Prisma adapter.
- Protected application routes with unauthenticated users redirected to sign-in.
- Microsoft identity mapping to the application-owned `ApplicationUser` profile.
- `Account.ext_expires_in` Prisma schema and database migration support for Microsoft account data.
- Development sign-in retained as a strictly development-only path that fails closed outside development.
- Successful manual verification of Microsoft sign-in and sign-out in local development.

## Version 0.1 Foundation - 2026-07-16

Version 0.1 establishes the approved Cotarion Platform foundation through Sprint 2A.

### Included

- Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui project foundation.
- Layered source structure for Presentation, Application, Domain, and Infrastructure.
- Formatting, linting, typecheck, Vitest, and Playwright test setup.
- Protected application shell for the Pricing & Proposals module foundation.
- Managed PostgreSQL foundation using Prisma.
- Auth.js foundation with secure session handling.
- Temporary development-only sign-in path guarded against non-development environments.
- Application-owned `ApplicationUser` profile mapping.
- `Company` workspace foundation with Cotarion Consulting Group as the single Version 1 company.
- Race-safe, idempotent user/company/profile creation using Prisma transaction and upsert patterns.
- Neon development database migration and verification.
- Unit, integration, and Playwright coverage for Sprint 2A authentication foundation behavior.
- ADR updates for authentication strategy, PostgreSQL portability, Version 1 auth scope, and company workspace ownership.

### Deferred

- Microsoft Entra ID / Microsoft 365 authentication.
- Google authentication.
- Email/password authentication, password storage, password reset, and MFA.
- User administration, invitations, company switching, and company management UI.
- Client, pricing, proposal, agreement, and engagement functionality.
