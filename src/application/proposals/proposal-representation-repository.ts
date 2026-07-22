import type { JsonObject } from "@/domain/proposals/contracts";
import type {
  ProposalRepresentationStatus,
  ProposalRepresentationType,
  ProposalVersionRepresentationSource
} from "./proposal-representation";

export interface ProposalRepresentationRecord {
  readonly id: string;
  readonly companyId: string;
  readonly proposalId: string;
  readonly proposalVersionId: string;
  readonly proposalVersionNumber: number;
  readonly representationType: ProposalRepresentationType;
  readonly representationVersion: number;
  readonly rendererVersion: string;
  readonly representationStatus: ProposalRepresentationStatus;
  readonly contentChecksum: string;
  readonly contentType: string;
  readonly generatedContent: Uint8Array;
  readonly metadata: JsonObject;
  readonly generatedAt: string;
  readonly generatedByUserId: string;
}

export interface InsertProposalRepresentation {
  readonly id: string;
  readonly companyId: string;
  readonly proposalId: string;
  readonly proposalVersionId: string;
  readonly representationType: ProposalRepresentationType;
  readonly representationVersion: number;
  readonly rendererVersion: string;
  readonly representationStatus: ProposalRepresentationStatus;
  readonly contentChecksum: string;
  readonly contentType: string;
  readonly generatedContent: Uint8Array;
  readonly metadata: JsonObject;
  readonly generatedAt: string;
  readonly generatedByUserId: string;
}

export interface ProposalRepresentationRepository {
  findVersionSource(companyId: string, proposalId: string, proposalVersionId: string): Promise<ProposalVersionRepresentationSource | null>;
  insertOrGet(input: InsertProposalRepresentation): Promise<{ record: ProposalRepresentationRecord; idempotentReplay: boolean }>;
  list(companyId: string, proposalId: string, proposalVersionId?: string): Promise<readonly ProposalRepresentationRecord[]>;
  detail(companyId: string, proposalId: string, representationId: string): Promise<ProposalRepresentationRecord | null>;
  current(companyId: string, proposalId: string, representationType: ProposalRepresentationType): Promise<ProposalRepresentationRecord | null>;
}
