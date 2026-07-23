# Engagement Foundation Sprint 0 — Contract, Policy, and Architecture Review Package

Date: 2026-07-23

Status: Product Owner Approved — 2026-07-23

Implementation: Not authorized — documentation only

## 1. Review purpose

This package proposes the minimum contract and architecture for creating an initial Engagement record from existing Agreement Execution evidence. It does not implement or authorize application code, database changes, migrations, routes, UI, tests, activation, or downstream operational workflows.

The package is governed by two requirements:

1. Every rule must materially improve the product and help Cotarion Platform succeed.
2. Every rule must avoid unnecessary legal exposure and keep the platform on a legally safe path.

The proposed capability satisfies both requirements only as a narrow, factual record-creation capability. It connects the completed commercial lifecycle to a durable operational identity without interpreting an agreement, declaring legal enforceability, or starting delivery or financial activity.

## 2. Governing records and authority

This package applies, and does not silently amend, the following records:

- `docs/Agreement_Execution_Sprint_7.md`: Agreement Execution is immutable factual evidence; one Execution exists per Agreement Version; Engagement creation remains downstream.
- `docs/adr/ADR-017-proposal-management-business-architecture.md`: Engagement is a separate operational aggregate, uses `ENG-######`, references an executed Service Agreement, and cannot enter active delivery without that reference.
- `docs/Functional_Design_Specification.md`: Version 1 creates only the initial Engagement record required for future expansion.
- `docs/product/capability-tracker.md`: Engagement Management is in Architecture, has no Product Owner-approved implementation roadmap, and is not started.
- `docs/adr/ADR-005-engagement-lifecycle-architecture.md`: ADR-005 is the canonical Product Owner-approved Engagement Foundation architecture.

ADR-017 remains authoritative wherever this package is silent. Sprint 7 remains authoritative for whether an Agreement Execution exists. This package does not redefine execution eligibility, signature sufficiency, legal consent, Agreement content, or Agreement artifact integrity.

### Approved architecture change

ADR-017 and the existing Version 1 Engagement Type policy contain workflow-specific initial states, but neither defines one universal, legally neutral state for the initial record created after Agreement Execution. This package proposes the new universal initial code:

`CREATED_PENDING_ACTIVATION`

The Product Owner approved this universal initial state through EF-01. ADR-005 is the canonical architecture record. The versioned Engagement Type policies require explicit future reconciliation before implementation; historical policy contracts must not be silently rewritten.

## 3. Capability boundary

### Included

- Create one initial Engagement identity from one retained Agreement Execution.
- Preserve immutable lineage to the Agreement Execution, Agreement Version, Agreement, source Proposal, Client, Company, operating group, owner, and Engagement Type policy version.
- Allocate one immutable `ENG-######` business reference.
- Retain factual creation and correction-note evidence.
- Provide direct, Company-scoped read models for the record and its provenance.
- Project server-authoritative permitted actions.

### Explicitly excluded

This capability does not:

- activate an Engagement;
- authorize or begin service delivery;
- create tasks, milestones, deliverables, schedules, meetings, or work plans;
- create billing schedules, invoices, charges, payments, refunds, or collection activity;
- create renewal, extension, cancellation, or termination behavior;
- interpret Agreement text or determine rights, duties, remedies, effective dates, enforceability, or legal validity;
- declare that signatures or an Agreement are legally binding, legally valid, enforceable, compliant, certified, or counsel-approved;
- alter Agreement, Agreement Version, artifact, Signature, Execution, Proposal, Decision, Pricing, Client, or configuration records;
- send notifications or client communications;
- create a Client portal or public Engagement endpoint;
- implement full Engagement Management.

These exclusions are capability boundaries, not missing implementation tasks.

## 4. Exact Agreement Execution → Engagement creation contract

### 4.1 Contract name

`CreateEngagementFromAgreementExecutionV1`

### 4.2 Caller-supplied command envelope

The authenticated internal caller supplies only:

