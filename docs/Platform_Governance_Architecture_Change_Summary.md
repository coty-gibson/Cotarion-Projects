# Platform Governance Architecture Change Summary

Date: 2026-07-20

Status: Product Architect and Product Owner Approved — documentation change prepared for review

## Decision recorded

ADR-019 establishes Platform Governance & Decision Authority as the platform-wide authority for roles, default capabilities, Quality Review, Executive Authorization, Business Justification, audit principles, business-record preservation, and governance philosophy.

ADR numbers remain permanent and append-only. ADR-001 remains Cotarion Platform Architecture. Logical grouping is expressed through registry categories and cross-references.

## Architecture effects

- Founder, Admin, and Member are the approved platform roles.
- Roles establish default capabilities while long-term authorization evolves toward capability-based permissions.
- Quality Review replaces “Internal Review” as the business-facing review term.
- Proposal creators cannot perform Quality Review on their own Proposal.
- Founder and Admin may perform Quality Review.
- Founder and Admin may use Executive Authorization with Business Justification and permanent audit evidence.
- Executive Authorization is an approved governance path rather than an override.
- Significant actions permanently record who, when, what, Submission Method, Review Method, and Business Justification when applicable.
- Business records use lifecycle status and are never deleted.

## Proposal architecture alignment

ADR-017 now references ADR-019 rather than independently defining platform roles, review philosophy, Executive Authorization, or audit principles. Proposal-specific rules retain Company isolation, immutable versions, lifecycle invariants, and recipient requirements.

ADR-018 now uses Quality Review and Executive Authorization terminology and requires reviewer independence, Business Justification, and permanent audit evidence in the Sprint 3 roadmap.

The frozen Sprint 0 machine code `INTERNAL_REVIEW` is unchanged. It is documented as a compatibility code for the business-facing Quality Review state. No contract, API, schema, migration, or implementation change is authorized by this documentation update.

## Implementation boundary

This change does not begin Sprint 3. Implementation remains paused until Product Architect and Product Owner approval of the documentation review package.
