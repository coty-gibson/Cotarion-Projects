CREATE TABLE "ProposalClientDecision" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "proposalId" TEXT NOT NULL,
  "proposalVersionId" TEXT NOT NULL, "proposalRepresentationId" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL, "outcome" TEXT NOT NULL, "decidedAt" TIMESTAMP(3) NOT NULL,
  "actorType" TEXT NOT NULL, "clientDisplayName" TEXT, "clientMessage" TEXT,
  "internalNotes" TEXT, "correlationId" TEXT NOT NULL, "requestIdentity" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProposalClientDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProposalClientDecision_outcome_check" CHECK ("outcome" IN ('ACCEPTED','DECLINED','WITHDRAWN','EXPIRED'))
);
CREATE UNIQUE INDEX "ProposalClientDecision_deliveryId_key" ON "ProposalClientDecision"("deliveryId");
CREATE UNIQUE INDEX "ProposalClientDecision_deliveryId_companyId_key" ON "ProposalClientDecision"("deliveryId","companyId");
CREATE UNIQUE INDEX "ProposalClientDecision_companyId_requestIdentity_key" ON "ProposalClientDecision"("companyId","requestIdentity");
CREATE UNIQUE INDEX "ProposalClientDecision_id_companyId_key" ON "ProposalClientDecision"("id","companyId");
CREATE INDEX "ProposalClientDecision_companyId_proposalId_decidedAt_idx" ON "ProposalClientDecision"("companyId","proposalId","decidedAt");
CREATE INDEX "ProposalClientDecision_companyId_proposalVersionId_idx" ON "ProposalClientDecision"("companyId","proposalVersionId");
ALTER TABLE "ProposalClientDecision" ADD CONSTRAINT "ProposalClientDecision_deliveryId_companyId_fkey" FOREIGN KEY ("deliveryId","companyId") REFERENCES "ProposalDelivery"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProposalDecisionTimeline" (
  "id" TEXT NOT NULL, "decisionId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL, "actorType" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL, "evidence" JSONB NOT NULL,
  CONSTRAINT "ProposalDecisionTimeline_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProposalDecisionTimeline_companyId_decisionId_occurredAt_idx" ON "ProposalDecisionTimeline"("companyId","decisionId","occurredAt");
ALTER TABLE "ProposalDecisionTimeline" ADD CONSTRAINT "ProposalDecisionTimeline_decisionId_companyId_fkey" FOREIGN KEY ("decisionId","companyId") REFERENCES "ProposalClientDecision"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "ProposalClientDecision_immutable" BEFORE UPDATE OR DELETE ON "ProposalClientDecision" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "ProposalDecisionTimeline_immutable" BEFORE UPDATE OR DELETE ON "ProposalDecisionTimeline" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