| Field                  | Purpose                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `companyId`            | Requested Company scope; must match the authenticated actor and every source record |
| `agreementExecutionId` | The sole business source selected for creation                                      |
| `requestIdentity`      | Durable idempotency identity                                                        |
| `correlationId`        | Traceability across the command and emitted event                                   |

The caller must not supply the Engagement number, Client, operating group, owner, source Proposal, Agreement, Agreement Version, Engagement Type, status, execution timestamp, or legal characterization. Those values are resolved from authoritative retained records.

### 4.3 Resolved source contract

Before creation, the application boundary must resolve one immutable source graph:

```text
AgreementExecution
  -> AgreementVersion
  -> Agreement
  -> accepted Proposal Client Decision
  -> ProposalVersion
  -> Proposal
  -> EngagementTypePolicyVersion
```

The resolved contract must provide:

| Field                           | Required source                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `agreementExecutionId`          | Agreement Execution                                                                  |
| `agreementExecutionOccurredAt`  | Agreement Execution `executedAt`                                                     |
| `agreementVersionId`            | Agreement Execution and Agreement Version                                            |
| `agreementVersionNumber`        | Agreement Version                                                                    |
| `agreementId`                   | Agreement Execution, Agreement Version, and Agreement                                |
| `agreementNumber`               | Agreement                                                                            |
| `companyId`                     | Agreement Execution, Agreement Version, Agreement, Proposal, and authenticated actor |
| `clientId`                      | Proposal                                                                             |
| `operatingGroupId`              | Proposal                                                                             |
| `ownerId`                       | Proposal                                                                             |
| `sourceProposalId`              | Agreement and Proposal                                                               |
| `sourceProposalVersionId`       | Agreement and Proposal Version                                                       |
| `engagementTypePolicyVersionId` | Proposal                                                                             |
| `engagementTypeCode`            | Referenced Engagement Type Policy Version                                            |

Resolution must fail closed if a required record is missing, the lineage is ambiguous, or any consistency rule fails. It must not repair, infer, or substitute source facts.

### 4.4 Creation result

A successful command creates atomically:

1. one Engagement identity;
2. one immutable `ENG-######` reference;
3. one immutable source-lineage record;
4. one `ENGAGEMENT_CREATED_PENDING_ACTIVATION` event;
5. one durable command-idempotency record.

It creates no other business record or side effect.

### 4.5 Upstream evidence meaning

The capability consumes the existence of the Agreement Execution as a factual platform prerequisite. It does not reevaluate signature evidence and does not translate the Execution into a legal conclusion. The downstream Engagement record means only:

> Cotarion Platform recorded an initial Engagement identity linked to retained Agreement Execution evidence.

It does not mean:

> The agreement is legally binding, legally valid, enforceable, effective for every purpose, or approved by legal counsel.

## 5. Minimum Engagement identity

The minimum proposed Engagement aggregate identity is:

| Field                           | Mutability            | Rule                                                                             |
| ------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| `id`                            | Immutable             | Internal opaque identity                                                         |
| `engagementNumber`              | Immutable             | Globally unique `ENG-######`; never reused                                       |
| `companyId`                     | Immutable             | Authoritative Company boundary                                                   |
| `clientId`                      | Immutable             | Source Proposal Client                                                           |
| `operatingGroupId`              | Immutable             | Source Proposal operating group                                                  |
| `ownerId`                       | Immutable in Sprint 0 | Source Proposal owner; future reassignment requires separate approved capability |
| `engagementTypePolicyVersionId` | Immutable             | Exact version referenced by the source Proposal                                  |
| `engagementTypeCode`            | Immutable snapshot    | Stable code from the referenced policy version                                   |
| `agreementId`                   | Immutable             | Source Agreement                                                                 |
| `agreementVersionId`            | Immutable             | Executed Agreement Version                                                       |
| `agreementExecutionId`          | Immutable             | Sole creation authority and uniqueness source                                    |
| `sourceProposalId`              | Immutable             | Required for this Proposal-originated Version 1 path                             |
| `sourceProposalVersionId`       | Immutable             | Proposal Version used by the Agreement                                           |
| `status`                        | Initially fixed       | `CREATED_PENDING_ACTIVATION`                                                     |
| `createdAt`                     | Immutable             | Platform creation time                                                           |
| `createdByUserId`               | Immutable             | Authenticated actor that requested creation                                      |
| `correlationId`                 | Immutable             | Creation trace                                                                   |

