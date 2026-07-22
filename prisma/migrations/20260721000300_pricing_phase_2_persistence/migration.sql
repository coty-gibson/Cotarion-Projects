CREATE TYPE "PricingReviewOutcome" AS ENUM ('APPROVED', 'REJECTED');

ALTER TABLE "PricingProject"
  ADD COLUMN "aggregateRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "draftCurrencyRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "reviewCandidateVersionId" TEXT,
  ADD COLUMN "reviewRequestedBy" TEXT,
  ADD COLUMN "reviewRequestedAt" TIMESTAMP(3),
  ADD COLUMN "approvedVersionId" TEXT,
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "archivedBy" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD CONSTRAINT "PricingProject_aggregate_revision_positive_check" CHECK ("aggregateRevision" > 0),
  ADD CONSTRAINT "PricingProject_draft_currency_positive_check" CHECK ("draftCurrencyRevision" > 0),
  ADD CONSTRAINT "PricingProject_review_state_complete_check" CHECK (
    ("reviewCandidateVersionId" IS NULL AND "reviewRequestedBy" IS NULL AND "reviewRequestedAt" IS NULL)
    OR ("reviewCandidateVersionId" IS NOT NULL AND "reviewRequestedBy" IS NOT NULL AND "reviewRequestedAt" IS NOT NULL)
  ),
  ADD CONSTRAINT "PricingProject_approval_state_complete_check" CHECK (
    ("approvedVersionId" IS NULL AND "approvedBy" IS NULL AND "approvedAt" IS NULL)
    OR ("approvedVersionId" IS NOT NULL AND "approvedBy" IS NOT NULL AND "approvedAt" IS NOT NULL)
  ),
  ADD CONSTRAINT "PricingProject_archive_state_complete_check" CHECK (
    ("archivedBy" IS NULL AND "archivedAt" IS NULL)
    OR ("archivedBy" IS NOT NULL AND "archivedAt" IS NOT NULL)
  );

CREATE TABLE "PricingDraft" (
  "pricingProjectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "projectName" VARCHAR(200) NOT NULL,
  "pricingModel" "PricingModelType" NOT NULL,
  "currency" "PricingCurrency" NOT NULL,
  "pricingConfigurationVersionId" TEXT NOT NULL,
  "pricingConfigurationVersion" INTEGER NOT NULL,
  "configurationSchemaVersion" INTEGER NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "methodologyVersion" TEXT NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "outputSnapshot" JSONB NOT NULL,
  "explanationSnapshot" JSONB NOT NULL,
  "catalogSnapshot" JSONB NOT NULL,
  "draftCurrencyRevision" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingDraft_pkey" PRIMARY KEY ("pricingProjectId"),
  CONSTRAINT "PricingDraft_evidence_positive_check" CHECK ("pricingConfigurationVersion" > 0 AND "configurationSchemaVersion" > 0 AND "draftCurrencyRevision" > 0)
);
CREATE UNIQUE INDEX "PricingDraft_pricingProjectId_companyId_key" ON "PricingDraft"("pricingProjectId", "companyId");

CREATE TABLE "PricingVersion" (
  "id" TEXT NOT NULL,
  "pricingProjectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "draftCurrencyRevision" INTEGER NOT NULL,
  "projectName" VARCHAR(200) NOT NULL,
  "pricingModel" "PricingModelType" NOT NULL,
  "currency" "PricingCurrency" NOT NULL,
  "pricingConfigurationVersionId" TEXT NOT NULL,
  "pricingConfigurationVersion" INTEGER NOT NULL,
  "configurationSchemaVersion" INTEGER NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "methodologyVersion" TEXT NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "outputSnapshot" JSONB NOT NULL,
  "explanationSnapshot" JSONB NOT NULL,
  "catalogSnapshot" JSONB NOT NULL,
  CONSTRAINT "PricingVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PricingVersion_evidence_positive_check" CHECK ("versionNumber" > 0 AND "draftCurrencyRevision" > 0 AND "pricingConfigurationVersion" > 0 AND "configurationSchemaVersion" > 0)
);
CREATE UNIQUE INDEX "PricingVersion_pricingProjectId_versionNumber_key" ON "PricingVersion"("pricingProjectId", "versionNumber");
CREATE UNIQUE INDEX "PricingVersion_id_pricingProjectId_key" ON "PricingVersion"("id", "pricingProjectId");
CREATE INDEX "PricingVersion_companyId_idx" ON "PricingVersion"("companyId");

