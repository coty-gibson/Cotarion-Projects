import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PricingPartyReadModel,
  PricingProjectDetailSource,
  PricingProjectSummaryReadModel,
  PricingReadRepository,
  PricingReviewHistoryReadModel,
  PricingVersionHistoryReadModel
} from "@/application/pricing/pricing-read-models";
import { prisma } from "@/infrastructure/database/prisma";
import type { PricingDraft } from "@/domain/pricing";

type ReadClient = PrismaClient | Prisma.TransactionClient;

const summaryInclude = {
  client: { select: { id: true, clientNumber: true, name: true } },
  owner: { select: { id: true, name: true, email: true } },
  versions: { select: { id: true, versionNumber: true }, orderBy: { versionNumber: "desc" as const }, take: 1 }
} satisfies Prisma.PricingProjectInclude;

type SummaryRow = Prisma.PricingProjectGetPayload<{ include: typeof summaryInclude }>;

function summary(row: SummaryRow): PricingProjectSummaryReadModel {
  const current = row.versions[0];
  return {
    id: row.id,
    estimateNumber: row.estimateNumber,
    client: { id: row.client.id, clientNumber: row.client.clientNumber, name: row.client.name },
    owner: { id: row.owner.id, name: row.owner.name ?? row.owner.email, email: row.owner.email },
    projectName: row.projectName,
    status: row.status,
    pricingModel: row.pricingModel,
    currentVersion: current ? { id: current.id, number: current.versionNumber } : null,
    lastUpdated: row.updatedAt.toISOString()
  };
}

function eventPayload(value: Prisma.JsonValue) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Prisma.JsonValue>
    : {};
}

async function parties(client: ReadClient, companyId: string, ids: readonly string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const users = unique.length ? await client.applicationUser.findMany({
    where: { companyId, id: { in: unique } }, select: { id: true, name: true, email: true }
  }) : [];
  const byId = new Map(users.map((user) => [user.id, { id: user.id, name: user.name ?? user.email }]));
  return (id: string): PricingPartyReadModel => byId.get(id) ?? { id, name: "Unknown user" };
}

async function histories(client: ReadClient, companyId: string, pricingProjectId: string) {
  const [project, versions, decisions, events] = await Promise.all([
    client.pricingProject.findFirst({ where: { id: pricingProjectId, companyId }, select: {
      id: true, reviewCandidateVersionId: true, approvedVersionId: true
    }}),
    client.pricingVersion.findMany({ where: { pricingProjectId, companyId }, orderBy: { versionNumber: "asc" } }),
    client.pricingReviewDecision.findMany({ where: { pricingProjectId, companyId }, orderBy: [{ decidedAt: "asc" }, { id: "asc" }] }),
    client.pricingGovernanceEventRecord.findMany({
      where: { pricingProjectId, companyId, eventType: { in: ["QualityReviewRequested", "QualityReviewApproved", "QualityReviewRejected", "RevisionStarted"] } },
      orderBy: [{ occurredAt: "asc" }, { aggregateRevision: "asc" }]
    })
  ]);
  if (!project) return null;
  const actor = await parties(client, companyId, [
    ...versions.map(({ creatorId }) => creatorId),
    ...decisions.map(({ decidedBy }) => decidedBy),
    ...events.map(({ actorId }) => actorId)
  ]);
  const revisionEvents = events.filter(({ eventType }) => eventType === "RevisionStarted");
  const versionModels: PricingVersionHistoryReadModel[] = versions.map((version) => {
    const latestDecision = [...decisions].reverse().find(({ pricingVersionId }) => pricingVersionId === version.id);
    const originEvent = [...revisionEvents].reverse().find(({ occurredAt }) => occurredAt <= version.createdAt);
    const originPayload = originEvent ? eventPayload(originEvent.payload) : {};
    const status = project.reviewCandidateVersionId === version.id
      ? "IN_REVIEW"
      : latestDecision?.outcome ?? "SAVED";
    return {
      id: version.id,
      number: version.versionNumber,
      createdAt: version.createdAt.toISOString(),
      createdBy: actor(version.creatorId),
      approvalStatus: status,
      reviewer: latestDecision ? actor(latestDecision.decidedBy) : null,
      reviewedAt: latestDecision?.decidedAt.toISOString() ?? null,
      revisionOriginVersionId: typeof originPayload.previousApprovedVersionId === "string"
        ? originPayload.previousApprovedVersionId
        : null
    };
  });
  const reviews: PricingReviewHistoryReadModel[] = events
    .filter(({ eventType }) => eventType !== "RevisionStarted")
    .map((event) => {
      const payload = eventPayload(event.payload);
      const type = event.eventType === "QualityReviewRequested"
        ? "REQUESTED"
        : event.eventType === "QualityReviewApproved" ? "APPROVED" : "REJECTED";
      return {
        type,
        pricingVersionId: String(payload.pricingVersionId ?? ""),
        versionNumber: Number(payload.versionNumber),
        actor: actor(event.actorId),
        findings: typeof payload.finding === "string" ? payload.finding : null,
        occurredAt: event.occurredAt.toISOString()
      };
    });
  return { versions: versionModels, reviews };
}

