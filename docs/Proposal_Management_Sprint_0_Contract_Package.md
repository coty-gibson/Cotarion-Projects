# Proposal Management Sprint 0 Contract Package

Date: 2026-07-20

Status: Approved

Product Architect Review: Passed

Product Owner Review: Passed

Implementation Authorization: ADR-018 Sprint 1

## Scope

This package freezes ADR-018 Sprint 0 contracts only. It contains no Proposal lifecycle implementation, database schema, migration, repository, application service, UI, renderer, delivery integration, or persistence behavior.

## Contract versions

| Contract                           | Version | Location                                           |
| ---------------------------------- | ------- | -------------------------------------------------- |
| Proposal boundary                  | 1       | `src/domain/proposals/contracts.ts`                |
| Pricing snapshot schema            | 1       | `src/domain/proposals/contracts.ts`                |
| Structured Proposal content schema | 1       | `src/domain/proposals/contracts.ts`                |
| Platform business-event envelope   | 1       | `src/domain/proposals/contracts.ts`                |
| Consulting Engagement Type policy  | 1       | `src/domain/proposals/engagement-type-policies.ts` |

Contract version changes are additive when backward compatible. Breaking changes require a new schema/policy version and explicit migration/compatibility handling. Historical records retain the version used when created.

## Terminology and stable codes

### Proposal lifecycle codes

- `DRAFT`
- `INTERNAL_REVIEW`
- `SUBMITTED`
- `VIEWED`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`
- `SUPERSEDED`
- `ARCHIVED`

These codes freeze vocabulary only. Sprint 1 implements transition behavior.

### Pricing Model codes

- `PROJECT`
- `FIXED_RETAINER`
- `PROFIT_SHARE_RETAINER`
- `HYBRID_RETAINER`
- `ADVISORY_HOURLY`

Proposal contracts reproduce stable boundary codes and do not import Pricing calculators.

### Proposal event codes

- Proposal Created
- Proposal Version Saved
- Internal Review Requested
- Changes Requested
- Submitted
- Viewed
- Accepted
- Verbal Acceptance Recorded
- Acceptance Withdrawn
- Declined
- Expired
- Superseded
- Archived

Stable machine codes are defined in `PROPOSAL_EVENT_TYPES`. Sprint 1 decides when valid domain commands emit them.

## Pricing snapshot contract

One Proposal consumes exactly one immutable `ProposalPricingSnapshotV1`.

The snapshot preserves:

- source Pricing Project ID and permanent reference number;
- Company, Client, and Consulting operating-group identity;
- eligible source status (`QUOTED`);
- Pricing Model;
- methodology version;
- engine version;
- Pricing Configuration version ID and number;
- calculation input snapshot;
- typed calculation output snapshot;
- approved timestamp and responsible user;
- capture timestamp;
- USD final amount and all model-specific breakdown fields.

The output is a discriminated union covering all five Version 1 Pricing Models. Proposal Management does not import, invoke, or reproduce calculation behavior.

`QUOTED` is the existing Pricing Project lifecycle state representing an approved output eligible for a Proposal. A mutable Draft or In Review Pricing Project cannot satisfy this contract.

## Engagement Type policy matrix

The authoritative business matrix is encoded in ADR-017 and as `CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1`.

### Pricing-model translation

The Product Owner's business term `Fixed` maps as follows:

- Strategy Session and Diagnostic: `PROJECT`.
- Project: `PROJECT`.
- Retainer: `FIXED_RETAINER`.

Profit-Share and Hybrid map to their explicit Pricing Model codes. Advisory maps only to `ADVISORY_HOURLY`.

This translation preserves the existing Pricing domain model and does not create a second pricing vocabulary in calculation logic.

### Direct Engagement eligibility

Eligibility is derived only from the versioned policy:

```text
eligible = proposalRequired is false AND directEngagementPermitted is true
```

Version 1 result:

- Strategy Session: eligible
- Advisory: eligible
- Diagnostic: eligible
- Project: not eligible
- Retainer: not eligible

There is no manual Proposal bypass contract.

## Workflow and status contracts

Engagement workflow steps are ordered, stable policy data. Every policy freezes its initial status, permitted transition pairs, and terminal outcomes. Retainer renewal explicitly returns to Active; terminal outcomes have no outgoing transition.

Sprint 0 does not implement an Engagement state machine. Future Engagement behavior consumes the effective versioned policy and must preserve the version selected at record creation.

Proposal lifecycle vocabulary is frozen separately from Engagement workflow vocabulary. Proposal acceptance and Agreement acceptance remain distinct events.

## Structured-content contract

`ProposalStructuredContentV1` is representation-neutral and supports ordered Client-visible or internal sections:

- Executive Summary
- Client Needs
- Recommendations
- Services
- Deliverables
- Commercial Terms
- Assumptions
- Next Steps
- Custom

Web, PDF, email, portal, and API representations consume this contract. No layout, PDF, email, or storage concern is part of the content schema.

## Platform event contract

`PlatformBusinessEventV1` implements the ADR-017 immutable envelope:

- Event ID
- occurred and published timestamps
- Company and Client
- Event Type
- source aggregate and record
- source reference number
- display summary
- responsible user where applicable
- operating group and Engagement filters
- actor type
- correlation and causation
- versioned representation-safe metadata

Timeline is a consumer only. Sprint 0 defines no publisher, outbox, projection, or database record.

## Permanent record-number contract

Approved current formats:

- `PP-######`
- `PRO-######`
- `AGR-######`
- `ENG-######`
- `INV-######`
- `PAY-######`
- `CLI-######`
- `COM-######`

