# ADR-005: Engagement Foundation Architecture

## Date

2026-07-15

Amended: 2026-07-23

## Status

Product Owner Approved

## Decision summary

Engagement is a separate operational bounded context. Version 1 Engagement Foundation creates one durable, Company-scoped Engagement identity from one retained Agreement Execution through a manual, capability-authorized action.

Every new Engagement begins in the legally neutral state `CREATED_PENDING_ACTIVATION`, labeled **Created — Activation Pending**. Creation records the operational handoff only. It does not activate service delivery, scheduling, billing, tasks, milestones, team assignment, or any other downstream workflow, and it makes no claim that an Agreement is legally binding, legally valid, enforceable, or approved by counsel.

Agreement Execution, Engagement Creation, and Engagement Activation are three separate business events. Activation is a future capability and the gateway into Operations.

This ADR is the canonical architecture for Engagement Foundation. It incorporates Product Owner decisions EF-01 through EF-14 from `docs/Engagement_Foundation_Sprint_0_Contract_Policy_Architecture_Review_Package.md`.

## Context

Cotarion Platform now preserves the implemented path from Pricing through Proposal, Client Decision, Agreement, Electronic Signatures, and Agreement Execution. Sprint 7 deliberately creates no Engagement. Cotarion needs a narrow operational handoff that avoids re-entering upstream facts and does not accidentally initiate work or financial activity.

ADR-017 established that:

- Engagement is a separate operational aggregate;
- it receives an immutable `ENG-######` reference;
- it references an executed Service Agreement rather than copying Agreement content; and
- it cannot enter active delivery without an executed Service Agreement.

The Functional Design Specification limits Version 1 to the initial Engagement record required for future expansion. This ADR defines that initial record and stops before activation or full Engagement Management.

## Governing requirements

Every rule in this ADR must:

1. materially improve the product and help Cotarion Platform succeed; and
2. avoid unnecessary legal exposure and keep the platform on a legally safe path.

The architecture satisfies both requirements by creating a useful, traceable operational identity while preserving source authority, least privilege, factual language, and a hard boundary before operational activation.

## Capability scope

### Included

- Manual creation of one initial Engagement from one eligible Agreement Execution.
- Immutable `ENG-######` business identity.
- Exact source lineage through Agreement, Agreement Version, Proposal, and Proposal Version.
- Company, Client, operating-group, owner, and Engagement Type consistency.
- Universal `CREATED_PENDING_ACTIVATION` initial state.
- Durable idempotency and one Engagement per Execution.
- Append-only factual correction notes with controlled Reason Codes.
- Company-scoped direct read models and server-projected permitted actions.
- Permanent authoritative record and audit history.

### Excluded

- automatic Engagement creation;
- Activation;
- service delivery or delivery authorization;
- tasks, milestones, deliverables, meetings, schedules, work plans, or team assignment;
- billing enablement, billing schedules, invoices, charges, payments, refunds, or collections;
- renewals, extensions, cancellation, termination, or supersession;
- Agreement interpretation or legal-effect decisions;
- signer evidence, Agreement evidence, or Execution actor duplication;
- notifications, client communications, public endpoints, or client portal behavior;
- full Engagement Management.

These are intentional capability boundaries.

## Domain boundary

Engagement owns:

- Engagement identity and permanent reference;
- initial operational status;
- immutable upstream references;
- initial owner reference;
- creation evidence;
- correction-note evidence; and
- future operational lifecycle only after separately approved architecture.

Engagement does not own:

- Proposal content, pricing, Client Decisions, or Proposal lifecycle;
- Agreement text, versions, artifacts, signature evidence, or Execution evidence;
- Client master data;
- user or role administration;
- legal interpretation;
- billing, payment, scheduling, task, milestone, or delivery behavior.

Source references provide traceability. Source bounded contexts remain authoritative.

## Creation contract

The stable boundary contract is `CreateEngagementFromAgreementExecutionV1`.

The authenticated internal caller supplies only:

- `companyId`;
- `agreementExecutionId`;
- durable `requestIdentity`; and
- `correlationId`.

The caller cannot supply the Engagement number, Client, operating group, owner, Proposal, Proposal Version, Agreement, Agreement Version, Engagement Type, status, Execution timestamp, or legal characterization.

The application resolves:

