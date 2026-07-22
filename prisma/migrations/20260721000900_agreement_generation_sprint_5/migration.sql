CREATE TABLE "Agreement" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "proposalId" TEXT NOT NULL,
  "proposalVersionId" TEXT NOT NULL, "proposalRepresentationId" TEXT NOT NULL,
  "clientDecisionId" TEXT NOT NULL, "agreementNumber" TEXT NOT NULL, "status" TEXT NOT NULL,
  "currentVersion" INTEGER NOT NULL, "generatedAt" TIMESTAMP(3) NOT NULL,
  "generatedByUserId" TEXT NOT NULL, "requestIdentity" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Agreement_status_check" CHECK ("status" IN ('GENERATED','READY_FOR_SIGNATURE'))
);
CREATE UNIQUE INDEX "Agreement_clientDecisionId_key" ON "Agreement"("clientDecisionId");
CREATE UNIQUE INDEX "Agreement_clientDecisionId_companyId_key" ON "Agreement"("clientDecisionId","companyId");
CREATE UNIQUE INDEX "Agreement_companyId_requestIdentity_key" ON "Agreement"("companyId","requestIdentity");
CREATE UNIQUE INDEX "Agreement_companyId_agreementNumber_key" ON "Agreement"("companyId","agreementNumber");
CREATE UNIQUE INDEX "Agreement_id_companyId_key" ON "Agreement"("id","companyId");
CREATE INDEX "Agreement_companyId_proposalId_generatedAt_idx" ON "Agreement"("companyId","proposalId","generatedAt");
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_clientDecisionId_companyId_fkey" FOREIGN KEY ("clientDecisionId","companyId") REFERENCES "ProposalClientDecision"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AgreementVersion" ("id" TEXT NOT NULL, "agreementId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "versionNumber" INTEGER NOT NULL, "status" TEXT NOT NULL, "sourceMetadata" JSONB NOT NULL, "generatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AgreementVersion_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AgreementVersion_agreementId_versionNumber_key" ON "AgreementVersion"("agreementId","versionNumber");
CREATE UNIQUE INDEX "AgreementVersion_id_companyId_key" ON "AgreementVersion"("id","companyId");
ALTER TABLE "AgreementVersion" ADD CONSTRAINT "AgreementVersion_agreementId_companyId_fkey" FOREIGN KEY ("agreementId","companyId") REFERENCES "Agreement"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AgreementArtifact" ("id" TEXT NOT NULL, "agreementVersionId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "artifactType" TEXT NOT NULL, "contentType" TEXT NOT NULL, "contentChecksum" TEXT NOT NULL, "generatedContent" BYTEA NOT NULL, "rendererVersion" TEXT NOT NULL, "metadata" JSONB NOT NULL, "generatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AgreementArtifact_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AgreementArtifact_agreementVersionId_artifactType_key" ON "AgreementArtifact"("agreementVersionId","artifactType");
CREATE INDEX "AgreementArtifact_companyId_generatedAt_idx" ON "AgreementArtifact"("companyId","generatedAt");
ALTER TABLE "AgreementArtifact" ADD CONSTRAINT "AgreementArtifact_agreementVersionId_companyId_fkey" FOREIGN KEY ("agreementVersionId","companyId") REFERENCES "AgreementVersion"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AgreementGenerationEvent" ("id" TEXT NOT NULL, "agreementId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL, "actorUserId" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "evidence" JSONB NOT NULL, CONSTRAINT "AgreementGenerationEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AgreementGenerationEvent_companyId_agreementId_occurredAt_idx" ON "AgreementGenerationEvent"("companyId","agreementId","occurredAt");
ALTER TABLE "AgreementGenerationEvent" ADD CONSTRAINT "AgreementGenerationEvent_agreementId_companyId_fkey" FOREIGN KEY ("agreementId","companyId") REFERENCES "Agreement"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "Agreement_immutable" BEFORE UPDATE OR DELETE ON "Agreement" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "AgreementVersion_immutable" BEFORE UPDATE OR DELETE ON "AgreementVersion" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "AgreementArtifact_immutable" BEFORE UPDATE OR DELETE ON "AgreementArtifact" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "AgreementGenerationEvent_immutable" BEFORE UPDATE OR DELETE ON "AgreementGenerationEvent" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
