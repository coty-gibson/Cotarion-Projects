CREATE TABLE "ProposalDelivery" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "proposalId" TEXT NOT NULL,
  "proposalVersionId" TEXT NOT NULL, "proposalRepresentationId" TEXT NOT NULL,
  "representationType" TEXT NOT NULL, "deliveryChannel" TEXT NOT NULL,
  "status" TEXT NOT NULL, "requestIdentity" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL, "requestedByUserId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3), "failureCode" TEXT,
  "failureMessage" TEXT, "externalProviderReference" TEXT, "correlationId" TEXT NOT NULL,
  "deliveryAttemptNumber" INTEGER NOT NULL, "tokenDigest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProposalDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProposalDelivery_tokenDigest_key" ON "ProposalDelivery"("tokenDigest");
CREATE UNIQUE INDEX "ProposalDelivery_companyId_requestIdentity_key" ON "ProposalDelivery"("companyId","requestIdentity");
CREATE UNIQUE INDEX "ProposalDelivery_id_companyId_key" ON "ProposalDelivery"("id","companyId");
CREATE INDEX "ProposalDelivery_companyId_proposalId_requestedAt_idx" ON "ProposalDelivery"("companyId","proposalId","requestedAt");
CREATE INDEX "ProposalDelivery_companyId_status_expiresAt_idx" ON "ProposalDelivery"("companyId","status","expiresAt");
CREATE INDEX "ProposalDelivery_proposalRepresentationId_idx" ON "ProposalDelivery"("proposalRepresentationId");
ALTER TABLE "ProposalDelivery" ADD CONSTRAINT "ProposalDelivery_proposalRepresentationId_companyId_fkey" FOREIGN KEY ("proposalRepresentationId","companyId") REFERENCES "ProposalRepresentation"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProposalDeliveryRecipient" (
  "id" TEXT NOT NULL, "deliveryId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "recipientRole" TEXT,
  CONSTRAINT "ProposalDeliveryRecipient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProposalDeliveryRecipient_deliveryId_displayOrder_key" ON "ProposalDeliveryRecipient"("deliveryId","displayOrder");
CREATE INDEX "ProposalDeliveryRecipient_companyId_email_idx" ON "ProposalDeliveryRecipient"("companyId","email");
ALTER TABLE "ProposalDeliveryRecipient" ADD CONSTRAINT "ProposalDeliveryRecipient_deliveryId_companyId_fkey" FOREIGN KEY ("deliveryId","companyId") REFERENCES "ProposalDelivery"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProposalDeliveryEvent" (
  "id" TEXT NOT NULL, "deliveryId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL, "actorUserId" TEXT,
  "correlationId" TEXT NOT NULL, "metadata" JSONB NOT NULL,
  CONSTRAINT "ProposalDeliveryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProposalDeliveryEvent_companyId_deliveryId_occurredAt_idx" ON "ProposalDeliveryEvent"("companyId","deliveryId","occurredAt");
ALTER TABLE "ProposalDeliveryEvent" ADD CONSTRAINT "ProposalDeliveryEvent_deliveryId_companyId_fkey" FOREIGN KEY ("deliveryId","companyId") REFERENCES "ProposalDelivery"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProposalDeliveryAccess" (
  "id" TEXT NOT NULL, "deliveryId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "accessedAt" TIMESTAMP(3) NOT NULL, "accessType" TEXT NOT NULL, "correlationId" TEXT NOT NULL,
  CONSTRAINT "ProposalDeliveryAccess_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProposalDeliveryAccess_companyId_deliveryId_accessedAt_idx" ON "ProposalDeliveryAccess"("companyId","deliveryId","accessedAt");
ALTER TABLE "ProposalDeliveryAccess" ADD CONSTRAINT "ProposalDeliveryAccess_deliveryId_companyId_fkey" FOREIGN KEY ("deliveryId","companyId") REFERENCES "ProposalDelivery"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "ProposalDeliveryRecipient_immutable" BEFORE UPDATE OR DELETE ON "ProposalDeliveryRecipient" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "ProposalDeliveryEvent_immutable" BEFORE UPDATE OR DELETE ON "ProposalDeliveryEvent" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
CREATE TRIGGER "ProposalDeliveryAccess_immutable" BEFORE UPDATE OR DELETE ON "ProposalDeliveryAccess" FOR EACH ROW EXECUTE FUNCTION protect_immutable_row();
