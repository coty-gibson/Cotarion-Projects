import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import type { ProposalRepresentationRecord, ProposalRepresentationRepository } from "./proposal-representation-repository";
import { ProposalRepresentationQueryService } from "./proposal-representation-query-service";

const identity: AuthenticatedIdentity = { id: "auth-1", email: "member@example.com", name: "Member" };
const record: ProposalRepresentationRecord = {
  id: "representation-1", companyId: "company-1", proposalId: "proposal-1", proposalVersionId: "version-1", proposalVersionNumber: 1,
  representationType: "HTML", representationVersion: 1, rendererVersion: "renderer/1", representationStatus: "GENERATED",
  contentChecksum: "checksum", contentType: "text/html", generatedContent: new TextEncoder().encode("<html></html>"), metadata: {},
  generatedAt: "2026-07-21T12:00:00.000Z", generatedByUserId: "member-1"
};

describe("Proposal Representation direct-read queries", () => {
  it("projects list, detail, current, history, and content directly from the read repository", async () => {
    const repository: ProposalRepresentationRepository = {
      findVersionSource: vi.fn(), insertOrGet: vi.fn(),
      list: vi.fn().mockResolvedValue([record]), detail: vi.fn().mockResolvedValue(record), current: vi.fn().mockResolvedValue(record)
    };
    const queries = new ProposalRepresentationQueryService(
      { load: async () => ({ userId: "member-1", companyId: "company-1", active: true }) }, repository
    );
    expect(await queries.list(identity, "company-1", "proposal-1")).toEqual([expect.objectContaining({ id: "representation-1" })]);
    expect(await queries.detail(identity, "company-1", "proposal-1", "representation-1")).not.toHaveProperty("generatedContent");
    expect(await queries.current(identity, "company-1", "proposal-1", "HTML")).toMatchObject({ id: "representation-1" });
    expect(await queries.history(identity, "company-1", "proposal-1")).toHaveLength(1);
    expect(new TextDecoder().decode((await queries.content(identity, "company-1", "proposal-1", "representation-1")).content)).toBe("<html></html>");
    expect(repository.findVersionSource).not.toHaveBeenCalled();
  });
});