### `ENG-######` policy

- The prefix is exactly `ENG-`.
- The numeric portion contains at least six digits and is allocated atomically.
- The number is immutable, globally unique, never reused, and may contain gaps.
- Failed transactions must not create a partial Engagement. A consumed sequence value may remain a gap.
- The number conveys no Client, operating group, year, status, or legal meaning.

This follows the permanent-record convention already frozen by Proposal Sprint 0 and the recommended identifier in ADR-017.

## 6. Consistency and eligibility invariants

All invariants must pass inside one transaction or equivalent atomic consistency boundary.

1. The authenticated actor is active and belongs to the requested Company.
2. The Agreement Execution exists in the requested Company.
3. The Execution references exactly one Agreement Version and Agreement.
4. The Agreement Version belongs to the referenced Agreement.
5. Execution, Agreement Version, Agreement, Proposal, Proposal Version, Client, owner, operating group, and Engagement Type Policy Version all belong to the same Company.
6. The Agreement's `proposalId` equals the resolved Proposal ID.
7. The Agreement's `proposalVersionId` equals the resolved Proposal Version ID.
8. The Proposal Version belongs to the resolved Proposal.
9. The Proposal's Client is the Engagement Client.
10. The Proposal's operating group is the Engagement operating group.
11. The Proposal's owner is the initial Engagement owner.
12. The Proposal's Engagement Type Policy Version is retained exactly; no current or latest policy may replace it.
13. The Agreement Execution's Agreement Version is the exact Version retained on the Engagement.
14. The Agreement subsystem remains the sole authority for the Execution determination, artifact checksum, signer information, Execution actor, and other Agreement evidence; Engagement does not copy or cache them.
15. No Engagement already exists for the Agreement Execution.
16. The request identity is unused or is an exact replay of the same command intent.
17. The initial status is always `CREATED_PENDING_ACTIVATION`; the caller cannot override it.
18. Creation cannot mutate any upstream record.
19. Creation cannot trigger activation or any excluded workflow.

These invariants materially improve the product by preventing orphaned, cross-Company, cross-Client, or historically inconsistent records. They reduce legal risk by preserving the exact source evidence without inventing or interpreting facts.

## 7. Authoritative field-source matrix

| Engagement or read-model field  | Authoritative source                                  | Snapshot/reference policy                 | Caller editable? |
| ------------------------------- | ----------------------------------------------------- | ----------------------------------------- | ---------------- |
| `id`                            | Engagement identity generator                         | New opaque identity                       | No               |
| `engagementNumber`              | Engagement number allocator                           | New immutable business reference          | No               |
| `companyId`                     | Agreement Execution, verified across the source graph | Reference                                 | No               |
| `clientId`                      | Source Proposal                                       | Reference; must resolve in same Company   | No               |
| Client display name             | Current Client read model                             | Live display only; not an Engagement fact | No               |
| `operatingGroupId`              | Source Proposal                                       | Reference                                 | No               |
| Operating-group display name    | Current operating-group read model                    | Live display only                         | No               |
| `ownerId`                       | Source Proposal at creation                           | Immutable initial owner reference         | No               |
| Owner display name              | Current Application User read model                   | Live display only                         | No               |
| `sourceProposalId`              | Source Agreement, verified against Proposal           | Reference                                 | No               |
| `sourceProposalVersionId`       | Source Agreement, verified against Proposal Version   | Reference                                 | No               |
| Proposal number                 | Source Proposal                                       | Read-only display from referenced record  | No               |
| `agreementId`                   | Agreement Execution and Agreement Version             | Reference                                 | No               |
| `agreementVersionId`            | Agreement Execution                                   | Reference                                 | No               |
| Agreement number                | Source Agreement                                      | Read-only display from referenced record  | No               |
| Agreement Version number        | Source Agreement Version                              | Read-only display from referenced record  | No               |
| `agreementExecutionId`          | Selected Agreement Execution                          | Unique creation source                    | No               |
| Execution timestamp             | Agreement Execution                                   | Read-only provenance                      | No               |
| `engagementTypePolicyVersionId` | Source Proposal                                       | Immutable reference                       | No               |
| Engagement Type code            | Referenced policy version                             | Immutable stable-code snapshot            | No               |
| Engagement Type display name    | Referenced policy version                             | Read-only display                         | No               |
| `status`                        | Approved Engagement Foundation policy                 | `CREATED_PENDING_ACTIVATION`              | No               |
| `createdAt`                     | Platform clock at commit                              | Immutable                                 | No               |
| `createdByUserId`               | Authenticated actor                                   | Immutable                                 | No               |
| `correlationId`                 | Command envelope                                      | Immutable trace                           | No               |