```text
AgreementExecution
  -> AgreementVersion
  -> Agreement
  -> accepted Proposal Client Decision
  -> ProposalVersion
  -> Proposal
  -> EngagementTypePolicyVersion
```

Creation fails closed when the graph is missing, ambiguous, inconsistent, or outside the authenticated Company.

One successful transaction creates:

1. one Engagement;
2. one immutable `ENG-######` number;
3. one immutable source-lineage record;
4. one `ENGAGEMENT_CREATED_PENDING_ACTIVATION` event; and
5. one durable command receipt.

It produces no other record or side effect.

## Engagement identity

The minimum Engagement identity is:

- internal opaque `id`;
- immutable `engagementNumber`;
- immutable `companyId`;
- immutable `clientId`;
- immutable `operatingGroupId`;
- immutable initial `ownerId`;
- immutable `engagementTypePolicyVersionId`;
- immutable Engagement Type code snapshot;
- immutable `agreementId`;
- immutable `agreementVersionId`;
- immutable unique `agreementExecutionId`;
- immutable `sourceProposalId`;
- immutable `sourceProposalVersionId`;
- `status`;
- immutable `createdAt`;
- immutable `createdByUserId`; and
- immutable creation `correlationId`.

This Version 1 path always originates from a Proposal and the exact Proposal Version used to generate the Agreement. Future direct or no-Proposal Engagement paths require separate architecture, business rules, permissions, and Product Owner approval.

## Permanent Engagement number

Every Engagement receives a globally allocated `ENG-######` reference:

- at least six numeric digits;
- allocated atomically;
- globally unique;
- immutable;
- never reused; and
- permitted to contain gaps.

The number is a neutral business identifier. It conveys no Company, Client, operating group, consultant, date, status, legal priority, authorization, or business meaning. Its allocation order is not a legal or operational chronology guarantee.

## Field authority

| Engagement fact                 | Authority                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Company                         | Agreement Execution, verified across the complete source graph and authenticated actor |
| Client                          | Source Proposal                                                                        |
| Operating group                 | Source Proposal                                                                        |
| Initial owner                   | Source Proposal                                                                        |
| Proposal and Proposal Version   | Agreement, verified against Proposal persistence                                       |
| Agreement and Agreement Version | Agreement Execution                                                                    |
| Agreement Execution             | Manual creation command selection, resolved server-side                                |
| Engagement Type Policy Version  | Source Proposal                                                                        |
| Initial status                  | This ADR                                                                               |
| Engagement number               | Engagement number allocator                                                            |
| Creation actor                  | Authenticated caller                                                                   |
| Creation time                   | Platform clock at atomic commit                                                        |

The Proposal owner is the initial Engagement owner for operational accountability only. It does not imply contract authority, signer identity, legal representation, or personal legal responsibility.

If the Proposal owner is no longer eligible to own Engagements, creation fails safely. The platform cannot substitute another user or assign the creation actor. Reassignment is a separate future capability.

Current display names may be resolved for presentation but are not authoritative Engagement facts.

## Consistency invariants

Creation requires:

1. an active authenticated actor in the requested Company;
2. `engagement:create-from-execution`;
3. one retained Agreement Execution in that Company;
4. exact Agreement and Agreement Version relationships;
5. exact Proposal and Proposal Version relationships;
6. one Company across actor, Execution, Agreement Version, Agreement, Proposal Version, Proposal, Client, owner, operating group, and Engagement Type Policy Version;
7. the Proposal Client as the Engagement Client;
8. the Proposal operating group as the Engagement operating group;
9. the eligible Proposal owner as the initial Engagement owner;
10. the exact Engagement Type Policy Version retained by the Proposal;
11. Agreement-owned Execution determination, artifact checksum, signer information, Execution actor, and other evidence remain in the Agreement boundary and are not copied or cached by Engagement;
12. no existing Engagement for the Execution;
13. an unused request identity or exact replay; and
14. `CREATED_PENDING_ACTIVATION` as the non-overridable initial state.

Creation cannot mutate an upstream record or trigger an excluded workflow.

## Initial status

Machine code:

`CREATED_PENDING_ACTIVATION`

Business label:

**Created — Activation Pending**

Factual description:

**Initial Engagement record created from retained Agreement Execution evidence. Service delivery has not been activated.**

The status is not active, billable, scheduled, in progress, completed, or terminated. It is not a conclusion about Agreement validity or enforceability and is not authorization to begin work.

