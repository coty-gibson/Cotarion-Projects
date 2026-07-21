-- ADR-018 Sprint 2 metadata only. No renderer or delivery integration is introduced.
CREATE TABLE "ProposalRepresentation" (
  "id" TEXT NOT NULL, "proposalId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "proposalVersionId" TEXT NOT NULL, "representationType" TEXT NOT NULL,
  "rendererVersion" TEXT NOT NULL, "contentChecksum" TEXT NOT NULL, "storageReference" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProposalRepresentation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProposalRepresentation_id_companyId_key" ON "ProposalRepresentation"("id","companyId");
CREATE INDEX "ProposalRepresentation_proposalVersionId_idx" ON "ProposalRepresentation"("proposalVersionId");

CREATE TABLE "ProposalDeliveryAttempt" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "representationId" TEXT NOT NULL,
  "channel" TEXT NOT NULL, "recipientAddress" TEXT NOT NULL, "providerReference" TEXT,
  "status" TEXT NOT NULL, "attemptedAt" TIMESTAMP(3) NOT NULL, "errorCode" TEXT,
  CONSTRAINT "ProposalDeliveryAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProposalDeliveryAttempt_companyId_attemptedAt_idx" ON "ProposalDeliveryAttempt"("companyId","attemptedAt");

ALTER TABLE "ProposalRepresentation" ADD CONSTRAINT "ProposalRepresentation_proposalId_companyId_fkey"
  FOREIGN KEY ("proposalId","companyId") REFERENCES "Proposal"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProposalRepresentation" ADD CONSTRAINT "ProposalRepresentation_proposalVersionId_proposalId_fkey"
  FOREIGN KEY ("proposalVersionId","proposalId") REFERENCES "ProposalVersion"("id","proposalId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProposalDeliveryAttempt" ADD CONSTRAINT "ProposalDeliveryAttempt_representationId_companyId_fkey"
  FOREIGN KEY ("representationId","companyId") REFERENCES "ProposalRepresentation"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "ProposalRepresentation_immutable" BEFORE UPDATE OR DELETE ON "ProposalRepresentation" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "ProposalDeliveryAttempt_immutable" BEFORE UPDATE OR DELETE ON "ProposalDeliveryAttempt" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
