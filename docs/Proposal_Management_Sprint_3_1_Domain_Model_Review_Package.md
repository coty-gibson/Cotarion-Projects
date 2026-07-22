# Proposal Management Sprint 3.1 Domain Model Review Package

Date: 2026-07-21

Status: Implementation complete — awaiting Product Architect and Product Owner review

Scope: Proposal domain layer and domain unit tests only

## 1. Domain model summary

Sprint 3.1 implements the approved Proposal business model as a pure TypeScript domain with no framework, database, repository, API, route, UI, or infrastructure dependency.

The existing Sprint 1 aggregate was reconciled with Proposal Management Architecture v1.0. The material changes replace boolean governance bypasses and in-place resubmission with:

- explicit Quality Review or Executive Authorization evidence;
- reviewer-independence enforcement;
- mandatory Business Justification for Executive Authorization;
- exactly one submission transition and Submission Event per Proposal;
- immutable submitted-version binding; and
- separately identified replacement Proposals for revised offers.

## 2. Aggregate structure

### Proposal aggregate root

`ProposalAggregate` owns:

- immutable Proposal identity and `PRO-######` number;
- Company, Client, owner, Consulting operating-group, and Engagement Type identity;
- one frozen eligible Pricing snapshot;
- mutable Draft state only while status is `DRAFT`;
- immutable sequential Proposal Versions;
- Quality Review state;
- submitted-version binding;
- lifecycle status and business dates;
- acceptance, withdrawal, Agreement-link, supersession, and archival evidence; and
- append-only immutable Proposal events.

### ProposalVersion immutable child

ADR-017 defines `ProposalVersion` as an immutable child record owned by the Proposal aggregate, not an independently mutable aggregate root. Sprint 3.1 preserves that boundary.

Each version contains:

- unique identity and Proposal identity;
- Proposal-local positive sequential number;
- creator and creation timestamp;
- predecessor and revision rationale;
- complete frozen Draft content, commercial terms, recipients, and expiration evidence; and
- the immutable Pricing snapshot.

The aggregate exposes a computed `SAVED | SUBMITTED` version status. Binding one version as submitted does not mutate the version content.

### Value objects

- `ProposalNumber` validates and normalizes permanent `PRO-######` identifiers.
- `ProposalTitle` normalizes and requires a non-empty business title.
- `ProposalVersionNumber` enforces positive safe-integer sequencing.
- `ProposalVersionStatus` distinguishes saved versions from the one bound submitted version.

## 3. Lifecycle behavior

Implemented Proposal statuses retain the frozen codes:

- `DRAFT`
- `INTERNAL_REVIEW` as the compatibility code for Quality Review
- `SUBMITTED`
- `VIEWED`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`
- `SUPERSEDED`
- `ARCHIVED`

Key rules:

1. Only Draft content is editable.
2. Review and submission require a current immutable version matching the current Draft revision.
3. Quality Review requires an identified reviewer different from the version creator.
4. Executive Authorization requires an identified author and non-empty Business Justification.
5. Submission requires an authorized recipient and an unexpired version.
6. Submission binds one immutable version, transitions to `SUBMITTED`, and emits exactly one Submission Event.
7. A submitted Proposal cannot be reopened, edited, or submitted again.
8. Revised offers use a new replacement Proposal linked to the original.
9. A source Proposal can be superseded only by its submitted same-Company, same-Client replacement.
10. Acceptance does not transfer to a replacement Proposal.
11. Historical versions, acceptances, withdrawals, and events remain immutable.

## 4. Submission governance

The `submit` command accepts an explicit domain authorization outcome rather than roles or a boolean bypass:

- `QUALITY_REVIEW` records the reviewer and enforces creator independence.
- `EXECUTIVE_AUTHORIZATION` records the author and Business Justification.

The application layer will eventually decide whether an authenticated user holds the required capability. The domain enforces the supplied evidence and lifecycle invariants without importing authentication infrastructure or role enums.

Submission event metadata includes:

- submitted Proposal Version;
- Submission Method;
- Review Method;
- author/reviewer identity;
- Business Justification when applicable; and
- replaced Proposal identity when applicable.

No representation generation, publication, delivery, delivery attempt, or read-receipt behavior exists in this sprint.

## 5. Replacement Proposal behavior

`createReplacement` creates a distinct Draft Proposal from the immutable submitted version of an eligible source Proposal.

- The replacement has its own identity and permanent Proposal number.
- Company, Client, Engagement Type, and source history remain compatible.
- A new eligible Pricing snapshot may be supplied; otherwise the frozen source snapshot is copied.
- The original submitted version and acceptance history remain unchanged.
- The replacement begins with no acceptance.
- The original is superseded only after the linked replacement is independently submitted.
- An unrelated Proposal cannot supersede the original.
- A Proposal linked to an executed Agreement cannot be replaced or superseded.

## 6. Domain events

The domain continues to use the frozen Sprint 0 event catalog:

- `PROPOSAL_CREATED`
- `PROPOSAL_VERSION_SAVED`
- `PROPOSAL_INTERNAL_REVIEW_REQUESTED` — compatibility event code for Quality Review
- `PROPOSAL_CHANGES_REQUESTED`
- `PROPOSAL_SUBMITTED`
- `PROPOSAL_VIEWED`
- `PROPOSAL_ACCEPTED`
- `PROPOSAL_VERBAL_ACCEPTANCE_RECORDED`
- `PROPOSAL_ACCEPTANCE_WITHDRAWN`
- `PROPOSAL_DECLINED`
- `PROPOSAL_EXPIRED`
- `PROPOSAL_SUPERSEDED`
- `PROPOSAL_ARCHIVED`

Events remain deeply frozen, append-only, Company/Client scoped, attributable, and compatible with the frozen platform event envelope.

## 7. Unit test coverage

Proposal domain tests cover:

- Proposal rehydration and state preservation;
- creation and default expiration;
- expiration exceptions;
- Company, Client, Pricing-status, and Pricing-model invariants;
- Proposal Number, Proposal Title, and Proposal Version Number value objects;
- immutable sequential version creation;
- stale Draft/version rejection;
- Quality Review transitions;
- creator/reviewer independence;
- Executive Authorization evidence;
- authorized recipients;
- exactly-one submission and event metadata;
- submitted-version immutability;
- Client and verbal acceptance;
- acceptance withdrawal and Agreement execution boundary;
- replacement Proposal creation and acceptance non-inheritance;
- linked supersession and unrelated-replacement rejection;
- decline, expiration, archive, and illegal transitions;
- Created, Effective, and Closed dates;
- append-only event production; and
- duplicate event rejection without partial mutation.

## 8. Validation results

| Validation | Result |
| --- | --- |
| Focused Proposal domain suite | Passed — 28 tests |
| Complete Vitest suite | Passed — 94 tests; 14 database-dependent tests skipped because no database URL was supplied |
| TypeScript `tsc --noEmit` | Passed |
| ESLint | Passed |
| `git diff --check` | Passed |

## 9. ADR compliance

### ADR-017

- Proposal is the aggregate and system of record.
- Proposal Version content is immutable.
- Company, Client, Pricing, Engagement Type, version, lifecycle, acceptance, supersession, and archival rules remain in the domain.
- A Proposal submits once; revised offers use replacement Proposals.
- Submission precedes and excludes delivery.

### ADR-018

- Sprint 3 submission validation, immutable binding, state transition, and single event are represented in the domain.
- Sprint 4 representation and delivery behavior is absent.

### ADR-019

- Quality Review is independent.
- Executive Authorization is an approved explicit path, not a boolean override.
- Business Justification and attributable audit metadata are required.
- Domain logic consumes authorization outcomes without importing roles or UI checks.

### ADR-020

- Authority remains Company-scoped.
- The domain does not implement role administration or Founder bootstrap.
- Capability decisions remain an application-boundary responsibility.

### ADR-021

- Proposal accepts only one frozen `QUOTED` Pricing source snapshot.
- Proposal never recalculates, mutates, reviews, or approves Pricing.
- Pricing remains authoritative.

## 10. Files changed

- `src/domain/proposals/proposal-domain.ts`
- `src/domain/proposals/proposal-domain.test.ts`
- `src/domain/proposals/proposal-value-objects.ts`
- `src/domain/proposals/proposal-value-objects.test.ts`
- `docs/Proposal_Management_Sprint_3_1_Domain_Model_Review_Package.md`

## 11. Explicitly not implemented

- repositories or persistence changes;
- Prisma schema or migrations;
- application services or capability lookup;
- APIs or routes;
- React or UI;
- representations, PDF, HTML, portal, or email;
- delivery tracking or read receipts; and
- Sprint 3.2 or Sprint 4 work.

## 12. Review gate

Sprint 3.1 is ready for Product Architect and Product Owner review. No later Sprint 3 slice should be inferred as approved by this package.
