# Architecture Decision Records

The Cotarion Platform uses Architecture Decision Records (ADRs) to preserve significant architectural and business-logic decisions.

Each ADR should be stored as its own markdown file in this folder.

ADR-000 is the governing Cotarion Product Development Methodology. Future capability ADRs and authoritative implementation plans must reference and follow it.

## ADR Template

```markdown
# ADR-000: Title

## Date

YYYY-MM-DD

## Status

Proposed | Architecture Approved | Product Owner Approved | Superseded | Rejected

## Decision

Describe the decision.

## Business Context

Explain the business need or constraint behind the decision.

## Alternatives Considered

List meaningful alternatives that were considered.

## Decision Rationale

Explain why this decision was chosen.

## Consequences

Describe expected benefits, tradeoffs, and risks.

## Related FDS/UXS Sections

Reference related design documentation.

## Future Considerations

Identify conditions that may require revisiting the decision.
```

## Registry organization

ADR identifiers are permanent, append-only identities rather than hierarchy positions. Categories and cross-references provide logical organization without renumbering or repurposing historical records. ADR-001 remains reserved for Cotarion Platform Architecture.

## ADR index by category

### Platform methodology and governance

- [ADR-000: Cotarion Product Development Methodology](ADR-000-cotarion-product-development-methodology.md)
- [ADR-019: Platform Governance & Decision Authority](ADR-019-platform-governance-decision-authority.md)
- [ADR-020: Platform Role Administration & Founder Bootstrap](ADR-020-platform-role-administration-founder-bootstrap.md)

### Platform architecture and scope

- [ADR-001: Cotarion Platform Architecture](ADR-001-cotarion-platform-architecture.md)
- [ADR-002: Pricing & Proposals as Version 1 Module](ADR-002-pricing-and-proposals-version-1-module.md)
- [ADR-007: Layered Application Architecture](ADR-007-layered-application-architecture.md)

### Security, identity, and workspace ownership

- [ADR-006: Auth.js as the Preferred Authentication Approach](ADR-006-authjs-preferred-authentication.md)
- [ADR-011: Version 1 Authentication Methods](ADR-011-version-1-authentication-methods.md)
- [ADR-015: Application Users Belong to One Company Workspace](ADR-015-application-users-belong-to-one-company-workspace.md)

### Data, infrastructure, documents, and operations

- [ADR-009: Managed PostgreSQL Provider Portability](ADR-009-managed-postgresql-provider-portability.md)
- [ADR-010: Standards-Compliant Object Storage Abstraction](ADR-010-standards-compliant-object-storage-abstraction.md)
- [ADR-012: Permanent Document Retention](ADR-012-permanent-document-retention.md)
- [ADR-013: Lowest-Maintenance Hosting Priority](ADR-013-lowest-maintenance-hosting-priority.md)
- [ADR-014: In-Application PDF Rendering with Future Worker Option](ADR-014-in-application-pdf-rendering-future-worker-option.md)

### Pricing

- [ADR-003: Value-Based Project Pricing Philosophy](ADR-003-value-based-project-pricing-philosophy.md)
- [ADR-004: Advisory Consulting as the Only Hourly Billing Model](ADR-004-advisory-consulting-hourly-billing.md)
- [ADR-008: Domain Isolation for Pricing and Business Rules](ADR-008-domain-isolation-pricing-business-rules.md)
- [ADR-016: Shared Pricing Project With Explicit Pricing Models](ADR-016-shared-pricing-project-pricing-models.md)
- [ADR-021: Pricing Approval & QUOTED Lifecycle](ADR-021-pricing-approval-quoted-lifecycle.md)

### Proposal, Agreement, and Engagement Management

- [ADR-005: Engagement Lifecycle Architecture](ADR-005-engagement-lifecycle-architecture.md)
- [ADR-017: Proposal Management Business Architecture](ADR-017-proposal-management-business-architecture.md)
- [ADR-018: Proposal Management Implementation Plan](ADR-018-proposal-management-implementation-plan.md)

## Governance audits

- [July 2026 ADR Governance Audit](ADR-AUDIT-2026-07.md)
