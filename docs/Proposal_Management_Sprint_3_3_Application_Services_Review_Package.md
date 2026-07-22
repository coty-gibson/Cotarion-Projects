# Proposal Management Sprint 3.3 Application Services Review Package

Date: 2026-07-21

Status: Implementation complete — awaiting Product Architect and Product Owner review

Scope: Proposal application orchestration and transaction composition only

## 1. Application-service architecture summary

Sprint 3.3 introduces one `ProposalApplicationService` with explicit command methods. It depends only on application-layer ports for authenticated actor resolution, effective capability evaluation, Proposal persistence, unit-of-work execution, and identity generation.

Every protected command follows the same boundary:

1. resolve an active authenticated Application User;
2. reject a requested Company outside that actor's Company;
3. evaluate the required effective capability;
4. execute inside a Proposal unit of work;
5. load aggregates through Company-scoped repository methods;
6. construct command and governance evidence;
7. invoke the Proposal domain behavior; and
8. save using the loaded aggregate revision.

The application layer contains no Proposal lifecycle transition tables, pricing calculations, reviewer-independence rules, expiration rules, acceptance eligibility rules, or supersession rules. Those remain in the domain.

## 2. Command-handler inventory

Implemented commands:

- Create Proposal
- Update Draft
- Save Proposal Version
- Request Quality Review
- Request Changes
- Submit through Quality Review
- Submit through Executive Authorization
- Record Proposal Viewed
- Record Client Acceptance
- Record Verbal Acceptance
- Withdraw Acceptance
- Link Executed Agreement
- Decline Proposal
- Expire Proposal
- Create Replacement Proposal
- Supersede Original Proposal
- Archive Proposal

No query screens, APIs, routes, server actions, or UI were added.

## 3. Capability and governance flow

The application layer defines stable Proposal capability identifiers rather than branching on Founder, Admin, or Member names during command execution. `DefaultProposalCapabilityEvaluator` maps the approved Version 1 role defaults: Member receives standard Proposal workflow capabilities, while Admin and Founder add Quality Review and Executive Authorization. An authority provider may supply future additive capabilities without changing the domain.

Quality Review submission requires `proposal:quality-review`. The service identifies the actor as reviewer and passes `QUALITY_REVIEW` evidence to the aggregate. The domain independently enforces the review state and creator/reviewer independence.

Executive Authorization requires `proposal:executive-authorize`. The service requires nonblank Business Justification and constructs `EXECUTIVE_AUTHORIZATION` evidence identifying the actor. Role names never enter the Proposal domain.

Authentication, membership lookup, role administration, and capability storage remain outside this sprint behind application ports.

## 4. Transaction strategy

`ProposalUnitOfWork` defines an application-facing transaction boundary. The Prisma implementation creates one transaction-scoped repository for the entire callback.

- Standard commands load and save one aggregate in one unit of work.
- Create and replacement workflows perform event-replay lookup, identity allocation, aggregate construction, and insertion in one unit of work.
- Supersession loads both original and replacement through the same Company-scoped repository, invokes the original aggregate's supersession behavior, and saves the original within the same transaction.
- The replacement is not superseded or otherwise mutated.
- Any error aborts the unit of work; database-backed tests execute the full replacement/supersession workflow within a rollback-only transaction scope.

The repository continues to atomically persist root state, versions, events, and outbox records.

## 5. Idempotency strategy

External request identifiers are normalized into stable Proposal event identifiers. Before an event-producing command executes, the service checks the aggregate history for that identifier.

- A retry with the same identifier and expected event type returns the persisted aggregate as an idempotent replay without saving.
- Reuse of an identifier for another command is rejected as `INVALID_REQUEST`.
- Creation and replacement retries locate the aggregate through the repository's Company-scoped event lookup before allocating another identity.
- Submission and acceptance retries therefore cannot create a second Submission Event, acceptance, version, or immutable history record.
- If an optimistic-concurrency response is retried after another attempt committed, event lookup converts the retry into a replay; otherwise the command reloads current state and executes against the current revision.

Draft update and Agreement-link commands do not emit domain events and are not represented as event-idempotent commands. Their repeated execution remains protected by domain rules and optimistic concurrency.

## 6. Error model summary

`ProposalApplicationError` preserves these categories:

- `NOT_AUTHENTICATED`
- `PROPOSAL_NOT_FOUND`
- `COMPANY_SCOPE_VIOLATION`
- `CAPABILITY_DENIED`
- `INVALID_REQUEST`
- `DOMAIN_RULE_VIOLATION`
- `OPTIMISTIC_CONCURRENCY_CONFLICT`
- `IMMUTABLE_PERSISTENCE_CONFLICT`
- `TRANSACTION_FAILURE`

Known domain and persistence errors retain their original error as `cause`. Authorization failures, domain invariant failures, concurrency conflicts, immutable-history conflicts, and unexpected transaction failures are not flattened together.

## 7. Test coverage

Eleven focused application-service tests cover:

- Company-scoped creation and repository access;
- Version 1 Member, Admin, and Founder default capability mapping;
- inactive authentication, Company mismatch, and capability denial;
- Quality Review evidence and reviewer independence;
- Executive Authorization and Business Justification;
- request changes and domain-owned transition enforcement;
- Proposal viewing, Client acceptance replay, withdrawal, and Agreement link;
- verbal acceptance, decline, expiry, and archive orchestration;
- idempotent creation and replacement;
- exactly one Submission Event;
- atomic supersession and rollback on persistence failure;
- optimistic concurrency, immutable conflict, and transaction error translation; and
- rejection of duplicate request identifiers used for a different command.

The in-memory unit-of-work double snapshots its state and commits only after successful completion, preserving realistic transaction and revision behavior. A database-backed integration test additionally exercises application-level creation, submission, replacement replay, replacement submission, and supersession through the real Prisma transaction-scoped repository.

## 8. Validation results

| Validation | Result |
| --- | --- |
| Focused application-service suite | Passed — 11 tests |
| Proposal domain plus application suites | Passed — 34 tests across 3 files |
| Proposal persistence integration suite | Passed — 6 tests |
| Full database-backed Vitest suite | Passed — 123 tests across 18 files |
| TypeScript `tsc --noEmit` | Passed |
| ESLint | Passed with no errors or warnings |
| Production Next.js build | Passed |
| `git diff --check` | Passed; line-ending notices only |

No tests were skipped. The database runs emitted existing PostgreSQL SSL-mode, `pg` concurrency deprecation, and Vite CJS deprecation warnings; these were environmental/upstream warnings rather than implementation failures.

## 9. ADR compliance summary

### ADR-017

- Application orchestration preserves Proposal as the aggregate root.
- All lifecycle and immutable-version rules remain domain-owned.
- Submission binds and records exactly one submitted version and event.
- Replacement and supersession preserve both immutable submission histories.

### ADR-018

- Sprint 3 commands stop at Proposal business state and Submission Event persistence.
- No representation generation, publication, delivery, retries, or communication history was implemented.

### ADR-019

- Quality Review and Executive Authorization are explicit governance paths.
- Business Justification is required for Executive Authorization.
- Capability checks precede protected work, while author/reviewer evidence is permanent in domain events.

### ADR-020

- Authority is evaluated as effective Company-scoped capabilities.
- Founder/Admin role names, bootstrap, transfer, recovery, and role storage remain outside Proposal domain and application behavior.

### ADR-021

- Create and replacement inputs carry the approved immutable Pricing snapshot into the domain.
- Application services never calculate, approve, reject, archive, or mutate Pricing.

## 10. Files changed for Sprint 3.3

- `src/application/proposals/proposal-capabilities.ts`
- `src/application/proposals/proposal-application-errors.ts`
- `src/application/proposals/proposal-application-service.ts`
- `src/application/proposals/proposal-application-service.test.ts`
- `src/application/proposals/proposal-repository.ts`
- `src/infrastructure/database/proposal-repository.ts`
- `src/infrastructure/database/proposal-repository.integration.test.ts`
- `docs/Proposal_Management_Sprint_3_3_Application_Services_Review_Package.md`

The infrastructure changes only implement the application-approved `findByEventId` and `ProposalUnitOfWork` abstractions. No schema or migration change was required for Sprint 3.3.

## 11. Explicitly deferred

- API routes and Next.js route handlers
- server actions
- React and UI workspaces
- PDF or HTML representations
- email and portal publication
- delivery attempts, tracking, and read receipts
- background jobs
- reporting and search screens
- Sprint 4 behavior

Sprint 3.3 stops at the application boundary and awaits Product Architect and Product Owner review.
