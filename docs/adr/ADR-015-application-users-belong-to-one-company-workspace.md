# ADR-015: Application Users Belong to One Company Workspace

## Date

2026-07-16

## Status

Approved

## Decision

Every `ApplicationUser` belongs to exactly one `Company` workspace.

Version 1 will contain a single company record: Cotarion Consulting Group. The user interface must not expose company administration, company switching, invitations, or multi-company management in Version 1.

The database model and Application Layer must still represent the relationship explicitly so future multi-company expansion does not require a schema redesign.

## Business Context

Cotarion Platform needs a clear ownership boundary before clients, proposals, pricing records, agreements, documents, and audit history are added. Even though Version 1 operates as a single-company application, company ownership is a foundational data boundary that should not be retrofitted later.

## Alternatives Considered

- No company table until multi-company functionality is needed.
- Store company as a string field on `ApplicationUser`.
- Build full multi-company administration in Version 1.

## Decision Rationale

Adding the company relationship now keeps the data model honest without increasing Version 1 user-interface scope. It allows user profiles, future records, and authorization rules to be associated with a durable company boundary while keeping Cotarion Consulting Group as the only available company in Version 1.

Full multi-company management is intentionally deferred because it would add administration, switching, invitations, and authorization workflows that are outside Version 1 scope.

## Consequences

- The Sprint 2A data model includes `Company` and `ApplicationUser.companyId`.
- The application seeds or otherwise ensures the Cotarion Consulting Group company exists before application-user mapping completes.
- New application users are assigned to the Cotarion Consulting Group company in Version 1.
- Company switching and management are not exposed in the UI.
- Future multi-company support can add administration and switching workflows without replacing the foundational schema.

## Related FDS/UXS Sections

- Implementation Plan: Sprint 2A
- ADR-007: Layered Application Architecture
- ADR-011: Version 1 Authentication Methods

## Future Considerations

Future versions may add company administration, invitations, company switching, and cross-company access rules only after the Product Owner approves that scope.