Names, Agreement text, commercial terms, pricing, signature details, and service descriptions are not copied into the Engagement identity. They remain owned by their source records. Read models may present safe links and current display labels without making those labels authoritative Engagement snapshots.

## 8. Status policy

### Approved initial status

`CREATED_PENDING_ACTIVATION`

Business label:

**Created — Activation Pending**

Factual description:

**Initial Engagement record created from retained Agreement Execution evidence. Service delivery has not been activated.**

This status is:

- not active;
- not billable;
- not scheduled;
- not in progress;
- not completed or terminated;
- not a conclusion about legal validity or enforceability;
- not proof that work may begin.

Sprint 0 defines no transition out of this status. Activation and workflow-specific statuses require a later approved capability, policy, permissions, acceptance criteria, and legal-risk review.

### Governing-requirement evaluation

The universal pending state improves the product by giving every Engagement a consistent, queryable handoff state. It reduces legal and operational exposure by preventing record creation from silently starting delivery or financial obligations. It therefore satisfies both governing requirements.

## 9. Commands

### 9.1 `CreateEngagementFromAgreementExecution`

Purpose: create the initial pending Engagement from one Agreement Execution.

Required capability: `engagement:create-from-execution`

Rules:

- Accepts only the command envelope in Section 4.2.
- Resolves all business fields server-side.
- Enforces all Section 6 invariants.
- Is atomic and durably idempotent.
- Emits `ENGAGEMENT_CREATED_PENDING_ACTIVATION`.
- Produces no downstream side effects.

### 9.2 `RecordEngagementCorrectionNote`

Purpose: append a factual administrative note identifying a discovered record-quality issue without changing authoritative source facts.

Required capability: `engagement:record-correction-note`

Approved inputs:

- `companyId`
- `engagementId`
- `reasonCode`
- factual note
- `requestIdentity`
- `correlationId`

Rules:

- Cannot change an identity, source reference, status, or upstream record.
- Cannot state a legal conclusion.
- Must identify the actor and timestamp.
- Is append-only and durably idempotent.
- Emits `ENGAGEMENT_CORRECTION_NOTE_RECORDED`.

### 9.3 Supersession explicitly deferred

Version 1 defines no `SupersedeEngagement` command, capability, workflow, approval requirement, review policy, event, status, or permitted action. A future supersession capability requires its own architecture review, Product Owner decisions, permissions, invariants, audit model, acceptance criteria, and legal-risk review.

## 10. Events and audit evidence

All events are immutable, Company-scoped, ordered by occurrence time plus stable identity, and include actor, correlation, causation where applicable, and versioned factual metadata.