export function createPrismaPricingReadRepository(client: ReadClient = prisma): PricingReadRepository {
  return {
    async list(companyId, query) {
      const where: Prisma.PricingProjectWhereInput = {
        companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.pricingModel ? { pricingModel: query.pricingModel } : {}),
        ...(query.search ? { OR: [
          { estimateNumber: { contains: query.search, mode: "insensitive" } },
          { projectName: { contains: query.search, mode: "insensitive" } },
          { client: { name: { contains: query.search, mode: "insensitive" } } }
        ] } : {})
      };
      const sortField = {
        lastUpdated: "updatedAt",
        estimateNumber: "estimateNumber",
        projectName: "projectName",
        status: "status",
        pricingModel: "pricingModel"
      }[query.sortBy];
      const [rows, total] = await Promise.all([
        client.pricingProject.findMany({
          where,
          include: summaryInclude,
          orderBy: [{ [sortField]: query.sortDirection }, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize
        }),
        client.pricingProject.count({ where })
      ]);
      return {
        items: rows.map(summary), page: query.page, pageSize: query.pageSize, total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
      };
    },

    async detail(companyId, pricingProjectId) {
      const [row, history] = await Promise.all([
        client.pricingProject.findFirst({
          where: { id: pricingProjectId, companyId },
          include: { ...summaryInclude, governanceDraft: true, versions: { orderBy: { versionNumber: "desc" } } }
        }),
        histories(client, companyId, pricingProjectId)
      ]);
      if (!row || !row.governanceDraft || !history) return null;
      const actor = await parties(client, companyId, [row.approvedBy ?? "", row.reviewRequestedBy ?? ""]);
      const approved = row.approvedVersionId ? row.versions.find(({ id }) => id === row.approvedVersionId) : null;
      const candidate = row.reviewCandidateVersionId ? row.versions.find(({ id }) => id === row.reviewCandidateVersionId) : null;
      return {
        summary: summary({ ...row, versions: row.versions.slice(0, 1) }),
        draft: {
          projectName: row.governanceDraft.projectName,
          pricingModel: row.governanceDraft.pricingModel,
          currency: row.governanceDraft.currency,
          pricingConfigurationVersionId: row.governanceDraft.pricingConfigurationVersionId,
          pricingConfigurationVersion: row.governanceDraft.pricingConfigurationVersion,
          configurationSchemaVersion: row.governanceDraft.configurationSchemaVersion,
          engineVersion: row.governanceDraft.engineVersion,
          methodologyVersion: row.governanceDraft.methodologyVersion,
          lastUpdated: row.governanceDraft.updatedAt.toISOString()
        },
        approvedVersion: approved && row.approvedBy && row.approvedAt ? {
          id: approved.id, number: approved.versionNumber, approvedBy: actor(row.approvedBy), approvedAt: row.approvedAt.toISOString()
        } : null,
        reviewCandidate: candidate && row.reviewRequestedBy && row.reviewRequestedAt ? {
          id: candidate.id, number: candidate.versionNumber, requestedBy: actor(row.reviewRequestedBy), requestedAt: row.reviewRequestedAt.toISOString()
        } : null,
        versionCount: row.versions.length,
        versions: history.versions,
        reviews: history.reviews
      } satisfies PricingProjectDetailSource;
    },

    async versions(companyId, pricingProjectId) {
      return (await histories(client, companyId, pricingProjectId))?.versions ?? null;
    },

    async reviews(companyId, pricingProjectId) {
      return (await histories(client, companyId, pricingProjectId))?.reviews ?? null;
    },

    async editableDraft(companyId, pricingProjectId) {
      const row = await client.pricingProject.findFirst({
        where: { id: pricingProjectId, companyId },
        select: {
          id: true,
          estimateNumber: true,
          aggregateRevision: true,
          client: { select: { id: true, clientNumber: true, name: true } },
          owner: { select: { id: true, name: true, email: true } },
          governanceDraft: true
        }
      });
      if (!row?.governanceDraft) return null;
      const draft = row.governanceDraft;
      return {
        pricingProjectId: row.id,
        estimateNumber: row.estimateNumber,
        client: { id: row.client.id, clientNumber: row.client.clientNumber, name: row.client.name },
        owner: { id: row.owner.id, name: row.owner.name ?? row.owner.email, email: row.owner.email },
        draft: {
          projectName: draft.projectName,
          pricingModel: draft.pricingModel,
          currency: draft.currency,
          pricingConfigurationVersionId: draft.pricingConfigurationVersionId,
          pricingConfigurationVersion: draft.pricingConfigurationVersion,
          configurationSchemaVersion: draft.configurationSchemaVersion,
          engineVersion: draft.engineVersion,
          methodologyVersion: draft.methodologyVersion,
          inputSnapshot: draft.inputSnapshot as PricingDraft["inputSnapshot"],
          outputSnapshot: draft.outputSnapshot as PricingDraft["outputSnapshot"],
          explanationSnapshot: draft.explanationSnapshot as PricingDraft["explanationSnapshot"],
          catalogSnapshot: draft.catalogSnapshot as PricingDraft["catalogSnapshot"]
        },
        concurrencyVersion: row.aggregateRevision
      };
    },

    async actionContext(companyId, pricingProjectId) {
      const row = await client.pricingProject.findFirst({
        where: { id: pricingProjectId, companyId },
        select: {
          status: true,
          draftCurrencyRevision: true,
          reviewCandidateVersionId: true,
          versions: {
            select: { id: true, creatorId: true, draftCurrencyRevision: true }
          }
        }
      });
      if (!row) return null;
      const candidate = row.reviewCandidateVersionId
        ? row.versions.find(({ id }) => id === row.reviewCandidateVersionId)
        : null;
      return {
        status: row.status,
        hasDraftCurrentVersion: row.versions.some(
          ({ draftCurrencyRevision }) => draftCurrencyRevision === row.draftCurrencyRevision
        ),
        reviewCandidateCreatorId: candidate?.creatorId ?? null
      };
    }
  };
}
