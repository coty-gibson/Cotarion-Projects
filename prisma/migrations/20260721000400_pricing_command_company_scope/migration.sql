ALTER TABLE "PricingProcessedCommand" DROP CONSTRAINT "PricingProcessedCommand_pkey";
ALTER TABLE "PricingProcessedCommand" ADD CONSTRAINT "PricingProcessedCommand_pkey" PRIMARY KEY ("companyId", "commandId");