| Event                                   | Required evidence                                                                                                                                                            | Prohibited meaning                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ENGAGEMENT_CREATED_PENDING_ACTIVATION` | Engagement, Company, Client, operating group, owner, Agreement, Agreement Version, Execution, source Proposal and Version, Engagement Type Policy Version, actor, timestamps | No statement of validity, enforceability, activation, or authorization to work |
| `ENGAGEMENT_CORRECTION_NOTE_RECORDED`   | Engagement, reason code, note, actor, timestamp                                                                                                                              | Does not alter source evidence or adjudicate legal effect                      |

Audit evidence must never be updated or deleted through ordinary product behavior. Administrative retention or exceptional legal-hold behavior requires separate governance.

## 11. Idempotency and uniqueness

### One Engagement per Execution

- `agreementExecutionId` is globally unique in Engagement persistence.
- The same Agreement Execution can create no more than one Engagement.
- Different command identities for the same Execution return the existing Engagement only when the requested business intent is equivalent; they must not create duplicates.

### Request identity

- `(companyId, requestIdentity)` identifies one command intent.
- Exact replay returns the original result and indicates replay.
- Reuse for another Execution, Engagement, command type, or materially different input fails as an idempotency conflict.
- Concurrent requests for the same Execution serialize to one result.
- Engagement number allocation, identity persistence, event creation, lineage persistence, and command receipt commit atomically.

These rules prevent duplicate operating records and accidental duplicate downstream work. They introduce no legal characterization and satisfy both governing requirements.

## 12. Correction policy and deferred supersession

1. Issued Engagement numbers are never changed, deleted, or reused.
2. Company, Client, operating group, source Proposal, Proposal Version, Agreement, Agreement Version, Execution, and Engagement Type Policy Version are immutable.
3. A mismatch in those fields is a source-integrity defect, not an editable Engagement field.
4. A correction note may describe the defect but cannot overwrite the record.
5. If the correct business basis may require a different Agreement Version or Execution, users record a correction note and follow an approved administrative escalation; Version 1 does not create a replacement relationship.
6. Owner reassignment is deferred; Sprint 0 preserves the initial Proposal owner as historical fact.
7. Supersession is intentionally deferred in full.
8. Deletion is prohibited.

## 13. Read-model requirements

The future implementation must use direct Company-scoped CQRS projections and must not reconstruct upstream aggregates for ordinary reads.

### 13.1 Engagement list

Supports:

- Company scope;
- Client filter;
- operating-group filter;
- owner filter;
- Engagement Type filter;
- pending-status filter;
- created-date ordering with stable cursor pagination;
- Engagement number search;

Each item includes only safe operational summary fields and server-authoritative permitted actions.

### 13.2 Engagement detail

Includes:

- Engagement identity and number;
- `Created — Activation Pending` status and factual explanation;
- Client, operating group, initial owner, and Engagement Type;
- source Proposal and Proposal Version references;
- Agreement and Agreement Version references;
- Agreement Execution reference and recorded timestamp;
- creation actor and timestamp;
- correction-note history;
- server-authoritative permitted actions.

The detail must not present `legally binding`, `legally valid`, `enforceable`, `approved by counsel`, `active`, or equivalent conclusions.

### 13.3 Provenance history

Returns ordered creation and correction-note events without mutating or merging upstream histories. Links may lead authorized internal users to source records.

### 13.4 Creation eligibility

For an Agreement Execution, the server may project:

- whether an Engagement already exists;
- the existing Engagement reference when authorized;
- whether the actor may request creation;
- a safe operational reason when creation is unavailable.

Eligibility wording must describe platform state, not legal sufficiency.

## 14. Permission boundaries

Approved stable capabilities:

| Capability                          | Allows                                                                 | Does not allow                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `engagement:view`                   | Approved Company-scoped operational list, detail, and provenance reads | Create, correct, activate, access another Company, or automatically access underlying Agreement evidence |
| `engagement:create-from-execution`  | Request server-resolved creation from an eligible Execution            | Supply source facts, bypass consistency, activate, or interpret legal effect                             |
| `engagement:record-correction-note` | Append a factual administrative correction note                        | Modify identity, lineage, status, or source records                                                      |

Authority is capability-based. Founder and Admin inheritance follows ADR-019. The UI must consume server-projected permitted actions and must not infer permission from role names or status. The implementation roadmap must fix the correction-note capability default before implementation.

All commands require:

- authenticated active Application User;
- exact Company match;
- effective capability;
- durable idempotency identity;
- correlation identity;
- server-side source resolution.

There is no public or secure-link Engagement command in this capability.

## 15. Factual UI and legal-risk safeguards

### Approved factual language

- “Engagement record created”
- “Created — Activation Pending”
- “Linked Agreement Execution evidence”
- “Agreement execution recorded on [date]”
- “Service delivery has not been activated”
- “This record preserves the platform’s operational handoff and source history”

### Prohibited or legally consequential language

- “Legally binding”
- “Legally valid”
- “Enforceable”
- “Contract approved”
- “Counsel approved”
- “Authorized to begin work”
- “Services commenced”
- “Payment is legally due”
- “Agreement effective” unless a separately approved source and policy define that factual date
- “Terminated,” “cancelled,” “rescinded,” or “void” as an operational correction-note conclusion

### Additional safeguards

1. Do not calculate or display a legal-effect date.
2. Do not infer authorization to work from signature or execution evidence.
3. Do not expose raw signature evidence, token material, or unnecessary personal data in Engagement reads.
4. Preserve least-privilege Company scope.
5. Display source references rather than copied legal text.
6. Keep legal review, provider certification, Product Owner acceptance, and release approval as separate gates.
7. Do not market or document this capability as contract-management legal assurance.
8. Require qualified legal review before production legal-language or signature-enforceability claims.

## 16. Rule-by-rule governing-requirement evaluation

| Proposed rule group                                    | Material product improvement                                      | Legal-safety effect                                            | Result         |
| ------------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------- | -------------- |
| Execution is the sole creation source                  | Completes the commercial-to-operational handoff with traceability | Avoids informal or unsupported Engagement creation             | Satisfies both |
| Server resolves every business field                   | Prevents re-entry and drift                                       | Prevents users from manufacturing legal provenance             | Satisfies both |
| Immutable `ENG-######` identity                        | Creates durable operational references                            | Number carries no legal conclusion                             | Satisfies both |
| Exact Company/Client/group/source consistency          | Prevents data leakage and incorrect client work                   | Avoids attaching work to the wrong party or agreement          | Satisfies both |
| Proposal owner becomes initial owner                   | Provides immediate operational accountability                     | Does not infer signer authority or legal responsibility        | Satisfies both |
| `CREATED_PENDING_ACTIVATION`                           | Establishes a useful universal handoff state                      | Explicitly prevents automatic work commencement                | Satisfies both |
| One Engagement per Execution                           | Prevents duplicate operational work                               | Prevents competing records from implying multiple obligations  | Satisfies both |
| Append-only correction notes and deferred supersession | Preserves reliable history without premature replacement behavior | Avoids rewriting contractual provenance or implying rescission | Satisfies both |
| Direct CQRS reads and server permissions               | Makes the capability usable and secure                            | Limits unnecessary exposure of evidence and cross-Company data | Satisfies both |
| No activation or downstream automation                 | Keeps the sprint small and operationally clear                    | Prevents unreviewed legal or financial consequences            | Satisfies both |
| Factual UI vocabulary                                  | Gives users precise platform status                               | Avoids unsupported validity and enforceability claims          | Satisfies both |