Version 1 defines no transition out of this state.

## Manual creation

Agreement Execution makes an Engagement eligible for creation but does not create one. An authorized internal user must deliberately invoke **Create Engagement**.

The action is an operational checkpoint, not a legal or contractual decision. It records the requesting actor and complete command trace.

A future configurable automatic-creation capability requires separate architecture and Product Owner approval. It cannot remove or replace the manual capability.

## Commands

### `CreateEngagementFromAgreementExecution`

Requires `engagement:create-from-execution`, resolves all business facts server-side, enforces every invariant, commits atomically, and emits `ENGAGEMENT_CREATED_PENDING_ACTIVATION`.

### `RecordEngagementCorrectionNote`

Requires `engagement:record-correction-note` and accepts:

- Company and Engagement identity;
- one approved Reason Code;
- optional concise factual comment;
- request identity; and
- correlation identity.

The command appends immutable evidence. It cannot modify identity, lineage, ownership, status, upstream records, or a prior note. Clarification requires another note.

### Supersession

Supersession is deferred in full. Version 1 defines no supersession command, capability, status, event, workflow, approval, or review policy.

## Correction-note policy

Approved codes:

- `SOURCE_REFERENCE_REVIEW_REQUIRED`;
- `CLIENT_OR_OPERATING_GROUP_REVIEW_REQUIRED`;
- `OWNER_ELIGIBILITY_REVIEW_REQUIRED`;
- `ENGAGEMENT_TYPE_REVIEW_REQUIRED`;
- `DISPLAY_INFORMATION_REVIEW_REQUIRED`; and
- `GENERAL_DATA_QUALITY_REVIEW_REQUIRED`.

A code means only that operational review is required. It does not determine fault, correctness, legal effect, or final resolution.

The optional comment must be objective, concise, factual, and operational. It cannot contain legal opinions, contractual interpretations, or subjective commentary.

## Events and audit

### `ENGAGEMENT_CREATED_PENDING_ACTIVATION`

Preserves the Engagement, Company, Client, operating group, initial owner, Engagement Type Policy Version, Proposal, Proposal Version, Agreement, Agreement Version, Execution, creation actor, timestamp, correlation, and factual versioned metadata.

### `ENGAGEMENT_CORRECTION_NOTE_RECORDED`

Preserves the Engagement, Reason Code, optional comment, actor, timestamp, request identity, and correlation identity.

Events and command receipts are immutable, Company-scoped, and permanently retained as authoritative business evidence.

## Idempotency and uniqueness

- `agreementExecutionId` is unique across Engagements.
- `(companyId, requestIdentity)` identifies one command intent.
- Exact replay returns the original result.
- Conflicting reuse fails.
- Concurrent creation for the same Execution produces one Engagement and one creation event.
- Number allocation, Engagement, lineage, event, and command receipt commit atomically.

## Permission boundary

Stable capabilities:

- `engagement:view`;
- `engagement:create-from-execution`; and
- `engagement:record-correction-note`.

Authority is capability-based rather than role-name-based. Founder and Admin inherit capabilities through ADR-019. The UI consumes server-projected permitted actions and never infers authority from role names.

`engagement:view` permits approved Company-scoped operational Engagement information only. It does not grant all underlying Agreement or Execution evidence.

Capability assignment and inheritance follow ADR-019 and approved authority configuration; no role logic may be invented in the Engagement domain or UI.

## Read models

Direct Company-scoped CQRS projections provide:

- Engagement list with stable pagination and approved filters;
- Engagement detail;
- creation and correction-note history; and
- Agreement Execution creation eligibility.

The Engagement detail exposes only:

- Engagement identity and pending status;
- Client, operating group, initial owner, and Engagement Type;
- Proposal and Proposal Version references;
- Agreement and Agreement Version references;
- Agreement Execution reference and timestamp;
- creation actor and timestamp;
- correction-note history; and
- server-authoritative permitted actions.

It does not duplicate or cache signer information, signature evidence, Execution actor information, Agreement artifacts, or Agreement evidence. Authorized navigation to the source invokes the Agreement subsystem's own permissions.

## Factual language

Approved phrases include:

- “Engagement record created”;
- “Created — Activation Pending”;
- “Linked Agreement Execution evidence”;
- “Agreement execution recorded on [date]”; and
- “Service delivery has not been activated.”

