-- CreateEnum
CREATE TYPE "PricingModelType" AS ENUM (
    'PROJECT',
    'FIXED_RETAINER',
    'PROFIT_SHARE_RETAINER',
    'HYBRID_RETAINER',
    'ADVISORY_HOURLY'
);

-- Extend the shared Pricing Project aggregate with typed methodology snapshots.
ALTER TABLE "PricingProject"
    ADD COLUMN "pricingModel" "PricingModelType" NOT NULL DEFAULT 'PROJECT',
    ADD COLUMN "methodologyVersion" TEXT NOT NULL DEFAULT 'project-pricing/1.0.0',
    ADD COLUMN "pricingInputSnapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN "pricingOutputSnapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "PricingProject"
    ADD CONSTRAINT "PricingProject_methodology_not_blank_check"
        CHECK (BTRIM("methodologyVersion") <> ''),
    ADD CONSTRAINT "PricingProject_input_snapshot_object_check"
        CHECK (jsonb_typeof("pricingInputSnapshot") = 'object'),
    ADD CONSTRAINT "PricingProject_output_snapshot_object_check"
        CHECK (jsonb_typeof("pricingOutputSnapshot") = 'object');

CREATE INDEX "PricingProject_companyId_pricingModel_idx"
    ON "PricingProject"("companyId", "pricingModel");
