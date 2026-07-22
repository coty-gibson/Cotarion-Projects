import { describe, expect, it } from "vitest";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import {
  PRICING_CAPABILITIES,
  type PricingActorContext,
  type PricingCapability
} from "@/application/pricing/pricing-capabilities";
import {
  PricingApplicationService,
  type PricingCommandRequest
} from "@/application/pricing/pricing-application-service";
import { PricingApplicationError } from "@/application/pricing/pricing-application-errors";
import { PricingProject, type PersistedPricingProjectState, type PricingDraft } from "@/domain/pricing";
import type { PricingGovernanceEvent } from "@/domain/pricing/pricing-governance-events";
import type { PricingAggregateRepository } from "@/infrastructure/database/pricing-repository";

const identity: AuthenticatedIdentity = { id: "auth-member", email: "member@example.test", name: "Member" };
const actor: PricingActorContext = { userId: "user-member", companyId: "company-1", active: true };

function draft(name = "Application Pricing"): PricingDraft {
  return {
    projectName: name,
    pricingModel: "PROJECT",
    currency: "USD",
    pricingConfigurationVersionId: "configuration-1",
    pricingConfigurationVersion: 1,
    configurationSchemaVersion: 1,
    engineVersion: "pricing-engine/2.0.0",
    methodologyVersion: "project-pricing/1.0.0",
    inputSnapshot: { services: [{ id: "service-1", quantity: "1.00" }] },
    outputSnapshot: { total: "1000.00" },
    explanationSnapshot: { steps: [{ label: "Total", amount: "1000.00" }] },
    catalogSnapshot: { services: [{ id: "service-1", name: "Service" }] }
  };
}

function request(requestId: string, expectedRevision: number): PricingCommandRequest {
  return {
    identity,
    companyId: "company-1",
    requestId,
    occurredAt: `2026-07-21T${String(10 + expectedRevision).padStart(2, "0")}:00:00.000Z`,
    expectedRevision
  };
}

class MemoryPricingRepository implements PricingAggregateRepository {
  records = new Map<string, PersistedPricingProjectState>();
  events: PricingGovernanceEvent[] = [];
  nextFailure: Error | null = null;

  async load(companyId: string, pricingProjectId: string) {
    const state = this.records.get(pricingProjectId);
    if (!state || state.companyId !== companyId) return null;
    return { aggregate: PricingProject.rehydrate(structuredClone(state)), revision: state.revision };
  }

  async save(aggregate: PricingProject, expectedRevision: number, events: readonly PricingGovernanceEvent[]) {
    if (this.nextFailure) {
      const failure = this.nextFailure;
      this.nextFailure = null;
      throw failure;
    }
    const current = this.records.get(aggregate.id.value);
    const actual = current?.revision ?? 0;
    if (actual !== expectedRevision) {
      const error = new Error(`Expected revision ${expectedRevision}; found ${actual}.`);
      error.name = "PricingConcurrencyError";
      throw error;
    }
    const state = structuredClone(aggregate.persistenceState);
    const eventCopies = structuredClone(events);
    this.records.set(aggregate.id.value, state);
    this.events.push(...eventCopies);
    return { revision: state.revision };
  }
}

function service(options?: {
  repository?: MemoryPricingRepository;
  actor?: PricingActorContext | null;
  capabilities?: readonly PricingCapability[];
}) {
  const repository = options?.repository ?? new MemoryPricingRepository();
  let estimate = 0;
  const capabilities = options?.capabilities ?? Object.values(PRICING_CAPABILITIES);
  return {
    repository,
    application: new PricingApplicationService({
      actors: { load: async (authenticated) => options && "actor" in options
        ? options.actor ?? null
        : { ...actor, userId: authenticated.id === identity.id ? actor.userId : "user-reviewer" } },
      capabilities: { capabilitiesFor: async () => new Set(capabilities) },
      repository,
      ids: {
        pricingProjectId: (requestId) => `pricing-project-${requestId}`,
        pricingVersionId: (requestId) => `pricing-version-${requestId}`,
        estimateNumber: async () => `PP-${String(++estimate).padStart(6, "0")}`
      }
    })
  };
}