No approved rule fails either governing requirement. Product Owner approval authorizes architecture and roadmap documentation only; it does not authorize implementation.

## 17. Acceptance criteria for a future implementation sprint

A future implementation sprint is acceptable only when all approved criteria below are demonstrably met.

### Contract and identity

- One eligible Agreement Execution creates exactly one Engagement.
- Every Engagement receives one immutable, unique `ENG-######` reference.
- All business fields are resolved from authoritative sources; callers cannot override them.
- The exact Agreement Execution, Agreement Version, Agreement, Proposal Version, Proposal, and Engagement Type Policy Version remain traceable.
- No upstream record is mutated.

### Consistency and isolation

- Every Section 6 invariant is enforced.
- Cross-Company, cross-Client, cross-operating-group, mismatched-version, and ambiguous-lineage requests fail atomically.
- Missing or inconsistent source evidence fails closed.
- Company-scoped reads and commands cannot disclose another Company's Engagement or source metadata.

### Status and scope

- Every created record starts in `CREATED_PENDING_ACTIVATION`.
- No implemented command can activate it or start an excluded workflow.
- Creation produces no task, milestone, delivery, schedule, invoice, payment, renewal, termination, notification, or public endpoint.

### Idempotency and concurrency

- Exact replay returns the original result.
- Conflicting reuse of request identity is rejected.
- Concurrent creation from the same Execution yields one Engagement and one creation event.
- Number allocation, lineage, record, event, and command receipt are atomic.

