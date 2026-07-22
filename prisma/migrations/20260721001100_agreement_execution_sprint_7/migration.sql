CREATE TABLE "AgreementExecution" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "agreementVersionId" TEXT NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL,
  "executedByUserId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "requestIdentity" TEXT NOT NULL,
  "artifactChecksum" TEXT NOT NULL,
  "determination" TEXT NOT NULL,
  "signerSummary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgreementExecution_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AgreementExecutionSignature" (
  "executionId" TEXT NOT NULL,
  "signatureEvidenceId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  CONSTRAINT "AgreementExecutionSignature_pkey" PRIMARY KEY ("executionId", "signatureEvidenceId")
);
CREATE TABLE "AgreementExecutionEvent" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  CONSTRAINT "AgreementExecutionEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgreementExecution_agreementVersionId_key" ON "AgreementExecution"("agreementVersionId");
CREATE UNIQUE INDEX "AgreementExecution_companyId_requestIdentity_key" ON "AgreementExecution"("companyId", "requestIdentity");
CREATE UNIQUE INDEX "AgreementExecution_agreementVersionId_companyId_key" ON "AgreementExecution"("agreementVersionId", "companyId");
CREATE UNIQUE INDEX "AgreementExecution_id_companyId_key" ON "AgreementExecution"("id", "companyId");
CREATE INDEX "AgreementExecution_companyId_agreementId_executedAt_idx" ON "AgreementExecution"("companyId", "agreementId", "executedAt");
CREATE INDEX "AgreementExecutionSignature_companyId_signatureEvidenceId_idx" ON "AgreementExecutionSignature"("companyId", "signatureEvidenceId");
CREATE INDEX "AgreementExecutionEvent_companyId_executionId_occurredAt_idx" ON "AgreementExecutionEvent"("companyId", "executionId", "occurredAt");
ALTER TABLE "AgreementExecution" ADD CONSTRAINT "AgreementExecution_agreementId_companyId_fkey" FOREIGN KEY ("agreementId", "companyId") REFERENCES "Agreement"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgreementExecution" ADD CONSTRAINT "AgreementExecution_agreementVersionId_companyId_fkey" FOREIGN KEY ("agreementVersionId", "companyId") REFERENCES "AgreementVersion"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgreementExecutionSignature" ADD CONSTRAINT "AgreementExecutionSignature_executionId_companyId_fkey" FOREIGN KEY ("executionId", "companyId") REFERENCES "AgreementExecution"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgreementExecutionSignature" ADD CONSTRAINT "AgreementExecutionSignature_signatureEvidenceId_fkey" FOREIGN KEY ("signatureEvidenceId") REFERENCES "AgreementSignatureEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgreementExecutionEvent" ADD CONSTRAINT "AgreementExecutionEvent_executionId_companyId_fkey" FOREIGN KEY ("executionId", "companyId") REFERENCES "AgreementExecution"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_agreement_execution_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Agreement execution evidence is immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "AgreementExecution_immutable" BEFORE UPDATE OR DELETE ON "AgreementExecution" FOR EACH ROW EXECUTE FUNCTION prevent_agreement_execution_mutation();
CREATE TRIGGER "AgreementExecutionSignature_immutable" BEFORE UPDATE OR DELETE ON "AgreementExecutionSignature" FOR EACH ROW EXECUTE FUNCTION prevent_agreement_execution_mutation();
CREATE TRIGGER "AgreementExecutionEvent_immutable" BEFORE UPDATE OR DELETE ON "AgreementExecutionEvent" FOR EACH ROW EXECUTE FUNCTION prevent_agreement_execution_mutation();
