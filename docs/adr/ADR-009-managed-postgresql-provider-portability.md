# ADR-009: Managed PostgreSQL Provider Portability

## Date

2026-07-15

## Status

Approved

## Decision

Cotarion Platform will use managed PostgreSQL for development and production database persistence. Prisma will be used for schema modeling and migrations. The database design must avoid provider-specific PostgreSQL features unless a future ADR explicitly approves them.

For Sprint 2A local/development use, Neon is the recommended managed PostgreSQL option because it offers low-maintenance serverless Postgres, straightforward connection strings for Prisma, a free plan suitable for early development, and database branching that can support isolated development workflows.

## Business Context

The platform needs relational persistence for authentication records, application user profiles, clients, proposals, pricing records, agreements, documents, ownership, and audit history. Development should start with a managed database to avoid local database maintenance becoming a blocker.

## Alternatives Considered

- Neon.
- Supabase PostgreSQL.
- Railway PostgreSQL.
- Render PostgreSQL.
- AWS RDS.
- Local PostgreSQL only.

## Decision Rationale

Managed PostgreSQL reduces operational maintenance during development while preserving portability. Neon is recommended for Sprint 2A because it is low setup, serverless, Prisma-compatible, and useful for development database branching. This is a development recommendation, not a permanent vendor lock-in decision.

## Consequences

- The application must connect using standard PostgreSQL connection strings.
- Prisma migrations must remain portable across managed PostgreSQL providers.
- Provider-specific features, extensions, auth systems, storage systems, and serverless functions are not part of the database portability decision.
- If the provider changes later, the application schema and Prisma access patterns should require minimal change.

## Related FDS/UXS Sections

- Technology Evaluation Report: Database, ORM, Hosting, and Provider Portability
- Implementation Plan: Sprint 2A

## Future Considerations

Production database provider selection may be revisited based on cost, backup and recovery needs, regional requirements, Vercel integration, support, and operational fit. Any use of provider-specific PostgreSQL capabilities requires a separate ADR.
