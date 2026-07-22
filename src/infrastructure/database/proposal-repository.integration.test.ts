import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PRICING_SNAPSHOT_SCHEMA_VERSION } from "@/domain/proposals/contracts";
import { engagementTypePolicy } from "@/domain/proposals/engagement-type-policies";
import {
  ProposalAggregate,
  type PersistedProposalState,
  type ProposalCommandContext
} from "@/domain/proposals/proposal-domain";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

class RollbackMarker extends Error {}

async function createIsolatedOwner(
  transaction: Prisma.TransactionClient,
  companyId: string,
  suffix: string
) {
  const authUser = await transaction.user.create({
    data: {
      id: `proposal-persistence-auth-${suffix}`,
      email: `proposal-persistence-${suffix}@example.com`
    }
  });
  return transaction.applicationUser.create({
    data: {
      id: `proposal-persistence-owner-${suffix}`,
      authUserId: authUser.id,
      companyId,
      email: authUser.email!,
      name: "Proposal Persistence Owner"
    }
  });
}

function command(
  suffix: string,
  sequence: number,
  responsibleUserId: string,
  occurredAt = `2026-07-${String(20 + sequence).padStart(2, "0")}T12:00:00.000Z`
): ProposalCommandContext {
  return {
    eventId: `proposal-persistence-${suffix}-event-${sequence}`,
    occurredAt,
    responsibleUserId
  };
}

async function createFixture(
  transaction: Prisma.TransactionClient,
  owner: { id: string; companyId: string },
  suffix: string,
  proposalNumber: string
) {
  const client = await transaction.client.create({
    data: {
      id: `proposal-persistence-client-${suffix}`,
      clientNumber: `CLI-${proposalNumber.slice(4)}`,
      companyId: owner.companyId,
      ownerId: owner.id,
      name: `Proposal Persistence ${suffix}`,
      normalizedName: `proposal persistence ${suffix}`
    }
  });
  const configuration = await transaction.pricingConfigurationVersion.findFirstOrThrow({
    where: { companyId: owner.companyId, status: "ACTIVE" }
  });
  const pricing = await transaction.pricingProject.create({
    data: {
      id: `proposal-persistence-pricing-${suffix}`,
      estimateNumber: `PP-${proposalNumber.slice(4)}`,
      companyId: owner.companyId,
      clientId: client.id,
      ownerId: owner.id,
      pricingConfigurationVersionId: configuration.id,
      projectName: "Quoted Proposal source",
      status: "QUOTED"
    }
  });
  const aggregate = ProposalAggregate.create(
    {
      id: `proposal-persistence-${suffix}`,
      proposalNumber,
      companyId: owner.companyId,
      clientId: client.id,
      ownerId: owner.id,
      engagementTypePolicy: engagementTypePolicy("PROJECT"),
      pricingSnapshot: {
        schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
        pricingProjectId: pricing.id,
        pricingProjectNumber: pricing.estimateNumber,
        companyId: owner.companyId,
        clientId: client.id,
        operatingGroupCode: "CONSULTING",
        sourceStatus: "QUOTED",
        pricingConfigurationVersionId: configuration.id,
        pricingConfigurationVersion: configuration.version,
        engineVersion: configuration.engineVersion,
        pricingModel: "PROJECT",
        methodologyVersion: "project-pricing/1.0.0",
        inputSnapshot: { source: "persistence-test" },
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
        approvedByUserId: owner.id,
        capturedAt: "2026-07-20T10:01:00.000Z"
      },
      title: "Persistence test"
    },
    command(suffix, 0, owner.id, "2026-07-20T12:00:00.000Z")
  );
  return aggregate;
}

function saveVersion(
  aggregate: ProposalAggregate,
  suffix: string,
  ownerId: string,
  sequence = 1
) {
  aggregate.updateDraft(
    {
      recipients: [
        {
          recipientId: `recipient-${suffix}`,
          contactId: null,
          name: "Authorized Client",
          email: "client@example.com",
          authorizedToAccept: true
        }
      ],
      commercialTerms: {
        paymentSchedule: "Due on execution",
        billingMethod: "Fixed",
        depositTerms: "None",
        recurrenceAndTerm: "One time",
        cancellationSummary: "Written notice",
        assumptionsAndExclusions: "As presented",
        clientResponsibilities: "Timely access",
        offerNotes: ""
      }
    },
    `2026-07-${String(20 + sequence).padStart(2, "0")}T10:00:00.000Z`
  );
  return aggregate.saveVersion(
    { versionId: `proposal-persistence-${suffix}-version-${sequence}` },
    command(suffix, sequence, ownerId)
  );
}