Issued `EST-######` Pricing Project numbers remain valid historical identifiers. Validation accepts both `PP` and legacy `EST` for Pricing Projects and never accepts `EST` for another record type.

Numbers require at least six digits, are immutable, are never reused, and may contain gaps.

## Migration-readiness findings

### Existing Pricing Project numbering

Current persistence uses:

- global `PricingProjectSequence`;
- `EST-######` formatting in the repository;
- a database check constraint accepting only `EST-######`;
- a global unique index;
- a database trigger preventing estimate-number changes.

This correctly protects issued records but cannot issue `PP-######` without an additive future Pricing migration.

### Approved transition design

Proposal Management does not rewrite the Pricing migration or historical rows.

A future dedicated Pricing-number transition must:

1. Preserve every issued `EST-######` value.
2. Expand the format constraint to accept `EST` and `PP`.
3. Continue the existing global numeric sequence so no numeric value is deliberately reused under a new prefix.
4. Change only new-number formatting to `PP-######`.
5. Preserve the immutable-number trigger.
6. Validate concurrency and mixed-prefix reads.
7. Use a forward fix rather than rolling back by renumbering records.

The Proposal snapshot treats the Pricing Project number as an immutable source reference and accepts either valid prefix.

### Proposal persistence readiness

Sprint 2 can add a dedicated global Proposal sequence and `PRO-######` unique reference without modifying existing business records. Allocation uses one atomic database transaction and tolerates gaps.

Planned additive order:

1. Add versioned Engagement Type configuration.
2. Seed Policy Version 1 non-destructively and fail on drift.
3. Add Proposal sequence and Proposal identity.
4. Add mutable Draft storage.
5. Add immutable Proposal Version and exactly-one Pricing snapshot.
6. Add recipients, events, decisions, representations, delivery metadata, and outbox.
7. Add Timeline projection storage.
8. Apply isolation, immutability, and uniqueness constraints after deterministic validation.

No Sprint 0 database change is required.

### Migration validation and recovery runbook

Before Sprint 2 migration:

- capture migration status and schema drift;
- back up/branch the development database;
- record counts and maximum issued numbers;
- confirm every source Client, Company, User, and Pricing Project is valid;
- dry-run migrations against a representative database;
- validate seed baseline before writes;
- run concurrency and cross-company constraint tests.

After migration:

- validate row counts and foreign keys;
- verify existing identifiers and snapshots are unchanged;
- verify sequences exceed issued values;
- verify immutable records reject mutation;
- run repository, outbox, Timeline, and regression suites.

Recovery uses forward corrective migrations or database restore. It never renumbers issued records or edits applied migration history.

## Integration boundaries

- Pricing supplies an immutable approved snapshot; Proposal never calculates.
- Client and Contact supply identities and presentation snapshots; Proposal does not own master data.
- Authentication supplies responsible-user and Company context.
- Engagement Type policy supplies direct-Engagement eligibility; UI cannot override it.
- Platform Timeline consumes events and sends no commands.
- Representations consume immutable structured content.
- Agreement handoff consumes accepted Proposal terms; Proposal never assembles legal clauses.

## Deferred implementation

- Proposal aggregate and transition behavior
- repositories and database models
- migrations and seed execution
- application services
- Proposal workspace
- Web/PDF/email renderers
- acceptance workflows
- Timeline outbox and projection
- Agreement and Engagement implementation
- future operating groups

These belong to later ADR-018 sprints.

## Sprint 0 acceptance criteria

| Criterion                                                           | Result | Evidence                                                    |
| ------------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| One typed snapshot contract represents every existing Pricing Model | Passed | Discriminated output union and contract serialization tests |
| Proposal contract imports no Pricing calculator                     | Passed | Proposal contracts have no Pricing-domain import            |
| Initial Engagement Type matrix is complete and versioned            | Passed | ADR-017 matrix and Policy Version 1 constant                |
| Numbering transition preserves existing records                     | Passed | Dual-prefix validation and additive migration runbook       |
| Event types and schema versions are stable before persistence       | Passed | Version 1 event envelope and Proposal event catalog         |

## Known risks

1. Existing Pricing Project records use `EST`, while approved new policy uses `PP`. The additive transition is designed but intentionally not implemented in Sprint 0.
2. Agreement Template names are approved business references but their legal content is not production-ready until legal review.
3. Engagement workflows are policy contracts, not implemented state machines. Future Engagement work must not infer behavior beyond the approved steps.
4. Proposal source eligibility depends on the existing `QUOTED` Pricing Project state. The current Pricing Workspace does not yet expose a quote-transition workflow; Sprint 3 must provide an authorized upstream path or explicitly integrate an existing application service.
5. The existing Client number sequence is Company-scoped while Client numbers are globally unique. This is safe for the single Version 1 Company but requires review before multi-company expansion.

## Product Owner decisions

No unresolved Sprint 0 Product Owner decisions remain.
