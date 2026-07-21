-- ADR-018 Sprint 2: additive Proposal persistence and Pricing Project number transition.
-- Existing EST identifiers are retained byte-for-byte; only future allocation changes to PP.
ALTER TABLE "PricingProject" DROP CONSTRAINT "PricingProject_estimate_format_check";
ALTER TABLE "PricingProject" ADD CONSTRAINT "PricingProject_estimate_format_check"
  CHECK ("estimateNumber" ~ '^(EST|PP)-[0-9]{6,}$');

INSERT INTO "PricingProjectSequence" ("id", "lastValue") VALUES ('global', 0)
ON CONFLICT ("id") DO NOTHING;
UPDATE "PricingProjectSequence"
SET "lastValue" = GREATEST(
  "lastValue",
  COALESCE((SELECT MAX(SUBSTRING("estimateNumber" FROM '[0-9]+$')::BIGINT) FROM "PricingProject"), 0)
)
WHERE "id" = 'global';

CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT','INTERNAL_REVIEW','SUBMITTED','VIEWED','ACCEPTED','DECLINED','EXPIRED','SUPERSEDED','ARCHIVED');

CREATE TABLE "OperatingGroup" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperatingGroup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperatingGroup_code_not_blank" CHECK (BTRIM("code") <> ''),
  CONSTRAINT "OperatingGroup_name_not_blank" CHECK (BTRIM("name") <> '')
);
CREATE UNIQUE INDEX "OperatingGroup_companyId_code_key" ON "OperatingGroup"("companyId","code");
CREATE UNIQUE INDEX "OperatingGroup_id_companyId_key" ON "OperatingGroup"("id","companyId");

CREATE TABLE "EngagementTypePolicyVersion" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "operatingGroupId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "policyVersion" INTEGER NOT NULL, "name" TEXT NOT NULL,
  "proposalRequired" BOOLEAN NOT NULL, "directEngagementPermitted" BOOLEAN NOT NULL,
  "agreementTemplateCode" TEXT NOT NULL, "agreementTemplateName" TEXT NOT NULL,
  "billingMethod" TEXT NOT NULL, "policy" JSONB NOT NULL, "policyChecksum" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EngagementTypePolicyVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EngagementTypePolicyVersion_version_positive" CHECK ("policyVersion" > 0)
);
CREATE UNIQUE INDEX "EngagementTypePolicyVersion_operatingGroupId_code_policyVersion_key" ON "EngagementTypePolicyVersion"("operatingGroupId","code","policyVersion");
CREATE UNIQUE INDEX "EngagementTypePolicyVersion_id_companyId_key" ON "EngagementTypePolicyVersion"("id","companyId");
CREATE INDEX "EngagementTypePolicyVersion_companyId_active_idx" ON "EngagementTypePolicyVersion"("companyId","active");

CREATE TABLE "ProposalSequence" (
  "id" TEXT NOT NULL DEFAULT 'global', "lastValue" BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT "ProposalSequence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProposalSequence_global" CHECK ("id" = 'global'),
  CONSTRAINT "ProposalSequence_nonnegative" CHECK ("lastValue" >= 0)
);

CREATE TABLE "Proposal" (
  "id" TEXT NOT NULL, "proposalNumber" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "operatingGroupId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "engagementTypePolicyId" TEXT NOT NULL, "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" TEXT, "submittedVersionId" TEXT, "effectiveAt" TIMESTAMP(3), "closedAt" TIMESTAMP(3),
  "revisionOpen" BOOLEAN NOT NULL DEFAULT false, "currentAcceptanceId" TEXT, "executedAgreementId" TEXT,
  "supersededByProposalId" TEXT, "draftRevision" INTEGER NOT NULL DEFAULT 1,
  "versionDraftRevision" INTEGER, "nextVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "workingDraft" JSONB NOT NULL, "pricingSnapshot" JSONB NOT NULL, "aggregateState" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Proposal_number_format" CHECK ("proposalNumber" ~ '^PRO-[0-9]{6,}$'),
  CONSTRAINT "Proposal_revisions_positive" CHECK ("draftRevision" > 0 AND "nextVersionNumber" > 0)
);
CREATE UNIQUE INDEX "Proposal_proposalNumber_key" ON "Proposal"("proposalNumber");
CREATE UNIQUE INDEX "Proposal_id_companyId_key" ON "Proposal"("id","companyId");
CREATE INDEX "Proposal_companyId_clientId_idx" ON "Proposal"("companyId","clientId");
CREATE INDEX "Proposal_companyId_status_idx" ON "Proposal"("companyId","status");

CREATE TABLE "ProposalVersion" (
  "id" TEXT NOT NULL, "proposalId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL, "createdByUserId" TEXT NOT NULL,
  "predecessorVersionId" TEXT, "revisionReason" TEXT, "draft" JSONB NOT NULL,
  CONSTRAINT "ProposalVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProposalVersion_number_positive" CHECK ("versionNumber" > 0)
);
CREATE UNIQUE INDEX "ProposalVersion_proposalId_versionNumber_key" ON "ProposalVersion"("proposalId","versionNumber");
CREATE UNIQUE INDEX "ProposalVersion_id_proposalId_key" ON "ProposalVersion"("id","proposalId");
CREATE INDEX "ProposalVersion_companyId_idx" ON "ProposalVersion"("companyId");

