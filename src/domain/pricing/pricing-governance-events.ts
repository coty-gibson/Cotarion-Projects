export type PricingGovernanceEvent =
  | {
      readonly type: "PricingProjectCreated";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly clientId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
    }
  | {
      readonly type: "PricingDraftUpdated";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
      readonly draftCurrency: number;
    }
  | {
      readonly type: "PricingVersionSaved";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
      readonly pricingVersionId: string;
      readonly versionNumber: number;
      readonly draftCurrency: number;
    }
  | {
      readonly type: "QualityReviewRequested";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
      readonly pricingVersionId: string;
      readonly versionNumber: number;
    }
  | {
      readonly type: "QualityReviewApproved";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
      readonly pricingVersionId: string;
      readonly versionNumber: number;
      readonly versionCreatorId: string;
    }
  | {
      readonly type: "QualityReviewRejected";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
      readonly pricingVersionId: string;
      readonly versionNumber: number;
      readonly finding: string;
    }
  | {
      readonly type: "RevisionStarted";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
      readonly previousApprovedVersionId: string;
      readonly draftCurrency: number;
    }
  | {
      readonly type: "PricingProjectArchived";
      readonly eventId: string;
      readonly commandId: string;
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly actorId: string;
      readonly occurredAt: string;
      readonly aggregateRevision: number;
    };