CREATE TABLE "PricingReviewDecision" (
  "id" TEXT NOT NULL,
  "pricingProjectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "pricingVersionId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "outcome" "PricingReviewOutcome" NOT NULL,
  "decidedBy" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL,
  "finding" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingReviewDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PricingReviewDecision_finding_check" CHECK (("outcome" = 'APPROVED' AND "finding" IS NULL) OR ("outcome" = 'REJECTED' AND BTRIM("finding") <> ''))
);
CREATE UNIQUE INDEX "PricingReviewDecision_project_version_time_outcome_key" ON "PricingReviewDecision"("pricingProjectId", "versionNumber", "decidedAt", "outcome");
CREATE INDEX "PricingReviewDecision_companyId_decidedAt_idx" ON "PricingReviewDecision"("companyId", "decidedAt");

CREATE TABLE "PricingProcessedCommand" (
  "commandId" TEXT NOT NULL,
  "pricingProjectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "aggregateRevision" INTEGER NOT NULL,
  CONSTRAINT "PricingProcessedCommand_pkey" PRIMARY KEY ("commandId")
);
CREATE INDEX "PricingProcessedCommand_pricingProjectId_idx" ON "PricingProcessedCommand"("pricingProjectId");

CREATE TABLE "PricingGovernanceEventRecord" (
  "eventId" TEXT NOT NULL,
  "pricingProjectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "aggregateRevision" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingGovernanceEventRecord_pkey" PRIMARY KEY ("eventId")
);
CREATE INDEX "PricingGovernanceEventRecord_companyId_occurredAt_eventId_idx" ON "PricingGovernanceEventRecord"("companyId", "occurredAt", "eventId");
CREATE INDEX "PricingGovernanceEventRecord_project_revision_idx" ON "PricingGovernanceEventRecord"("pricingProjectId", "aggregateRevision");

ALTER TABLE "PricingDraft" ADD CONSTRAINT "PricingDraft_project_company_fkey" FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingVersion" ADD CONSTRAINT "PricingVersion_project_company_fkey" FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingReviewDecision" ADD CONSTRAINT "PricingReviewDecision_project_company_fkey" FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingReviewDecision" ADD CONSTRAINT "PricingReviewDecision_version_project_fkey" FOREIGN KEY ("pricingVersionId", "pricingProjectId") REFERENCES "PricingVersion"("id", "pricingProjectId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingProcessedCommand" ADD CONSTRAINT "PricingProcessedCommand_project_company_fkey" FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingGovernanceEventRecord" ADD CONSTRAINT "PricingGovernanceEventRecord_project_company_fkey" FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_pricing_version() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Pricing Versions are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PricingVersion_immutable" BEFORE UPDATE OR DELETE ON "PricingVersion" FOR EACH ROW EXECUTE FUNCTION protect_pricing_version();

CREATE OR REPLACE FUNCTION protect_pricing_review_decision() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Pricing review decisions are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PricingReviewDecision_immutable" BEFORE UPDATE OR DELETE ON "PricingReviewDecision" FOR EACH ROW EXECUTE FUNCTION protect_pricing_review_decision();

CREATE OR REPLACE FUNCTION protect_pricing_governance_event() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Pricing governance events are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PricingGovernanceEventRecord_immutable" BEFORE UPDATE OR DELETE ON "PricingGovernanceEventRecord" FOR EACH ROW EXECUTE FUNCTION protect_pricing_governance_event();