CREATE TABLE "ProposalPricingSource" (
  "proposalVersionId" TEXT NOT NULL, "proposalId" TEXT NOT NULL, "pricingProjectId" TEXT NOT NULL,
  "pricingProjectNumber" TEXT NOT NULL, "schemaVersion" INTEGER NOT NULL, "snapshot" JSONB NOT NULL,
  CONSTRAINT "ProposalPricingSource_pkey" PRIMARY KEY ("proposalVersionId"),
  CONSTRAINT "ProposalPricingSource_number_format" CHECK ("pricingProjectNumber" ~ '^(EST|PP)-[0-9]{6,}$'),
  CONSTRAINT "ProposalPricingSource_schema_positive" CHECK ("schemaVersion" > 0)
);
CREATE INDEX "ProposalPricingSource_pricingProjectId_idx" ON "ProposalPricingSource"("pricingProjectId");
CREATE UNIQUE INDEX "ProposalPricingSource_proposalVersionId_proposalId_key" ON "ProposalPricingSource"("proposalVersionId","proposalId");

CREATE TABLE "ProposalEvent" (
  "eventId" TEXT NOT NULL, "proposalId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL, "eventType" TEXT NOT NULL, "eventSchemaVersion" INTEGER NOT NULL,
  "payload" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProposalEvent_pkey" PRIMARY KEY ("eventId")
);
CREATE INDEX "ProposalEvent_companyId_clientId_occurredAt_eventId_idx" ON "ProposalEvent"("companyId","clientId","occurredAt","eventId");

CREATE TABLE "BusinessEventOutbox" (
  "eventId" TEXT NOT NULL, "proposalId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3), "attemptCount" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessEventOutbox_pkey" PRIMARY KEY ("eventId"),
  CONSTRAINT "BusinessEventOutbox_attempt_nonnegative" CHECK ("attemptCount" >= 0)
);
CREATE INDEX "BusinessEventOutbox_publishedAt_occurredAt_eventId_idx" ON "BusinessEventOutbox"("publishedAt","occurredAt","eventId");
CREATE INDEX "BusinessEventOutbox_companyId_clientId_occurredAt_eventId_idx" ON "BusinessEventOutbox"("companyId","clientId","occurredAt","eventId");

ALTER TABLE "OperatingGroup" ADD CONSTRAINT "OperatingGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EngagementTypePolicyVersion" ADD CONSTRAINT "EngagementTypePolicyVersion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EngagementTypePolicyVersion" ADD CONSTRAINT "EngagementTypePolicyVersion_operatingGroupId_companyId_fkey" FOREIGN KEY ("operatingGroupId","companyId") REFERENCES "OperatingGroup"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_operatingGroupId_companyId_fkey" FOREIGN KEY ("operatingGroupId","companyId") REFERENCES "OperatingGroup"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_companyId_fkey" FOREIGN KEY ("clientId","companyId") REFERENCES "Client"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_ownerId_companyId_fkey" FOREIGN KEY ("ownerId","companyId") REFERENCES "ApplicationUser"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_engagementTypePolicyId_companyId_fkey" FOREIGN KEY ("engagementTypePolicyId","companyId") REFERENCES "EngagementTypePolicyVersion"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_companyId_fkey" FOREIGN KEY ("proposalId","companyId") REFERENCES "Proposal"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProposalPricingSource" ADD CONSTRAINT "ProposalPricingSource_proposalVersionId_proposalId_fkey" FOREIGN KEY ("proposalVersionId","proposalId") REFERENCES "ProposalVersion"("id","proposalId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProposalPricingSource" ADD CONSTRAINT "ProposalPricingSource_pricingProjectId_fkey" FOREIGN KEY ("pricingProjectId") REFERENCES "PricingProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProposalEvent" ADD CONSTRAINT "ProposalEvent_proposalId_companyId_fkey" FOREIGN KEY ("proposalId","companyId") REFERENCES "Proposal"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessEventOutbox" ADD CONSTRAINT "BusinessEventOutbox_proposalId_companyId_fkey" FOREIGN KEY ("proposalId","companyId") REFERENCES "Proposal"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_immutable_row() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable and cannot be %d', TG_TABLE_NAME, LOWER(TG_OP);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "EngagementTypePolicyVersion_immutable" BEFORE UPDATE OR DELETE ON "EngagementTypePolicyVersion" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "ProposalVersion_immutable" BEFORE UPDATE OR DELETE ON "ProposalVersion" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "ProposalPricingSource_immutable" BEFORE UPDATE OR DELETE ON "ProposalPricingSource" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "ProposalEvent_immutable" BEFORE UPDATE OR DELETE ON "ProposalEvent" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();

CREATE OR REPLACE FUNCTION protect_proposal_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."proposalNumber" IS DISTINCT FROM OLD."proposalNumber" THEN
    RAISE EXCEPTION 'Proposal numbers are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Proposal_number_immutable" BEFORE UPDATE ON "Proposal" FOR EACH ROW EXECUTE FUNCTION protect_proposal_number();