async function create(application: PricingApplicationService, id = "create") {
  return application.createPricingProject(
    { identity, companyId: "company-1", requestId: id, occurredAt: "2026-07-21T10:00:00.000Z" },
    { clientId: "client-1", draft: draft() }
  );
}

describe("Pricing application service", () => {
  it("orchestrates every existing aggregate command and persists all emitted events", async () => {
    const { application, repository } = service();
    let result = await create(application);
    const id = result.aggregate.id.value;
    expect(result.revision).toBe(1);

    result = await application.updateDraft(request("update", 1), id, draft("Updated Pricing"));
    result = await application.saveVersion(request("version-1", 2), id);
    result = await application.requestQualityReview(request("review-1", 3), id, 1);
    result = await application.rejectVersion(
      { ...request("reject-1", 4), identity: { id: "auth-reviewer", email: "reviewer@example.test" } },
      id,
      "Clarify the scope."
    );
    result = await application.updateDraft(request("update-2", 5), id, draft("Corrected Pricing"));
    result = await application.saveVersion(request("version-2", 6), id);
    result = await application.requestQualityReview(request("review-2", 7), id, 2);
    result = await application.approveVersion(
      { ...request("approve", 8), identity: { id: "auth-reviewer", email: "reviewer@example.test" } }, id
    );
    result = await application.beginRevision(request("revision", 9), id);
    result = await application.archiveProject(request("archive", 10), id);

    const persisted = await repository.load("company-1", id);
    expect(persisted?.aggregate.status).toBe("ARCHIVED");
    expect(persisted?.aggregate.versions.map(({ number }) => number.value)).toEqual([1, 2]);
    expect(persisted?.aggregate.reviewDecisions.map(({ outcome }) => outcome)).toEqual(["REJECTED", "APPROVED"]);
    expect(repository.events.map(({ type }) => type)).toEqual([
      "PricingProjectCreated", "PricingDraftUpdated", "PricingVersionSaved",
      "QualityReviewRequested", "QualityReviewRejected", "PricingDraftUpdated",
      "PricingVersionSaved", "QualityReviewRequested", "QualityReviewApproved",
      "RevisionStarted", "PricingProjectArchived"
    ]);
    expect(result.events[0]?.type).toBe("PricingProjectArchived");
  });

  it("surfaces optimistic concurrency failures without retrying or persisting events", async () => {
    const { application, repository } = service();
    const created = await create(application);
    await expect(application.updateDraft(request("stale", 0), created.aggregate.id.value, draft("Stale")))
      .rejects.toMatchObject({ code: "OPTIMISTIC_CONCURRENCY_CONFLICT" });
    expect((await repository.load("company-1", created.aggregate.id.value))?.aggregate.draft.projectName)
      .toBe("Application Pricing");
    expect(repository.events).toHaveLength(1);
  });

  it("rejects inactive, cross-Company, and capability-denied actors before persistence", async () => {
    await expect(create(service({ actor: null }).application)).rejects.toMatchObject({ code: "NOT_AUTHENTICATED" });
    await expect(create(service({ actor: { ...actor, companyId: "other-company" } }).application))
      .rejects.toMatchObject({ code: "COMPANY_SCOPE_VIOLATION" });
    const denied = service({ capabilities: [] });
    await expect(create(denied.application)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    expect(denied.repository.records.size).toBe(0);
  });

  it("keeps aggregate and event persistence unchanged when a transaction fails", async () => {
    const repository = new MemoryPricingRepository();
    const { application } = service({ repository });
    const created = await create(application);
    repository.nextFailure = new Error("database unavailable");
    await expect(application.updateDraft(request("failure", 1), created.aggregate.id.value, draft("Must Roll Back")))
      .rejects.toBeInstanceOf(PricingApplicationError);
    const persisted = await repository.load("company-1", created.aggregate.id.value);
    expect(persisted?.aggregate.draft.projectName).toBe("Application Pricing");
    expect(repository.events).toHaveLength(1);
  });

  it("leaves reviewer independence and lifecycle violations to the aggregate", async () => {
    const { application } = service();
    let result = await create(application);
    const id = result.aggregate.id.value;
    result = await application.saveVersion(request("version", 1), id);
    result = await application.requestQualityReview(request("review", 2), id, 1);
    await expect(application.approveVersion(request("self-approve", 3), id))
      .rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
  });
});
