# Proposal Management Sprint 3.4 API Review Package

Date: 2026-07-21

Status: Implementation complete — awaiting Product Architect and Product Owner review

Scope: Authenticated Proposal HTTP adapters only

## 1. API architecture summary

Sprint 3.4 adds two dynamic Next.js Route Handler entry points and one shared HTTP adapter. The routes obtain authentication and consume only the Sprint 3.3A production composition. They do not construct or import repositories, Prisma clients, capability evaluators, actor providers, authority repositories, application services, or query services.

The adapter translates HTTP input into `ProposalQueryService` reads or `ProposalApplicationService` commands. It owns structural request validation, correlation/request identities, public response serialization, error/status mapping, timing, and structured request logs.

No Proposal eligibility, lifecycle, governance, reviewer-independence, pricing, acceptance, replacement, or supersession decision exists in the API layer.

## 2. Endpoint inventory

### Collection

| Method | Endpoint | Operation |
| --- | --- | --- |
| `GET` | `/api/proposals` | List Company Proposals |
| `POST` | `/api/proposals` | Create Proposal |

### Proposal resource and commands

| Method | Endpoint | Operation |
| --- | --- | --- |
| `GET` | `/api/proposals/{proposalId}` | Load Proposal |
| `PATCH` | `/api/proposals/{proposalId}/draft` | Update Draft |
| `POST` | `/api/proposals/{proposalId}/versions` | Save Proposal Version |
| `POST` | `/api/proposals/{proposalId}/quality-review` | Request Quality Review |
| `POST` | `/api/proposals/{proposalId}/request-changes` | Request Changes |
| `POST` | `/api/proposals/{proposalId}/submit/quality-review` | Submit through Quality Review |
| `POST` | `/api/proposals/{proposalId}/submit/executive-authorization` | Submit through Executive Authorization |
| `POST` | `/api/proposals/{proposalId}/viewed` | Record Proposal Viewed |
| `POST` | `/api/proposals/{proposalId}/acceptances/client` | Record Client Acceptance |
| `POST` | `/api/proposals/{proposalId}/acceptances/verbal` | Record Verbal Acceptance |
| `POST` | `/api/proposals/{proposalId}/acceptances/withdraw` | Withdraw Acceptance |
| `POST` | `/api/proposals/{proposalId}/agreement` | Link Executed Agreement |
| `POST` | `/api/proposals/{proposalId}/decline` | Decline Proposal |
| `POST` | `/api/proposals/{proposalId}/expire` | Expire Proposal |
| `POST` | `/api/proposals/{proposalId}/replacements` | Create Replacement Proposal |
| `POST` | `/api/proposals/{proposalId}/supersede` | Supersede Original Proposal |
| `POST` | `/api/proposals/{proposalId}/archive` | Archive Proposal |

## 3. Authentication and Company flow

```text
HTTP Request
→ NextAuth server session
→ AuthenticatedIdentity
→ x-company-id request scope
→ production Proposal composition
→ actor-context and Company validation
→ query/application service
```

An absent session returns `401`. The production actor adapter remains responsible for mapping identity to active Application User membership. A request for another Company is rejected by the application/query boundary. Authentication-provider concepts are not passed into the domain.

## 4. Validation strategy

Validation occurs before service invocation and enforces:

- maximum one-megabyte JSON body;
- valid JSON object payloads;
- UUID Proposal, Request Identity, and correlation identifiers;
- bounded stable identifiers for Company, Client, owner, recipient, Agreement, Pricing, and configuration references;
- ISO timestamps;
- Proposal status, Engagement Type, Pricing Model, operating-group, and Pricing-source enums;
- required Proposal, Pricing snapshot, Engagement Type policy, governance, acceptance, and replacement fields;
- Draft recipient structure and limits;
- commercial-term string structure;
- supported Draft fields;
- pagination limits from 1 through 100; and
- the approved status, Client, and owner filters only.

Validation checks transport shape and enum syntax. Domain and application layers remain authoritative for business meaning and legal transitions.

## 5. Response model

Read endpoints return serialization-safe query read models. Command endpoints return a public Proposal summary containing stable identity, permanent number, Company/Client/owner references, title, lifecycle state, version summaries, timestamps, replacement relationships, and Agreement reference.

Responses do not expose aggregate persistence state, Draft content, Pricing details, event streams, outbox records, audit storage, Prisma errors, SQL, stack traces, or repository details.

## 6. Error mapping