The platform cannot describe the Agreement or Engagement as legally binding, legally valid, enforceable, counsel-approved, authorized to begin work, services commenced, or payment legally due.

Engagement does not calculate or display a legal-effect date.

## Activation boundary

Agreement Execution records commercial evidence. Engagement Creation establishes the operational record. Activation authorizes the Engagement to enter operational workflow.

Activation is a separate future business capability and the gateway into Operations. Task management, scheduling, milestones, team assignment, delivery workflow, billing enablement, and other downstream operational processes can occur only after a separately approved Activation capability.

Version 1 contains no activation command, permission, or automatic transition.

## Retention and exceptional access

Permanent authoritative records include:

- Engagement identity;
- immutable lineage;
- creation and command evidence;
- audit history; and
- correction notes.

They cannot be edited or deleted through ordinary behavior.

Supporting or derived data—including caches, temporary exports, notifications, search indexes, and generated views—may follow future retention policies without affecting the permanent business record.

Founder or Admin status alone does not bypass normal authorization. Future exceptional access requires:

- explicit capability;
- documented business purpose;
- least-privilege scope;
- permanent evidence of requester, approver where applicable, information accessed, and access time.

Detailed legal-hold and exceptional-access workflows are separate future capabilities.

## Release governance

Implementation readiness and production readiness are distinct.

Engineering, testing, architecture validation, and Product Owner acceptance may occur before upstream legal and operational reviews are complete. Production release requires every applicable gate, including:

- Architecture approval;
- Product Owner approval;
- operational readiness; and
- legal review where applicable.

Completion of a gate does not authorize claims of universal legal validity or enforceability.

This release-gate model should be applied to future bounded contexts where appropriate.

## Explicit reconciliation of prior guidance

ADR-017 remains authoritative for the separation of Proposal, Agreement, and Engagement and for the rule that an active Engagement requires an executed Service Agreement.

The earlier Engagement Type Policy Version 1 contracts contain workflow-specific initial states such as `PRICING_PROJECT` and `DIRECT_CREATED`, and Project/Retainer workflows include `AGREEMENT_EXECUTED` followed by `ACTIVE`. Those policies were Proposal Sprint 0 configuration contracts drafted before this approved Engagement Foundation.

This ADR does not rewrite historical policy files or implemented Proposal records. For future Engagement creation:

- `CREATED_PENDING_ACTIVATION` is the only initial Engagement aggregate state;
- pre-Engagement commercial workflow codes remain upstream/configuration history and are not Engagement creation states;
- `ACTIVE` remains unreachable until the future Activation capability is approved; and
- a forward, versioned Engagement Type policy reconciliation is required before implementation.

ADR-017's general statement that every Engagement ultimately references an executed Service Agreement is narrowed for this Version 1 path to an exact retained Agreement Execution, Agreement Version, Agreement, Proposal Version, and Proposal lineage. This strengthens traceability without changing the accepted separation of domains.

## Consequences

### Positive

- Completes the commercial-to-operational handoff.
- Prevents manual re-entry and inconsistent provenance.
- Creates durable operational accountability.
- Preserves bounded-context ownership and least privilege.
- Prevents creation from starting work or financial activity.
- Establishes a safe foundation for later Activation and Operations.

### Costs

- Requires an explicit manual action.
- Requires forward reconciliation of Engagement Type policy versions.
- Does not yet provide an active operational workflow.
- Requires separate future capabilities for reassignment, supersession, Activation, delivery, and financial operations.

## Implementation and roadmap status

Product Owner approval authorizes this canonical architecture and roadmap preparation. It does not authorize application code, persistence, migrations, APIs, UI, testing, Activation, downstream operations, or production release.

The proposed implementation roadmap requires Product Architect and Product Owner review before the capability may advance to `Roadmap Approved`.

## Related records

- ADR-000: Cotarion Product Development Methodology
- ADR-012: Permanent Document Retention
- ADR-015: Application Users Belong to One Company Workspace
- ADR-017: Proposal Management Business Architecture
- ADR-019: Platform Governance Decision Authority
- ADR-020: Platform Role Administration
- `docs/Agreement_Execution_Sprint_7.md`
- `docs/Engagement_Foundation_Sprint_0_Contract_Policy_Architecture_Review_Package.md`
- `docs/Functional_Design_Specification.md`
- `docs/product/capability-tracker.md`