### History and corrections

- Issued records cannot be deleted or renumbered.
- Source lineage cannot be edited.
- Correction notes are append-only, immutable, idempotent, permission-controlled, and use an approved Reason Code.
- No supersession command, capability, event, status, or permitted action exists.

### Read models and permissions

- List, detail, history, and eligibility use direct Company-scoped read models.
- Read models expose only required operational facts.
- Permitted actions are projected by the server.
- UI and API consumers do not infer authority from role names or client-side status checks.

### Legal-risk safeguards

- User-facing language remains factual and uses the approved pending-state wording.
- No response, event, log intended for business use, or UI states that an Agreement is legally binding, legally valid, enforceable, counsel-approved, or authorization to begin work.
- Execution is presented as retained platform evidence, not a legal determination.
- Personal and signature evidence is minimized.
- Legal approval, Product Owner operational acceptance, architecture conformance, and release approval remain separate explicit gates.

### Verification and governance

- Domain, application, persistence, concurrency, Company-isolation, authorization, direct-read, API, presentation, and regression behavior is independently verifiable.
- Architecture conformance confirms that Engagement remains a separate bounded context and does not absorb Agreement or Proposal ownership.
- Product Owner operationally exercises the complete pending-record workflow before release.
- No production capability claim is made before all release gates pass.

## 18. Approved Product Owner decisions

All material Sprint 0 policy decisions were approved on 2026-07-23. ADR-005 is the canonical architectural representation of these decisions.

| ID    | Approved decision                                                                                                                                                                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EF-01 | Every Engagement begins in `CREATED_PENDING_ACTIVATION`, labeled **Created — Activation Pending**. Creation activates no delivery, billing, scheduling, or downstream activity.                                                                                                                                  |
| EF-02 | The source Proposal owner is the initial Engagement owner. This is operational ownership only. If that owner is ineligible, creation fails safely without substitution; reassignment is separate future scope.                                                                                                   |
| EF-03 | This Version 1 path requires the source Proposal and exact Proposal Version. Future no-Proposal paths require separate architecture and approval.                                                                                                                                                                |
| EF-04 | Creation requires a manual, authorized **Create Engagement** action. Execution creates eligibility only. Future configurable automation requires separate architecture and may not replace the manual capability.                                                                                                |
| EF-05 | Authority is capability-based. `engagement:view` permits approved Company-scoped operational reads; `engagement:create-from-execution` permits creation. Founder and Admin inherit through ADR-019. UI uses server-projected actions. Viewing an Engagement does not grant all underlying evidence access.       |
| EF-06 | Version 1 includes append-only correction notes and defers supersession in full. Notes cannot change identity, lineage, ownership, status, or upstream records.                                                                                                                                                  |
| EF-07 | Correction notes require a controlled operational Reason Code and may include an optional concise factual comment. Notes are immutable; clarification requires another note. Codes identify review need, not fault, correctness, legal effect, or resolution.                                                    |
| EF-08 | Because supersession is deferred, all supersession authority, workflow, review, permissions, invariants, audit, acceptance, and legal-risk policy is also deferred.                                                                                                                                              |
| EF-09 | Engagement displays only Agreement, Agreement Version, and Execution references, Execution timestamp, and authorized source navigation. It never duplicates signer evidence, Execution actor information, or Agreement evidence. The Agreement subsystem authorizes all additional evidence access.              |
| EF-10 | Every Engagement receives an immutable, globally allocated, semantically neutral `ENG-######` reference. Gaps are permitted and have no business or legal meaning.                                                                                                                                               |
| EF-11 | Engineering and acceptance may precede upstream legal and operational review, but production release requires every applicable architecture, Product Owner, operational-readiness, and legal-review gate.                                                                                                        |
| EF-12 | Agreement Execution, Engagement Creation, and Activation are separate governed events. Activation is future scope and is the gateway to all operational workflows.                                                                                                                                               |
| EF-13 | Authoritative Engagement records, immutable lineage, audit history, and correction notes are permanent. Derived data may follow future retention policies. Exceptional access requires explicit capability, purpose, least privilege, and permanent access evidence; Founder/Admin status alone is insufficient. |
| EF-14 | These decisions authorize canonical ADR-005 architecture and roadmap preparation. They do not authorize implementation, persistence, APIs, UI, testing, Activation, downstream operations, or production release.                                                                                                |