describeWithDatabase("Proposal persistence", () => {
  it("allocates globally unique Proposal numbers concurrently and seeds policy idempotently", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const { createPrismaProposalRepository } = await import(
      "@/infrastructure/database/proposal-repository"
    );
    const owner = await prisma.applicationUser.findFirstOrThrow();
    const firstGroupId = await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);
    const secondGroupId = await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);
    expect(secondGroupId).toBe(firstGroupId);

    const repository = createPrismaProposalRepository(prisma);
    const identities = await Promise.all(
      Array.from({ length: 10 }, () => repository.allocateProposalIdentity())
    );
    expect(new Set(identities.map(({ proposalNumber }) => proposalNumber)).size).toBe(10);
    expect(identities.every(({ proposalNumber }) => /^PRO-\d{6,}$/.test(proposalNumber))).toBe(true);
  }, 30_000);

  it("persists, submits, and reconstructs normalized aggregate state with Company isolation", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const {
      findProposalInPersistence,
      createPrismaProposalReadRepository,
      insertProposalInTransaction,
      saveProposalInTransaction
    } = await import("@/infrastructure/database/proposal-repository");
    const owner = await prisma.applicationUser.findFirstOrThrow();
    await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);
    const suffix = crypto.randomUUID();
    const proposalId = `proposal-persistence-${suffix}`;

    await expect(
      prisma.$transaction(async (transaction) => {
        const isolatedOwner = await createIsolatedOwner(transaction, owner.companyId, suffix);
        const aggregate = await createFixture(transaction, isolatedOwner, suffix, "PRO-910001");
        const version = saveVersion(aggregate, suffix, isolatedOwner.id);
        expect(await insertProposalInTransaction(transaction, aggregate.persistenceState)).toEqual({
          revision: 0
        });

        const created = await findProposalInPersistence(
          transaction,
          owner.companyId,
          aggregate.state.id
        );
        expect(created?.revision).toBe(0);
        expect(created?.aggregate.persistenceState).toEqual(aggregate.persistenceState);
        expect(
          await findProposalInPersistence(transaction, "other-company", aggregate.state.id)
        ).toBeNull();
        expect(await transaction.proposalVersion.count({ where: { proposalId } })).toBe(1);
        expect(await transaction.proposalPricingSource.count({ where: { proposalId } })).toBe(1);
        expect(await transaction.proposalEvent.count({ where: { proposalId } })).toBe(2);
        expect(await transaction.businessEventOutbox.count({ where: { proposalId } })).toBe(2);
        const directRead = await createPrismaProposalReadRepository(transaction).detail(
          owner.companyId,
          proposalId
        );
        expect(directRead).toEqual({ state: aggregate.persistenceState, revision: 0 });
        expect(await createPrismaProposalReadRepository(transaction).detail("other-company", proposalId)).toBeNull();

        aggregate.submit(command(suffix, 2, isolatedOwner.id), {
          method: "EXECUTIVE_AUTHORIZATION",
          authorizedByUserId: isolatedOwner.id,
          businessJustification: "Client deadline requires the approved alternate path."
        });
        expect(await saveProposalInTransaction(transaction, aggregate.persistenceState, 0)).toEqual({
          revision: 1
        });
        const submitted = await findProposalInPersistence(
          transaction,
          owner.companyId,
          aggregate.state.id
        );
        expect(submitted?.aggregate.persistenceState).toEqual(aggregate.persistenceState);
        expect(submitted?.aggregate.state.submittedVersionId).toBe(version.versionId);
        expect(submitted?.revision).toBe(1);
        expect(await transaction.proposalEvent.count({ where: { proposalId } })).toBe(3);
        expect(await transaction.businessEventOutbox.count({ where: { proposalId } })).toBe(3);

        await transaction.proposalVersion.update({
          where: { id: version.versionId },
          data: { revisionReason: "forbidden" }
        });
      })
    ).rejects.toThrow(/immutable/i);

    expect(await prisma.proposal.findUnique({ where: { id: proposalId } })).toBeNull();
  }, 30_000);

  it("persists replacement relationships without changing submitted history", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const {
      findProposalInPersistence,
      insertProposalInTransaction,
      saveProposalInTransaction
    } = await import("@/infrastructure/database/proposal-repository");
    const owner = await prisma.applicationUser.findFirstOrThrow();
    await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);

    await expect(
      prisma.$transaction(async (transaction) => {
        const suffix = crypto.randomUUID();
        const isolatedOwner = await createIsolatedOwner(transaction, owner.companyId, suffix);
        const original = await createFixture(transaction, isolatedOwner, suffix, "PRO-920001");
        const originalVersion = saveVersion(original, suffix, isolatedOwner.id);
        original.submit(command(suffix, 2, isolatedOwner.id), {
          method: "EXECUTIVE_AUTHORIZATION",
          authorizedByUserId: isolatedOwner.id,
          businessJustification: "Approved original submission."
        });
        await insertProposalInTransaction(transaction, original.persistenceState);

        const replacementSuffix = `${suffix}-replacement`;
        const replacement = ProposalAggregate.createReplacement(
          original,
          {
            id: `proposal-persistence-${replacementSuffix}`,
            proposalNumber: "PRO-920002",
            ownerId: isolatedOwner.id,
            title: "Replacement Proposal"
          },
          command(replacementSuffix, 3, isolatedOwner.id)
        );
        saveVersion(replacement, replacementSuffix, isolatedOwner.id, 4);
        replacement.submit(command(replacementSuffix, 5, isolatedOwner.id), {
          method: "EXECUTIVE_AUTHORIZATION",
          authorizedByUserId: isolatedOwner.id,
          businessJustification: "Approved replacement submission."
        });
        await insertProposalInTransaction(transaction, replacement.persistenceState);
        original.supersedeBy(replacement, command(suffix, 6, isolatedOwner.id));
        await saveProposalInTransaction(transaction, original.persistenceState, 0);

        const storedOriginal = await findProposalInPersistence(
          transaction,
          owner.companyId,
          original.state.id
        );
        const storedReplacement = await findProposalInPersistence(
          transaction,
          owner.companyId,
          replacement.state.id
        );
        expect(storedOriginal?.aggregate.state.status).toBe("SUPERSEDED");
        expect(storedOriginal?.aggregate.state.submittedVersionId).toBe(originalVersion.versionId);
        expect(storedOriginal?.aggregate.state.supersededByProposalId).toBe(replacement.state.id);
        expect(storedReplacement?.aggregate.state.supersedesProposalId).toBe(original.state.id);
        expect(storedReplacement?.aggregate.state.acceptances).toHaveLength(0);

        const relation = await transaction.proposal.findUniqueOrThrow({
          where: { id: replacement.state.id },
          select: { supersedesProposalId: true }
        });
        expect(relation.supersedesProposalId).toBe(original.state.id);
        throw new RollbackMarker();
      })
    ).rejects.toBeInstanceOf(RollbackMarker);
  }, 30_000);

  it("rejects stale writers with an integer optimistic-concurrency revision", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const {
      ProposalConcurrencyError,
      insertProposalInTransaction,
      saveProposalInTransaction
    } = await import("@/infrastructure/database/proposal-repository");
    const owner = await prisma.applicationUser.findFirstOrThrow();
    await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);

    await expect(
      prisma.$transaction(async (transaction) => {
        const suffix = crypto.randomUUID();
        const isolatedOwner = await createIsolatedOwner(transaction, owner.companyId, suffix);
        const aggregate = await createFixture(transaction, isolatedOwner, suffix, "PRO-930001");
        saveVersion(aggregate, suffix, isolatedOwner.id);
        await insertProposalInTransaction(transaction, aggregate.persistenceState);
        aggregate.requestQualityReview(command(suffix, 2, isolatedOwner.id));
        await saveProposalInTransaction(transaction, aggregate.persistenceState, 0);

        await expect(
          saveProposalInTransaction(transaction, aggregate.persistenceState, 0)
        ).rejects.toBeInstanceOf(ProposalConcurrencyError);
        expect(
          await transaction.proposal.findUniqueOrThrow({
            where: { id: aggregate.state.id },
            select: { aggregateRevision: true }
          })
        ).toEqual({ aggregateRevision: 1 });
        throw new RollbackMarker();
      })
    ).rejects.toBeInstanceOf(RollbackMarker);
  }, 30_000);

  it("stores immutable, idempotent Representation history independently for multiple Proposal Versions", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import("@/infrastructure/database/proposal-seed");
    const { insertProposalInTransaction } = await import("@/infrastructure/database/proposal-repository");
    const { createPrismaProposalRepresentationRepository } = await import("@/infrastructure/database/proposal-representation-repository");
    const { deterministicRepresentationId } = await import("@/application/proposals/proposal-representation");
    const { ProposalRepresentationRenderer } = await import("@/infrastructure/proposal-representations/proposal-representation-renderer");
    const renderer = new ProposalRepresentationRenderer();
    const owner = await prisma.applicationUser.findFirstOrThrow();
    await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);

    await expect(prisma.$transaction(async (transaction) => {
      const suffix = crypto.randomUUID();
      const isolatedOwner = await createIsolatedOwner(transaction, owner.companyId, suffix);
      const aggregate = await createFixture(transaction, isolatedOwner, suffix, "PRO-910006");
      const first = saveVersion(aggregate, suffix, isolatedOwner.id);
      aggregate.updateDraft({ title: "Second immutable Version" }, command(suffix, 2, isolatedOwner.id).occurredAt);
      const second = aggregate.saveVersion({ versionId: `proposal-version-2-${suffix}` }, command(suffix, 3, isolatedOwner.id));
      await insertProposalInTransaction(transaction, aggregate.persistenceState);
      const repository = createPrismaProposalRepresentationRepository(transaction);

      for (const version of [first, second]) {
        const source = await repository.findVersionSource(owner.companyId, aggregate.state.id, version.versionId);
        expect(source).not.toBeNull();
        for (const representationType of ["HTML", "PDF"] as const) {
          const generated = renderer.render(source!, representationType);
          const input = { id: deterministicRepresentationId(version.versionId, representationType), companyId: owner.companyId, proposalId: aggregate.state.id, proposalVersionId: version.versionId, representationType, representationVersion: 1, rendererVersion: generated.rendererVersion, representationStatus: "GENERATED" as const, contentChecksum: generated.contentChecksum, contentType: generated.contentType, generatedContent: generated.content, metadata: generated.metadata, generatedAt: command(suffix, 4, isolatedOwner.id).occurredAt, generatedByUserId: isolatedOwner.id };
          expect((await repository.insertOrGet(input)).idempotentReplay).toBe(false);
          expect((await repository.insertOrGet(input)).idempotentReplay).toBe(true);
        }
      }
      const history = await repository.list(owner.companyId, aggregate.state.id);
      expect(history).toHaveLength(4);
      expect(new Set(history.map(({ proposalVersionId }) => proposalVersionId))).toEqual(new Set([first.versionId, second.versionId]));
      expect(new Set(history.map(({ representationType }) => representationType))).toEqual(new Set(["HTML", "PDF"]));
      const representation = history.find(({ proposalVersionId, representationType }) => proposalVersionId === first.versionId && representationType === "PDF")!;
      const tokenDigest = `decision-token-${suffix}`;
      await transaction.proposalDelivery.create({ data: { id: `decision-delivery-${suffix}`, companyId: owner.companyId, proposalId: aggregate.state.id, proposalVersionId: first.versionId, proposalRepresentationId: representation.id, representationType: "PDF", deliveryChannel: "SECURE_LINK", status: "AVAILABLE", requestIdentity: `decision-delivery-request-${suffix}`, requestedAt: new Date("2026-07-24T10:00:00.000Z"), requestedByUserId: isolatedOwner.id, correlationId: `delivery-${suffix}`, deliveryAttemptNumber: 1, tokenDigest, expiresAt: new Date("2026-07-25T10:00:00.000Z") } });
      const { createPrismaProposalClientDecisionRepository } = await import("@/infrastructure/database/proposal-client-decision-repository");
      const decisionRepository = createPrismaProposalClientDecisionRepository({ proposalDelivery: transaction.proposalDelivery, proposalClientDecision: transaction.proposalClientDecision, $transaction: async (work: (client: Prisma.TransactionClient) => Promise<unknown>) => work(transaction) } as never);
      const decision = await decisionRepository.recordFromSecureDelivery({ id: `decision-${suffix}`, tokenDigest, outcome: "ACCEPTED", decidedAt: "2026-07-24T12:00:00.000Z", clientDisplayName: "Client", clientMessage: "Accepted", correlationId: `decision-${suffix}`, requestIdentity: `decision-request-${suffix}` });
      expect(decision.status).toBe("RECORDED");
      if (decision.status === "RECORDED") expect(decision.decision.timeline).toHaveLength(1);
      const { createPrismaAgreementRepository } = await import("@/infrastructure/database/agreement-repository");
      const { DefaultAgreementRenderer } = await import("@/infrastructure/agreements/agreement-renderer");
      const agreementRepository = createPrismaAgreementRepository({ proposalClientDecision: transaction.proposalClientDecision, agreement: transaction.agreement, agreementArtifact: transaction.agreementArtifact, $transaction: async (work: (client: Prisma.TransactionClient) => Promise<unknown>) => work(transaction) } as never);
      const agreementSource = await agreementRepository.acceptedSource(owner.companyId, aggregate.state.id);
      expect(agreementSource?.clientDecisionId).toBe(`decision-${suffix}`);
      const agreementNumber = `AGR-${suffix.slice(0, 10).toUpperCase()}`; const generatedAt = "2026-07-24T13:00:00.000Z";
      const agreementRenderer = new DefaultAgreementRenderer(); const document = { ...agreementSource!.source, agreementNumber, agreementVersion: 1 as const, generatedAt };
      const agreementInput = { id: `agreement-${suffix}`, versionId: `agreement-version-${suffix}`, companyId: owner.companyId, proposalId: aggregate.state.id, proposalVersionId: first.versionId, proposalRepresentationId: representation.id, clientDecisionId: `decision-${suffix}`, agreementNumber, generatedAt, generatedByUserId: isolatedOwner.id, requestIdentity: `agreement-request-${suffix}`, correlationId: `agreement-${suffix}`, sourceMetadata: { proposalNumber: agreementSource!.source.proposalNumber, proposalVersionNumber: agreementSource!.source.proposalVersionNumber, clientName: agreementSource!.source.clientName }, artifacts: (["HTML", "PDF"] as const).map((type) => agreementRenderer.render(document, type)) };
      const generatedAgreement = await agreementRepository.createOrReplay(agreementInput);
      expect(generatedAgreement.agreement.agreementVersion).toBe(1);
      expect(generatedAgreement.agreement.artifacts.map(({ type }) => type)).toEqual(["HTML", "PDF"]);
      expect((await transaction.agreement.findUniqueOrThrow({ where: { id: agreementInput.id } })).status).toBe("READY_FOR_SIGNATURE");
      expect(await transaction.proposalVersion.count({ where: { proposalId: aggregate.state.id } })).toBe(2);
      expect(await transaction.proposalRepresentation.count({ where: { proposalId: aggregate.state.id } })).toBe(4);

      throw new RollbackMarker();
    })).rejects.toBeInstanceOf(RollbackMarker);
  }, 30_000);

  it("rolls back aggregate changes when immutable event history conflicts", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const {
      ProposalImmutableConflictError,
      insertProposalInTransaction,
      saveProposalInTransaction
    } = await import("@/infrastructure/database/proposal-repository");
    const owner = await prisma.applicationUser.findFirstOrThrow();
    await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);
    const suffix = crypto.randomUUID();
    const proposalId = `proposal-persistence-${suffix}`;

    await expect(
      prisma.$transaction(async (transaction) => {
        const isolatedOwner = await createIsolatedOwner(transaction, owner.companyId, suffix);
        const aggregate = await createFixture(transaction, isolatedOwner, suffix, "PRO-940001");
        await insertProposalInTransaction(transaction, aggregate.persistenceState);
        const state = aggregate.persistenceState;
        const conflictingState: PersistedProposalState = {
          ...state,
          events: [
            {
              ...state.events[0],
              displaySummary: "Conflicting immutable history."
            }
          ]
        };
        await saveProposalInTransaction(transaction, conflictingState, 0);
      })
    ).rejects.toBeInstanceOf(ProposalImmutableConflictError);

    expect(await prisma.proposal.findUnique({ where: { id: proposalId } })).toBeNull();
    expect(await prisma.proposalEvent.count({ where: { proposalId } })).toBe(0);
    expect(await prisma.businessEventOutbox.count({ where: { proposalId } })).toBe(0);
  }, 30_000);

  it("runs application replacement and supersession inside one database transaction scope", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const { createProposalTransactionScope, listProposalsInPersistence } = await import(
      "@/infrastructure/database/proposal-repository"
    );
    const { ProposalApplicationService } = await import(
      "@/application/proposals/proposal-application-service"
    );
    const { PROPOSAL_CAPABILITIES } = await import(
      "@/application/proposals/proposal-capabilities"
    );
    const existingOwner = await prisma.applicationUser.findFirstOrThrow();
    await ensureConsultingEngagementTypePolicies(existingOwner.companyId, prisma);

    await expect(
      prisma.$transaction(async (transaction) => {
        const suffix = crypto.randomUUID();
        const owner = await createIsolatedOwner(transaction, existingOwner.companyId, suffix);
        const source = await createFixture(transaction, owner, suffix, "PRO-950001");
        let generatedId = 0;
        const application = new ProposalApplicationService({
          actors: {
            load: async () => ({ userId: owner.id, companyId: owner.companyId, active: true })
          },
          capabilities: {
            capabilitiesFor: async () => new Set(Object.values(PROPOSAL_CAPABILITIES))
          },
          pricingVersions: {
            resolve: async () => ({
              ...source.state.pricingSnapshot,
              schemaVersion: 2 as const,
              pricingVersionId: "pricing-version-database",
              pricingVersionNumber: 1
            })
          },
          unitOfWork: createProposalTransactionScope(transaction),
          ids: { nextId: (kind) => `${kind}-${suffix}-${++generatedId}` }
        });
        const appRequest = (requestId: string, minute: number) => ({
          identity: { id: owner.authUserId, email: owner.email },
          companyId: owner.companyId,
          requestId: `${suffix}-${requestId}`,
          occurredAt: `2026-07-21T13:${String(minute).padStart(2, "0")}:00.000Z`
        });

        const original = await application.createProposal(appRequest("create", 0), {
          clientId: source.state.clientId,
          engagementTypePolicy: engagementTypePolicy("PROJECT"),
          pricingProjectId: source.state.pricingSnapshot.pricingProjectId,
          pricingVersionId: "pricing-version-database",
          title: "Database application workflow"
        });
        await application.updateDraft(appRequest("draft", 1), original.aggregate.state.id, {
          recipients: [
            {
              recipientId: `recipient-${suffix}`,
              contactId: null,
              name: "Client",
              email: "client@example.com",
              authorizedToAccept: true
            }
          ]
        });
        await application.saveProposalVersion(appRequest("version", 2), original.aggregate.state.id);
        await application.submitThroughExecutiveAuthorization(
          appRequest("submit", 3),
          original.aggregate.state.id,
          "Approved database application workflow."
        );
        const replacement = await application.createReplacementProposal(
          appRequest("replacement", 4),
          original.aggregate.state.id,
          { title: "Database replacement" }
        );
        const replacementReplay = await application.createReplacementProposal(
          appRequest("replacement", 4),
          original.aggregate.state.id,
          { title: "Database replacement" }
        );
        expect(replacementReplay.idempotentReplay).toBe(true);
        await application.saveProposalVersion(
          appRequest("replacement-version", 5),
          replacement.aggregate.state.id
        );
        await application.submitThroughExecutiveAuthorization(
          appRequest("replacement-submit", 6),
          replacement.aggregate.state.id,
          "Approved database replacement."
        );
        const superseded = await application.supersedeOriginalProposal(
          appRequest("supersede", 7),
          original.aggregate.state.id,
          replacement.aggregate.state.id
        );
        expect(superseded.aggregate.state.status).toBe("SUPERSEDED");
        expect(
          await transaction.proposalEvent.count({
            where: { proposalId: original.aggregate.state.id, eventType: "PROPOSAL_SUBMITTED" }
          })
        ).toBe(1);
        expect(
          await transaction.businessEventOutbox.count({
            where: { proposalId: original.aggregate.state.id }
          })
        ).toBeGreaterThan(0);
        const firstPage = await listProposalsInPersistence(transaction, owner.companyId, {
          limit: 1,
          filter: { clientId: source.state.clientId, ownerId: owner.id }
        });
        expect(firstPage.items).toHaveLength(1);
        expect(firstPage.nextCursor).not.toBeNull();
        const secondPage = await listProposalsInPersistence(transaction, owner.companyId, {
          limit: 1,
          cursor: firstPage.nextCursor!,
          filter: { clientId: source.state.clientId, ownerId: owner.id }
        });
        expect(secondPage.items).toHaveLength(1);
        expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
        const supersededPage = await listProposalsInPersistence(transaction, owner.companyId, {
          limit: 10,
          filter: { status: "SUPERSEDED" }
        });
        expect(supersededPage.items.map(({ id }) => id)).toContain(original.aggregate.state.id);
        throw new RollbackMarker();
      }, { maxWait: 15_000, timeout: 30_000 })
    ).rejects.toBeInstanceOf(RollbackMarker);
  }, 45_000);
});