| Application code | HTTP status |
| --- | --- |
| `NOT_AUTHENTICATED` | `401` |
| `CAPABILITY_DENIED` | `403` |
| `COMPANY_SCOPE_VIOLATION` | `403` |
| `PROPOSAL_NOT_FOUND` | `404` |
| `INVALID_REQUEST` | `400` |
| `DOMAIN_RULE_VIOLATION` | `409` |
| `OPTIMISTIC_CONCURRENCY_CONFLICT` | `409` |
| `IMMUTABLE_PERSISTENCE_CONFLICT` | `409` |
| `AUTHORITY_CONFIGURATION_MISSING` | `409` |
| `AUTHORITY_CONFLICT` | `409` |
| `TRANSACTION_FAILURE` | `500` |

Unexpected exceptions become a generic `TRANSACTION_FAILURE` response. Server failures never include their internal message.

## 7. Idempotency strategy

Clients may supply a UUID `Idempotency-Key`. When absent, the API creates a UUID Request Identity. That identity is passed unchanged to the application service, whose event-based replay behavior returns the original persisted Proposal outcome.

The API does not implement an alternate replay store and therefore cannot bypass application-level exactly-once Submission, acceptance, replacement, or supersession behavior.

## 8. Observability

Every response includes:

- `x-correlation-id`;
- `x-request-id`; and
- `Server-Timing` application duration.

Clients may provide a UUID `x-correlation-id`; otherwise one is generated. Structured logs include method, path, status, correlation ID, request ID, and elapsed milliseconds. Proposal content and Pricing details are never logged.

## 9. Test coverage and validation

Sixteen API tests cover:

- load and list reads;
- pagination and approved filtering;
- all 17 command endpoints, including creation;
- authenticated and unauthenticated requests;
- Company-scope rejection;
- malformed JSON and oversized payloads;
- invalid identifiers, UUID headers, pagination, and filters;
- public response serialization;
- every required application-error mapping;
- suppression of stack, SQL, and internal error details;
- Request Identity propagation and replay indicator;
- correlation and request response headers;
- execution timing; and
- structured log metadata.

| Validation | Result |
| --- | --- |
| Focused API suite | Passed — 16 tests |
| Proposal query tests | Passed — 5 tests |
| Proposal application tests | Passed — 11 tests |
| Proposal persistence integration | Passed — 6 tests |
| Authority integration | Passed — 1 comprehensive test |
| Proposal domain tests | Passed — 28 tests including value objects |
| Full database-backed Vitest suite | Passed — 145 tests across 21 files |
| TypeScript `tsc --noEmit` | Passed |
| ESLint | Passed without warnings |
| Production Next.js build | Passed; both Proposal routes compiled |
| `git diff --check` | Passed; line-ending notices only |

One focused test attempt was blocked by the Windows sandbox with `spawn EPERM`. The same focused suite passed immediately when rerun with permission to start the test-runner child process. This was environmental, not an implementation failure. Existing Vite CJS, PostgreSQL SSL-mode, and `pg` concurrency warnings remain non-failing upstream warnings.

## 10. ADR compliance

- ADR-017: HTTP exposes Proposal identities, lifecycle projections, versions, acceptance commands, replacements, and Agreement references without moving rules from the domain.
- ADR-018: Sprint 3 submission commands remain business events; no delivery or representation work exists.
- ADR-019: the API invokes capability-governed application services and never performs role or governance decisions.
- ADR-020: Company authority stays behind the production actor and capability adapters.
- ADR-021: Pricing snapshots are structurally validated and passed downstream; the API never calculates, approves, or mutates Pricing.

The domain and persistence layers remain HTTP-ignorant.

## 11. Files changed for Sprint 3.4

- `src/interfaces/http/proposals/proposal-http-adapter.ts`
- `src/interfaces/http/proposals/proposal-http-adapter.test.ts`
- `src/interfaces/http/proposals/production-proposal-http.ts`
- `src/app/api/proposals/route.ts`
- `src/app/api/proposals/[...path]/route.ts`
- `docs/Proposal_Management_Sprint_3_4_API_Review_Package.md`

No schema, migration, Proposal domain, persistence, authority, or application-service behavior was changed for Sprint 3.4.

## 12. Scope confirmation

No React, Workspace UI, component, PDF, HTML representation, email, notification, portal, dashboard, reporting, analytics, search UI, delivery, or Sprint 4 behavior was implemented.

Sprint 3.4 is complete and awaits Product Architect and Product Owner review.
