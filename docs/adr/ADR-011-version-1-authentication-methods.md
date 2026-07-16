# ADR-011: Version 1 Authentication Methods

## Date

2026-07-15

## Status

Approved

## Decision

Version 1 authentication will be implemented in two steps:

1. Sprint 2A: Auth.js foundation with secure sessions, protected routes, sign-in/sign-out, application-owned user-profile mapping, and a temporary development-only sign-in method.
2. Sprint 2B: Microsoft Entra ID / Microsoft 365 sign-in through Auth.js.

Google sign-in is deferred until there is a demonstrated business need. Email/password authentication is removed from Version 1 scope unless the Product Owner explicitly reopens that decision.

The temporary development sign-in method must not create or manage passwords, must be isolated from production provider configuration, and must fail closed outside development environments.

## Business Context

Cotarion currently expects Microsoft 365 to be the primary identity provider. However, authentication architecture, protected routes, session handling, and application-user mapping should be validated before external OAuth registration and callback configuration can delay implementation.

## Alternatives Considered

- Implement Microsoft, Google, and email/password in the first authentication sprint.
- Implement Microsoft OAuth first and block the sprint on external OAuth setup.
- Use a temporary password-based development login.
- Defer all authentication until later business functionality exists.

## Decision Rationale

Splitting authentication into Sprint 2A and Sprint 2B reduces delivery risk. Sprint 2A proves the architecture and user-profile mapping through the real Auth.js/session/application path without depending on external OAuth. Sprint 2B then adds Microsoft identity integration once the foundation is stable.

Google sign-in adds provider surface area before there is a demonstrated need. Email/password authentication would require password lifecycle decisions and security responsibilities that Version 1 does not need.

## Consequences

- Version 1 will not include application-created passwords, password reset, password storage, or MFA.
- Development sign-in is permitted only as a temporary development tool.
- Microsoft identity mapping must attach to existing application user profiles rather than creating duplicate profiles.
- Authorization remains application-owned and outside React components.
- Future Google sign-in requires Product Owner approval based on business need.

## Related FDS/UXS Sections

- Technology Evaluation Report: Authentication & Authorization
- Implementation Plan: Sprint 2A and Sprint 2B

## Future Considerations

The Product Owner may reopen Google sign-in, email/password authentication, MFA, invitations, or user administration if business requirements justify the additional security and operational scope.
