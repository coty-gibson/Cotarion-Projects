import type { ProposalPricingSnapshotV2 } from "@/domain/proposals/contracts";

export interface ResolveProposalPricingVersionInput {
  readonly companyId: string;
  readonly clientId: string;
  readonly pricingProjectId: string;
  readonly pricingVersionId: string;
  readonly capturedAt: string;
}

export interface ProposalPricingVersionResolver {
  resolve(input: ResolveProposalPricingVersionInput): Promise<ProposalPricingSnapshotV2 | null>;
}
