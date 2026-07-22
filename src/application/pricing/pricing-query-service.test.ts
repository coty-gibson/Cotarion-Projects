import { describe, expect, it } from "vitest";
import { PricingQueryService } from "@/application/pricing/pricing-query-service";
import { PRICING_CAPABILITIES, type PricingCapability } from "@/application/pricing/pricing-capabilities";
import type {
  PricingActionContextReadModel,
  PricingReadRepository
} from "@/application/pricing/pricing-read-models";

const identity = { id: "auth-user", email: "user@example.test" };
const actor = { userId: "user-1", companyId: "company-1", active: true };
const projectId = "pricing-project-1";

function repository(context: PricingActionContextReadModel): PricingReadRepository {
  const summary = {
    id: projectId,
    estimateNumber: "PP-000001",
    client: { id: "client-1", clientNumber: "CLI-000001", name: "Client" },
    owner: { id: actor.userId, name: "Owner", email: "owner@example.test" },
    projectName: "Architecture Pricing",
    status: context.status,
    pricingModel: "PROJECT" as const,
    currentVersion: null,
    lastUpdated: "2026-07-21T12:00:00.000Z"
  };
  return {
    list: async () => ({ items: [summary], page: 1, pageSize: 25, total: 1, totalPages: 1 }),
    detail: async () => ({
      summary,
      draft: {
        projectName: summary.projectName,
        pricingModel: "PROJECT",
        currency: "USD",
        pricingConfigurationVersionId: "configuration-1",
        pricingConfigurationVersion: 1,
        configurationSchemaVersion: 1,
        engineVersion: "engine-1",
        methodologyVersion: "method-1",
        lastUpdated: summary.lastUpdated
      },
      approvedVersion: null,
      reviewCandidate: null,
      versionCount: 0,
      versions: [],
      reviews: []
    }),
    versions: async () => [],
    reviews: async () => [],
    editableDraft: async () => ({
      pricingProjectId: projectId,
      estimateNumber: summary.estimateNumber,
      client: summary.client,
      owner: summary.owner,
      draft: {
        projectName: summary.projectName,
        pricingModel: "PROJECT",
        currency: "USD",
        pricingConfigurationVersionId: "configuration-1",
        pricingConfigurationVersion: 1,
        configurationSchemaVersion: 1,
        engineVersion: "engine-1",
        methodologyVersion: "method-1",
        inputSnapshot: {}, outputSnapshot: {}, explanationSnapshot: {}, catalogSnapshot: {}
      },
      concurrencyVersion: 1
    }),
    actionContext: async () => context
  };
}

function service(context: PricingActionContextReadModel, capabilities: readonly PricingCapability[]) {
  return new PricingQueryService(
    { load: async () => actor },
    { capabilitiesFor: async () => new Set(capabilities) },
    repository(context)
  );
}

describe("Pricing query permitted actions", () => {
  it("projects Draft actions from lifecycle state and member capabilities", async () => {
    const queries = service({
      status: "DRAFT",
      hasDraftCurrentVersion: true,
      reviewCandidateCreatorId: null
    }, [
      PRICING_CAPABILITIES.EDIT_DRAFT,
      PRICING_CAPABILITIES.SAVE_VERSION,
      PRICING_CAPABILITIES.REQUEST_REVIEW,
      PRICING_CAPABILITIES.ARCHIVE_DRAFT
    ]);
    await expect(queries.detail(identity, actor.companyId, projectId)).resolves.toMatchObject({
      permittedActions: ["EDIT_DRAFT", "SAVE_VERSION", "REQUEST_QUALITY_REVIEW", "ARCHIVE"]
    });
  });

  it("removes review decisions for the Version creator and users without review capability", async () => {
    const creator = service({
      status: "IN_REVIEW",
      hasDraftCurrentVersion: true,
      reviewCandidateCreatorId: actor.userId
    }, [PRICING_CAPABILITIES.QUALITY_REVIEW]);
    await expect(creator.detail(identity, actor.companyId, projectId)).resolves.toMatchObject({
      permittedActions: []
    });

    const member = service({
      status: "IN_REVIEW",
      hasDraftCurrentVersion: true,
      reviewCandidateCreatorId: "other-user"
    }, [PRICING_CAPABILITIES.SAVE_VERSION]);
    await expect(member.detail(identity, actor.companyId, projectId)).resolves.toMatchObject({
      permittedActions: []
    });
  });

  it("projects privileged review and Quoted actions for independent authorized actors", async () => {
    const reviewer = service({
      status: "IN_REVIEW",
      hasDraftCurrentVersion: true,
      reviewCandidateCreatorId: "other-user"
    }, [PRICING_CAPABILITIES.QUALITY_REVIEW]);
    await expect(reviewer.detail(identity, actor.companyId, projectId)).resolves.toMatchObject({
      permittedActions: ["APPROVE", "REJECT"]
    });

    const quoted = service({
      status: "QUOTED",
      hasDraftCurrentVersion: true,
      reviewCandidateCreatorId: null
    }, [PRICING_CAPABILITIES.BEGIN_REVISION, PRICING_CAPABILITIES.ARCHIVE_QUOTED]);
    await expect(quoted.editableDraft(identity, actor.companyId, projectId)).resolves.toMatchObject({
      permittedActions: ["BEGIN_REVISION", "ARCHIVE"]
    });
  });
});
