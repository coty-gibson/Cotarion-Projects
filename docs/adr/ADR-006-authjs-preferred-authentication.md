# ADR-006: Auth.js as the Preferred Authentication Approach

## Date

2026-07-15

## Status

Approved

## Decision

Cotarion Platform will use Auth.js as the authentication foundation for Version 1. Authentication infrastructure belongs in the Infrastructure Layer. Application user mapping, current-user workflows, and authorization-facing application behavior belong in the Application Layer.

Sprint 2A will implement the Auth.js foundation, secure session handling, protected routes, sign-in/sign-out flow, and application-owned user-profile mapping before external OAuth providers are configured. Sprint 2B will add Microsoft Entra ID / Microsoft 365 sign-in through Auth.js.

The application will not create or manage user passwords in Version 1.

## Business Context

Cotarion needs secure authentication without locking the platform's application user model, authorization model, ownership rules, and future workspace behavior into a proprietary identity platform. The first authentication sprint must prove the architecture without being blocked by Microsoft OAuth app registration and callback configuration.

## Alternatives Considered

- Managed auth platform such as Clerk or Auth0.
- Supabase Auth if Supabase were selected as the primary database platform.
- Custom authentication.
- Email/password authentication in Version 1.

## Decision Rationale

Auth.js keeps authentication portable and works with Next.js, Prisma, PostgreSQL, and provider-based sign-in. It allows Cotarion to keep application-specific identity and authorization records in PostgreSQL while delegating authentication protocol handling to a maintained library.

Custom authentication and password handling are rejected because they would introduce unnecessary security risk. Email/password authentication is removed from Version 1 scope unless the Product Owner explicitly reopens that decision.

## Consequences

- The Infrastructure Layer owns Auth.js configuration, provider setup, session persistence, and integration with the database adapter.
- The Application Layer owns mapping an authenticated identity to an application user profile.
- React components must not contain authorization logic.
- Microsoft OAuth can be added after the core architecture is tested.
- Google sign-in is deferred until there is a demonstrated business need.

## Related FDS/UXS Sections

- Technology Evaluation Report: Authentication & Authorization
- Implementation Plan: Sprint 2A and Sprint 2B

## Future Considerations

Future identity providers may be added through Auth.js when there is a demonstrated business need. MFA, invitations, user administration, and richer role management are deferred until later scope requires them.
