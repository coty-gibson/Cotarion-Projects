import { describe, expect, it } from "vitest";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import {
  DefaultProposalCapabilityEvaluator,
  PROPOSAL_CAPABILITIES,
  type ProposalActorContext,
  type ProposalCapability
} from "@/application/proposals/proposal-capabilities";
import {
  ProposalApplicationService,
  type ProposalCommandRequest
} from "@/application/proposals/proposal-application-service";
import type {
  ProposalRepository,
  ProposalUnitOfWork
} from "@/application/proposals/proposal-repository";
import {
  PRICING_SNAPSHOT_SCHEMA_VERSION,
  type ProposalPricingSnapshot
} from "@/domain/proposals/contracts";
import { engagementTypePolicy } from "@/domain/proposals/engagement-type-policies";
import {
  ProposalAggregate,
  type PersistedProposalState
} from "@/domain/proposals/proposal-domain";

const identity: AuthenticatedIdentity = {
  id: "auth-user-1",
  email: "member@example.com",
  name: "Member"
};

function request(requestId: string, occurredAt = "2026-07-21T12:00:00.000Z"): ProposalCommandRequest {
  return { identity, companyId: "company-1", requestId, occurredAt };
}

const pricingSnapshot: ProposalPricingSnapshot = {
  schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
  pricingProjectId: "pricing-1",
  pricingProjectNumber: "PP-000001",
  companyId: "company-1",
  clientId: "client-1",
  operatingGroupCode: "CONSULTING" as const,
  sourceStatus: "QUOTED" as const,
  pricingConfigurationVersionId: "configuration-1",
  pricingConfigurationVersion: 1,
  engineVersion: "1.0.0",
  pricingModel: "PROJECT" as const,
  methodologyVersion: "project-pricing/1.0.0",
  inputSnapshot: { source: "application-test" },
  outputSnapshot: {
    pricingModel: "PROJECT",
    methodologyVersion: "project-pricing/1.0.0",
    projectSubtotal: "100.00",
    complexityMultiplier: "1",
    adjustedSubtotal: "100.00",
    discountRate: "0",
    discountAmount: "0.00",
    finalAmount: "100.00",
    currency: "USD"
  },
  approvedAt: "2026-07-20T10:00:00.000Z",
  approvedByUserId: "reviewer-1",
  capturedAt: "2026-07-20T10:01:00.000Z"
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

class NamedError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

class MemoryProposalUnitOfWork implements ProposalUnitOfWork {
  records = new Map<string, { state: PersistedProposalState; revision: number }>();
  sequence = 0;
  nextFailure: Error | null = null;

  async execute<T>(work: (repository: ProposalRepository) => Promise<T>) {
    const working = new Map(
      [...this.records].map(([id, record]) => [id, clone(record)] as const)
    );
    let sequence = this.sequence;
    const fail = () => {
      if (this.nextFailure) {
        const error = this.nextFailure;
        this.nextFailure = null;
        throw error;
      }
    };
    const load = (record: { state: PersistedProposalState; revision: number } | undefined) =>
      record
        ? {
            aggregate: ProposalAggregate.rehydrate(
              clone(record.state),
              engagementTypePolicy(record.state.engagementTypeCode)
            ),
            revision: record.revision
          }
        : null;
    const repository: ProposalRepository = {
      async allocateProposalIdentity() {
        sequence += 1;
        return {
          id: `proposal-${sequence}`,
          proposalNumber: `PRO-${String(sequence).padStart(6, "0")}`
        };
      },
      async insert(aggregate) {
        fail();
        if (working.has(aggregate.state.id)) throw new Error("duplicate Proposal");
        working.set(aggregate.state.id, { state: clone(aggregate.persistenceState), revision: 0 });
        return { revision: 0 };
      },
      async save(aggregate, expectedRevision) {
        fail();
        const current = working.get(aggregate.state.id);
        if (!current || current.revision !== expectedRevision) {
          throw new NamedError("ProposalConcurrencyError", "stale Proposal");
        }
        const revision = expectedRevision + 1;
        working.set(aggregate.state.id, {
          state: clone(aggregate.persistenceState),
          revision
        });
        return { revision };
      },
      async findById(companyId, proposalId) {
        const record = working.get(proposalId);
        return record?.state.companyId === companyId ? load(record) : null;
      },
      async findByEventId(companyId, eventId) {
        const record = [...working.values()].find(
          ({ state }) =>
            state.companyId === companyId && state.events.some((event) => event.eventId === eventId)
        );
        return load(record);
      },
      async list(companyId, request) {
        const records = [...working.values()]
          .filter(({ state }) => state.companyId === companyId)
          .slice(0, request.limit);
        return {
          items: records.map(({ state }) => ({
            id: state.id,
            proposalNumber: state.proposalNumber,
            companyId: state.companyId,
            clientId: state.clientId,
            ownerId: state.ownerId,
            title: state.workingDraft.title,
            status: state.status,
            currentVersionNumber: null,
            submittedVersionNumber: null,
            versionCount: state.versions.length,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt,
            effectiveAt: state.effectiveAt,
            closedAt: state.closedAt
          })),
          nextCursor: null
        };
      }
    };
    const result = await work(repository);
    this.records = working;
    this.sequence = sequence;
    return result;
  }
}

function service(options?: {
  actor?: ProposalActorContext | null;
  capabilities?: readonly ProposalCapability[];
  unitOfWork?: MemoryProposalUnitOfWork;
}) {
  const unitOfWork = options?.unitOfWork ?? new MemoryProposalUnitOfWork();
  const actor = options && "actor" in options
    ? options.actor
    : { userId: "member-1", companyId: "company-1", active: true };
  let id = 0;
  return {
    unitOfWork,
    service: new ProposalApplicationService({
      actors: { load: async () => actor ?? null },
      capabilities: {
        capabilitiesFor: async () =>
          new Set(options?.capabilities ?? Object.values(PROPOSAL_CAPABILITIES))
      },
      unitOfWork,
      pricingVersions: { resolve: async () => ({ ...pricingSnapshot, schemaVersion: 2 as const, pricingVersionId: "pricing-version-1", pricingVersionNumber: 1 }) },
      ids: { nextId: (kind) => `${kind}-${++id}` }
    })
  };
}

async function createReadyDraft(application: ProposalApplicationService, prefix: string) {
  const created = await application.createProposal(request(`${prefix}-create`), {
    clientId: "client-1",
    engagementTypePolicy: engagementTypePolicy("PROJECT"),
    pricingProjectId: pricingSnapshot.pricingProjectId,
    pricingVersionId: "pricing-version-1",
    title: "Application Proposal"
  });
  await application.updateDraft(
    request(`${prefix}-draft`, "2026-07-21T12:01:00.000Z"),
    created.aggregate.state.id,
    {
      recipients: [
        {
          recipientId: "recipient-1",
          contactId: null,
          name: "Client",
          email: "client@example.com",
          authorizedToAccept: true
        }
      ]
    }
  );
  await application.saveProposalVersion(
    request(`${prefix}-version`, "2026-07-21T12:02:00.000Z"),
    created.aggregate.state.id
  );
  return created.aggregate.state.id;
}

describe("Proposal application services", () => {
  it("maps Version 1 role defaults to additive capabilities without exposing roles to domain", async () => {
    const actor = { userId: "u", companyId: "company-1", active: true };
    const member = new DefaultProposalCapabilityEvaluator({ roleFor: async () => "MEMBER" });
    const admin = new DefaultProposalCapabilityEvaluator({ roleFor: async () => "ADMIN" });
    const founder = new DefaultProposalCapabilityEvaluator({
      roleFor: async () => "FOUNDER",
      additionalCapabilitiesFor: async () => new Set([PROPOSAL_CAPABILITIES.QUALITY_REVIEW])
    });
    expect(await member.capabilitiesFor(actor)).not.toContain(
      PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE
    );
    expect(await admin.capabilitiesFor(actor)).toContain(PROPOSAL_CAPABILITIES.QUALITY_REVIEW);
    expect(await founder.capabilitiesFor(actor)).toContain(
      PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE
    );
  });

  it("creates a Company-scoped Proposal and idempotently replays its request", async () => {
    const { service: application, unitOfWork } = service();
    const first = await application.createProposal(request("create-1"), {
      clientId: "client-1",
      engagementTypePolicy: engagementTypePolicy("PROJECT"),
      pricingProjectId: pricingSnapshot.pricingProjectId,
      pricingVersionId: "pricing-version-1",
      title: "Application Proposal"
    });
    const replay = await application.createProposal(request("create-1"), {
      clientId: "client-1",
      engagementTypePolicy: engagementTypePolicy("PROJECT"),
      pricingProjectId: pricingSnapshot.pricingProjectId,
      pricingVersionId: "pricing-version-1",
      title: "Application Proposal"
    });
    expect(first.aggregate.state.ownerId).toBe("member-1");
    expect(replay.aggregate.state.id).toBe(first.aggregate.state.id);
    expect(replay.idempotentReplay).toBe(true);
    expect(unitOfWork.records).toHaveLength(1);
  });

  it("rejects inactive actors, cross-Company requests, and missing capabilities distinctly", async () => {
    const inactive = service({ actor: { userId: "u", companyId: "company-1", active: false } });
    await expect(
      inactive.service.createProposal(request("inactive"), {
        clientId: "client-1",
        engagementTypePolicy: engagementTypePolicy("PROJECT"),
        pricingProjectId: pricingSnapshot.pricingProjectId,
        pricingVersionId: "pricing-version-1",
        title: "Denied"
      })
    ).rejects.toMatchObject({ code: "NOT_AUTHENTICATED" });

    const scoped = service({ actor: { userId: "u", companyId: "company-2", active: true } });
    await expect(
      scoped.service.createProposal(request("scope"), {
        clientId: "client-1",
        engagementTypePolicy: engagementTypePolicy("PROJECT"),
        pricingProjectId: pricingSnapshot.pricingProjectId,
        pricingVersionId: "pricing-version-1",
        title: "Denied"
      })
    ).rejects.toMatchObject({ code: "COMPANY_SCOPE_VIOLATION" });

    const denied = service({ capabilities: [] });
    await expect(
      denied.service.createProposal(request("capability"), {
        clientId: "client-1",
        engagementTypePolicy: engagementTypePolicy("PROJECT"),
        pricingProjectId: pricingSnapshot.pricingProjectId,
        pricingVersionId: "pricing-version-1",
        title: "Denied"
      })
    ).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  });

  it("constructs independent Quality Review evidence and submits exactly once", async () => {
    const shared = new MemoryProposalUnitOfWork();
    const member = service({ unitOfWork: shared }).service;
    const proposalId = await createReadyDraft(member, "quality");
    await member.requestQualityReview(
      request("quality-request", "2026-07-21T12:03:00.000Z"),
      proposalId
    );

    await expect(
      member.submitThroughQualityReview(
        request("quality-self-review", "2026-07-21T12:04:00.000Z"),
        proposalId
      )
    ).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });

    const reviewer = service({
      actor: { userId: "reviewer-2", companyId: "company-1", active: true },
      unitOfWork: shared,
      capabilities: [PROPOSAL_CAPABILITIES.QUALITY_REVIEW]
    }).service;
    const submitted = await reviewer.submitThroughQualityReview(
      request("quality-submit", "2026-07-21T12:05:00.000Z"),
      proposalId
    );
    const replay = await reviewer.submitThroughQualityReview(
      request("quality-submit", "2026-07-21T12:05:00.000Z"),
      proposalId
    );
    expect(submitted.aggregate.state.status).toBe("SUBMITTED");
    expect(replay.idempotentReplay).toBe(true);
    expect(
      replay.aggregate.state.events.filter(({ eventType }) => eventType === "PROPOSAL_SUBMITTED")
    ).toHaveLength(1);
    expect(replay.aggregate.state.events.at(-1)?.metadata).toMatchObject({
      submissionMethod: "QUALITY_REVIEW",
      authorizedByUserId: "reviewer-2"
    });
  });

  it("constructs Executive Authorization and requires Business Justification", async () => {
    const { service: application } = service();
    const proposalId = await createReadyDraft(application, "executive");
    await expect(
      application.submitThroughExecutiveAuthorization(
        request("executive-empty", "2026-07-21T12:03:00.000Z"),
        proposalId,
        " "
      )
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    const submitted = await application.submitThroughExecutiveAuthorization(
      request("executive-submit", "2026-07-21T12:04:00.000Z"),
      proposalId,
      "Client deadline requires the approved alternate path."
    );
    expect(submitted.aggregate.state.events.at(-1)?.metadata).toMatchObject({
      submissionMethod: "EXECUTIVE_AUTHORIZATION",
      authorizedByUserId: "member-1",
      businessJustification: "Client deadline requires the approved alternate path."
    });
  });

  it("orchestrates the foundation lifecycle with opaque-revision authority and replay safety", async () => {
    const shared = new MemoryProposalUnitOfWork();
    const member = service({ unitOfWork: shared }).service;
    const proposalId = await createReadyDraft(member, "foundation");
    await member.requestQualityReview(
      { ...request("foundation-review", "2026-07-21T12:03:00.000Z"), expectedRevision: 2 },
      proposalId
    );
    const reviewer = service({
      actor: { userId: "reviewer-2", companyId: "company-1", active: true },
      unitOfWork: shared,
      capabilities: [PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE]
    }).service;
    const authorizationRequest = {
      ...request("foundation-executive", "2026-07-21T12:04:00.000Z"),
      expectedRevision: 3
    };
    const pending = await reviewer.submitForExecutiveAuthorization(
      authorizationRequest,
      proposalId
    );
    const replay = await reviewer.submitForExecutiveAuthorization(
      authorizationRequest,
      proposalId
    );
    expect(pending.aggregate.state.status).toBe("EXECUTIVE_AUTHORIZATION");
    expect(replay.idempotentReplay).toBe(true);

    await expect(
      reviewer.approveProposal(
        { ...request("foundation-stale"), expectedRevision: 3 },
        proposalId
      )
    ).rejects.toMatchObject({ code: "OPTIMISTIC_CONCURRENCY_CONFLICT" });
    const approved = await reviewer.approveProposal(
      { ...request("foundation-approve", "2026-07-21T12:05:00.000Z"), expectedRevision: 4 },
      proposalId
    );
    expect(approved.aggregate.state.status).toBe("APPROVED");
  });

  it("orchestrates review changes while domain rules remain authoritative", async () => {
    const shared = new MemoryProposalUnitOfWork();
    const member = service({ unitOfWork: shared }).service;
    const proposalId = await createReadyDraft(member, "changes");
    await member.requestQualityReview(request("changes-review", "2026-07-21T12:03:00.000Z"), proposalId);
    const reviewer = service({
      actor: { userId: "reviewer-2", companyId: "company-1", active: true },
      unitOfWork: shared,
      capabilities: [PROPOSAL_CAPABILITIES.QUALITY_REVIEW]
    }).service;
    const changed = await reviewer.requestChanges(
      request("changes-request", "2026-07-21T12:04:00.000Z"),
      proposalId
    );
    expect(changed.aggregate.state.status).toBe("DRAFT");
    await expect(
      reviewer.requestChanges(request("changes-invalid", "2026-07-21T12:05:00.000Z"), proposalId)
    ).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
  });

  it("idempotently records acceptance and orchestrates withdrawal and Agreement linking", async () => {
    const { service: application } = service();
    const proposalId = await createReadyDraft(application, "accept");
    await application.submitThroughExecutiveAuthorization(
      request("accept-submit", "2026-07-21T12:03:00.000Z"),
      proposalId,
      "Approved expedited submission."
    );
    await application.recordProposalViewed(
      request("accept-view", "2026-07-21T12:04:00.000Z"),
      proposalId
    );
    const accepted = await application.recordClientAcceptance(
      request("accept-client", "2026-07-21T12:05:00.000Z"),
      proposalId,
      { recipientId: "recipient-1" }
    );
    const replay = await application.recordClientAcceptance(
      request("accept-client", "2026-07-21T12:05:00.000Z"),
      proposalId,
      { recipientId: "recipient-1" }
    );
    expect(replay.idempotentReplay).toBe(true);
    expect(accepted.aggregate.state.acceptances).toHaveLength(1);
    const withdrawn = await application.withdrawAcceptance(
      request("accept-withdraw", "2026-07-21T12:06:00.000Z"),
      proposalId,
      "Client corrected the response."
    );
    expect(withdrawn.aggregate.state.status).toBe("VIEWED");
    await application.recordClientAcceptance(
      request("accept-again", "2026-07-21T12:07:00.000Z"),
      proposalId,
      { recipientId: "recipient-1" }
    );
    const linked = await application.linkExecutedAgreement(
      request("accept-link", "2026-07-21T12:08:00.000Z"),
      proposalId,
      "agreement-1"
    );
    expect(linked.aggregate.state.executedAgreementId).toBe("agreement-1");
  });

  it("records verbal acceptance and terminal lifecycle commands", async () => {
    const { service: application } = service();
    const verbalId = await createReadyDraft(application, "verbal");
    await application.submitThroughExecutiveAuthorization(
      request("verbal-submit", "2026-07-21T12:03:00.000Z"), verbalId, "Approved."
    );
    const verbal = await application.recordVerbalAcceptance(
      request("verbal-accept", "2026-07-21T12:04:00.000Z"),
      verbalId,
      { recipientId: "recipient-1", reason: "Phone confirmation", notes: "Recorded by owner" }
    );
    expect(verbal.aggregate.state.status).toBe("ACCEPTED");

    const declinedId = await createReadyDraft(application, "decline");
    await application.submitThroughExecutiveAuthorization(
      request("decline-submit", "2026-07-21T12:03:00.000Z"), declinedId, "Approved."
    );
    const declined = await application.declineProposal(
      request("decline-command", "2026-07-21T12:04:00.000Z"), declinedId
    );
    expect(declined.aggregate.state.status).toBe("DECLINED");
    expect((await application.archiveProposal(
      request("decline-archive", "2026-07-21T12:05:00.000Z"), declinedId
    )).aggregate.state.status).toBe("ARCHIVED");

    const expiredId = await createReadyDraft(application, "expire");
    await application.submitThroughExecutiveAuthorization(
      request("expire-submit", "2026-07-21T12:03:00.000Z"), expiredId, "Approved."
    );
    const expired = await application.expireProposal(
      request("expire-command", "2026-08-25T12:00:00.000Z"), expiredId
    );
    expect(expired.aggregate.state.status).toBe("EXPIRED");
  });

  it("creates replacements idempotently and supersedes the original atomically", async () => {
    const shared = new MemoryProposalUnitOfWork();
    const application = service({ unitOfWork: shared }).service;
    const originalId = await createReadyDraft(application, "replace-original");
    await application.submitThroughExecutiveAuthorization(
      request("replace-original-submit", "2026-07-21T12:03:00.000Z"),
      originalId,
      "Approved original."
    );
    const replacement = await application.createReplacementProposal(
      request("replace-create", "2026-07-21T12:04:00.000Z"),
      originalId,
      { title: "Replacement" }
    );
    const replay = await application.createReplacementProposal(
      request("replace-create", "2026-07-21T12:04:00.000Z"),
      originalId,
      { title: "Replacement" }
    );
    expect(replay.aggregate.state.id).toBe(replacement.aggregate.state.id);
    await application.updateDraft(
      request("replace-draft", "2026-07-21T12:05:00.000Z"),
      replacement.aggregate.state.id,
      { recipients: [{ recipientId: "recipient-1", contactId: null, name: "Client", email: "client@example.com", authorizedToAccept: true }] }
    );
    await application.saveProposalVersion(
      request("replace-version", "2026-07-21T12:06:00.000Z"), replacement.aggregate.state.id
    );
    await application.submitThroughExecutiveAuthorization(
      request("replace-submit", "2026-07-21T12:07:00.000Z"),
      replacement.aggregate.state.id,
      "Approved replacement."
    );
    const superseded = await application.supersedeOriginalProposal(
      request("replace-supersede", "2026-07-21T12:08:00.000Z"),
      originalId,
      replacement.aggregate.state.id
    );
    expect(superseded.aggregate.state.status).toBe("SUPERSEDED");
    expect(superseded.aggregate.state.supersededByProposalId).toBe(replacement.aggregate.state.id);
  });

  it("rolls back atomic supersession and translates persistence failures", async () => {
    const shared = new MemoryProposalUnitOfWork();
    const application = service({ unitOfWork: shared }).service;
    const originalId = await createReadyDraft(application, "rollback-original");
    await application.submitThroughExecutiveAuthorization(
      request("rollback-submit", "2026-07-21T12:03:00.000Z"), originalId, "Approved."
    );
    const replacement = await application.createReplacementProposal(
      request("rollback-replacement", "2026-07-21T12:04:00.000Z"), originalId, {}
    );
    await application.updateDraft(
      request("rollback-draft", "2026-07-21T12:05:00.000Z"), replacement.aggregate.state.id,
      { recipients: [{ recipientId: "recipient-1", contactId: null, name: "Client", email: "client@example.com", authorizedToAccept: true }] }
    );
    await application.saveProposalVersion(
      request("rollback-version", "2026-07-21T12:06:00.000Z"), replacement.aggregate.state.id
    );
    await application.submitThroughExecutiveAuthorization(
      request("rollback-replacement-submit", "2026-07-21T12:07:00.000Z"),
      replacement.aggregate.state.id,
      "Approved."
    );
    shared.nextFailure = new NamedError("ProposalConcurrencyError", "stale Proposal");
    await expect(
      application.supersedeOriginalProposal(
        request("rollback-supersede", "2026-07-21T12:08:00.000Z"),
        originalId,
        replacement.aggregate.state.id
      )
    ).rejects.toMatchObject({ code: "OPTIMISTIC_CONCURRENCY_CONFLICT" });
    expect(shared.records.get(originalId)?.state.status).toBe("SUBMITTED");

    shared.nextFailure = new NamedError("ProposalImmutableConflictError", "immutable conflict");
    await expect(
      application.recordProposalViewed(
        request("rollback-immutable", "2026-07-21T12:09:00.000Z"), originalId
      )
    ).rejects.toMatchObject({ code: "IMMUTABLE_PERSISTENCE_CONFLICT" });

    shared.nextFailure = new Error("database unavailable");
    await expect(
      application.recordProposalViewed(
        request("rollback-transaction", "2026-07-21T12:10:00.000Z"), originalId
      )
    ).rejects.toMatchObject({ code: "TRANSACTION_FAILURE" });
  });

  it("reports not-found and request-identifier reuse without flattening errors", async () => {
    const { service: application } = service();
    await expect(
      application.archiveProposal(request("missing"), "missing-proposal")
    ).rejects.toMatchObject({ code: "PROPOSAL_NOT_FOUND" });
    const proposalId = await createReadyDraft(application, "reuse");
    await application.requestQualityReview(
      request("reuse-event", "2026-07-21T12:03:00.000Z"), proposalId
    );
    await expect(
      application.requestChanges(
        request("reuse-event", "2026-07-21T12:04:00.000Z"), proposalId
      )
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