### Approved correction-note Reason Codes

| Code                                        | Business label                            |
| ------------------------------------------- | ----------------------------------------- |
| `SOURCE_REFERENCE_REVIEW_REQUIRED`          | Source Reference Review Required          |
| `CLIENT_OR_OPERATING_GROUP_REVIEW_REQUIRED` | Client or Operating Group Review Required |
| `OWNER_ELIGIBILITY_REVIEW_REQUIRED`         | Owner Eligibility Review Required         |
| `ENGAGEMENT_TYPE_REVIEW_REQUIRED`           | Engagement Type Review Required           |
| `DISPLAY_INFORMATION_REVIEW_REQUIRED`       | Display Information Review Required       |
| `GENERAL_DATA_QUALITY_REVIEW_REQUIRED`      | General Data Quality Review Required      |

The selected code and optional comment are operational observations only. They cannot express legal opinions, contractual interpretations, fault, or subjective commentary.

## 19. Review and authorization gates

### Product Architect review

Confirm:

- Engagement remains a separate bounded context.
- The source graph and field authority are unambiguous.
- Accepted ADR-017 behavior is preserved.
- The approved pending state is encoded canonically in ADR-005 and explicitly reconciled with prior proposed workflow guidance.
- No Agreement, Signature, Execution, Proposal, or Pricing behavior is redefined.
- Implementation can later enforce idempotency, uniqueness, Company isolation, and immutable lineage atomically.

### Product Owner review — passed 2026-07-23

Confirm:

- The capability materially improves Cotarion's operational handoff.
- The pending state and factual vocabulary reflect the intended business meaning.
- Every EF decision is resolved.
- The exclusions are acceptable for the first implementation sprint.
- No rule creates an unsupported legal or operational conclusion.

### Legal and operational review

Before production release—not before documentation approval—confirm:

- approved Agreement language and signature practice;
- permitted factual descriptions of Agreement Execution;
- retention and access expectations for execution-linked evidence;
- absence of unsupported enforceability or validity claims.

### Implementation authorization

Approval of this package alone authorizes no implementation. The authorized documentation steps are:

1. complete and approve ADR-005;
2. reconcile the approved universal pending state with versioned Engagement Type policies;
3. prepare a dedicated incremental implementation roadmap for review;
4. update the capability tracker without advancing it to `Roadmap Approved` until that roadmap passes review;
5. then authorize a separately scoped implementation sprint.

## 20. Product Owner determination

The Product Owner approved the narrow capability direction and EF-01 through EF-14 on 2026-07-23.

This is the smallest Engagement foundation that materially improves Cotarion Platform: it creates a durable, traceable operational record at the end of the implemented Proposal and Agreement lifecycle. Its deliberate lack of activation, legal interpretation, and downstream automation keeps the platform on a legally conservative path.
