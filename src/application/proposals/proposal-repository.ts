import type { PersistedProposalState, ProposalAggregate } from "@/domain/proposals/proposal-domain";
import type { ProposalPricingVersionResolver } from "@/application/proposals/proposal-pricing-version";

export interface AllocatedProposalIdentity {
  readonly id: string;
  readonly proposalNumber: string;
}

export interface LoadedProposal {
  readonly aggregate: ProposalAggregate;
  readonly revision: number;
}

export interface ProposalWriteResult {
  readonly revision: number;
}

export interface ProposalListFilter {
  readonly status?: string;
  readonly clientId?: string;
  readonly ownerId?: string;
}

export interface ProposalListPageRequest {
  readonly limit: number;
  readonly cursor?: string;
  readonly filter?: ProposalListFilter;
}

export interface ProposalListRecord {
  readonly id: string;
  readonly proposalNumber: string;
  readonly companyId: string;
  readonly clientId: string;
  readonly ownerId: string;
  readonly title: string;
  readonly status: string;
  readonly currentVersionNumber: number | null;
  readonly submittedVersionNumber: number | null;
  readonly versionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly effectiveAt: string | null;
  readonly closedAt: string | null;
}

export interface ProposalListPage {
  readonly items: readonly ProposalListRecord[];
  readonly nextCursor: string | null;
}

export interface ProposalRepository {
  allocateProposalIdentity(): Promise<AllocatedProposalIdentity>;
  insert(aggregate: ProposalAggregate): Promise<ProposalWriteResult>;
  save(
    aggregate: ProposalAggregate,
    expectedRevision: number
  ): Promise<ProposalWriteResult>;
  findById(companyId: string, proposalId: string): Promise<LoadedProposal | null>;
  findByEventId(companyId: string, eventId: string): Promise<LoadedProposal | null>;
  list(companyId: string, request: ProposalListPageRequest): Promise<ProposalListPage>;
}

export interface ProposalUnitOfWork {
  execute<T>(
    work: (
      repository: ProposalRepository,
      pricingVersions?: ProposalPricingVersionResolver
    ) => Promise<T>
  ): Promise<T>;
}

export interface ProposalReadSource {
  readonly state: PersistedProposalState;
  readonly revision: number;
}

export interface ProposalReadRepository {
  detail(companyId: string, proposalId: string): Promise<ProposalReadSource | null>;
  list(companyId: string, request: ProposalListPageRequest): Promise<ProposalListPage>;
}
