-- CreateEnum
CREATE TYPE "PricingProjectStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'QUOTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PricingCurrency" AS ENUM ('USD');

-- CreateEnum
CREATE TYPE "ServiceCatalogItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PricingConfigurationVersionStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- Add the composite candidate keys used to enforce same-Company relationships.
CREATE UNIQUE INDEX "ApplicationUser_id_companyId_key" ON "ApplicationUser"("id", "companyId");
CREATE UNIQUE INDEX "Client_id_companyId_key" ON "Client"("id", "companyId");

-- CreateTable
CREATE TABLE "PricingProjectSequence" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "lastValue" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "PricingProjectSequence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricingProjectSequence_global_check" CHECK ("id" = 'global'),
    CONSTRAINT "PricingProjectSequence_nonnegative_check" CHECK ("lastValue" >= 0)
);

-- CreateTable
CREATE TABLE "ServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePriceMinor" BIGINT NOT NULL,
    "currency" "PricingCurrency" NOT NULL DEFAULT 'USD',
    "status" "ServiceCatalogItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceCatalogItem_price_nonnegative_check" CHECK ("basePriceMinor" >= 0),
    CONSTRAINT "ServiceCatalogItem_name_not_blank_check" CHECK (BTRIM("name") <> '')
);

-- CreateTable
CREATE TABLE "PricingConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingConfigurationVersion" (
    "id" TEXT NOT NULL,
    "pricingConfigurationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PricingConfigurationVersionStatus" NOT NULL DEFAULT 'ACTIVE',
    "schemaVersion" INTEGER NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "currency" "PricingCurrency" NOT NULL DEFAULT 'USD',
    "configuration" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingConfigurationVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricingConfigurationVersion_version_positive_check" CHECK ("version" > 0),
    CONSTRAINT "PricingConfigurationVersion_schema_positive_check" CHECK ("schemaVersion" > 0)
);

-- CreateTable
CREATE TABLE "PricingProject" (
    "id" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourcePricingProjectId" TEXT,
    "pricingConfigurationVersionId" TEXT NOT NULL,
    "projectName" VARCHAR(200) NOT NULL,
    "status" "PricingProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" "PricingCurrency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProject_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricingProject_estimate_format_check" CHECK ("estimateNumber" ~ '^EST-[0-9]{6,}$'),
    CONSTRAINT "PricingProject_name_not_blank_check" CHECK (BTRIM("projectName") <> ''),
    CONSTRAINT "PricingProject_source_not_self_check" CHECK ("sourcePricingProjectId" IS NULL OR "sourcePricingProjectId" <> "id")
);

-- CreateTable
CREATE TABLE "PricingProjectLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pricingProjectId" TEXT NOT NULL,
    "serviceCatalogItemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProjectLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricingProjectLine_quantity_positive_check" CHECK ("quantity" > 0)
);

-- CreateTable
CREATE TABLE "PricingComplexitySelection" (
    "id" TEXT NOT NULL,
    "pricingProjectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factorCode" TEXT NOT NULL,
    "optionCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "PricingComplexitySelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingDiscountSelection" (
    "id" TEXT NOT NULL,
    "pricingProjectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "discountCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PricingDiscountSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogItem_companyId_code_key" ON "ServiceCatalogItem"("companyId", "code");
CREATE UNIQUE INDEX "ServiceCatalogItem_id_companyId_key" ON "ServiceCatalogItem"("id", "companyId");
CREATE INDEX "ServiceCatalogItem_companyId_status_sortOrder_idx" ON "ServiceCatalogItem"("companyId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfiguration_companyId_key" ON "PricingConfiguration"("companyId");
CREATE UNIQUE INDEX "PricingConfiguration_id_companyId_key" ON "PricingConfiguration"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfigurationVersion_pricingConfigurationId_version_key" ON "PricingConfigurationVersion"("pricingConfigurationId", "version");
CREATE UNIQUE INDEX "PricingConfigurationVersion_id_companyId_key" ON "PricingConfigurationVersion"("id", "companyId");
CREATE INDEX "PricingConfigurationVersion_companyId_status_idx" ON "PricingConfigurationVersion"("companyId", "status");
CREATE UNIQUE INDEX "PricingConfigurationVersion_one_active_per_company_key"
    ON "PricingConfigurationVersion"("companyId")
    WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "PricingProject_estimateNumber_key" ON "PricingProject"("estimateNumber");
CREATE UNIQUE INDEX "PricingProject_id_companyId_key" ON "PricingProject"("id", "companyId");
CREATE INDEX "PricingProject_companyId_status_idx" ON "PricingProject"("companyId", "status");
CREATE INDEX "PricingProject_companyId_clientId_idx" ON "PricingProject"("companyId", "clientId");
CREATE INDEX "PricingProject_companyId_updatedAt_idx" ON "PricingProject"("companyId", "updatedAt");
CREATE INDEX "PricingProject_ownerId_idx" ON "PricingProject"("ownerId");
CREATE INDEX "PricingProject_sourcePricingProjectId_idx" ON "PricingProject"("sourcePricingProjectId");

-- CreateIndex
CREATE INDEX "PricingProjectLine_pricingProjectId_sortOrder_idx" ON "PricingProjectLine"("pricingProjectId", "sortOrder");
CREATE INDEX "PricingProjectLine_serviceCatalogItemId_idx" ON "PricingProjectLine"("serviceCatalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingComplexitySelection_pricingProjectId_factorCode_key" ON "PricingComplexitySelection"("pricingProjectId", "factorCode");
CREATE INDEX "PricingComplexitySelection_pricingProjectId_sortOrder_idx" ON "PricingComplexitySelection"("pricingProjectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PricingDiscountSelection_pricingProjectId_companyId_key" ON "PricingDiscountSelection"("pricingProjectId", "companyId");

-- AddForeignKey
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingConfiguration" ADD CONSTRAINT "PricingConfiguration_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingConfigurationVersion" ADD CONSTRAINT "PricingConfigurationVersion_pricingConfigurationId_companyId_fkey"
    FOREIGN KEY ("pricingConfigurationId", "companyId") REFERENCES "PricingConfiguration"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingConfigurationVersion" ADD CONSTRAINT "PricingConfigurationVersion_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingProject" ADD CONSTRAINT "PricingProject_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingProject" ADD CONSTRAINT "PricingProject_clientId_companyId_fkey"
    FOREIGN KEY ("clientId", "companyId") REFERENCES "Client"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingProject" ADD CONSTRAINT "PricingProject_ownerId_companyId_fkey"
    FOREIGN KEY ("ownerId", "companyId") REFERENCES "ApplicationUser"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingProject" ADD CONSTRAINT "PricingProject_pricingConfigurationVersionId_companyId_fkey"
    FOREIGN KEY ("pricingConfigurationVersionId", "companyId") REFERENCES "PricingConfigurationVersion"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingProject" ADD CONSTRAINT "PricingProject_sourcePricingProjectId_companyId_fkey"
    FOREIGN KEY ("sourcePricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingProjectLine" ADD CONSTRAINT "PricingProjectLine_pricingProjectId_companyId_fkey"
    FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PricingProjectLine" ADD CONSTRAINT "PricingProjectLine_serviceCatalogItemId_companyId_fkey"
    FOREIGN KEY ("serviceCatalogItemId", "companyId") REFERENCES "ServiceCatalogItem"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PricingComplexitySelection" ADD CONSTRAINT "PricingComplexitySelection_pricingProjectId_companyId_fkey"
    FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PricingDiscountSelection" ADD CONSTRAINT "PricingDiscountSelection_pricingProjectId_companyId_fkey"
    FOREIGN KEY ("pricingProjectId", "companyId") REFERENCES "PricingProject"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Estimate numbers and configuration-version contents are immutable at the database boundary.
CREATE OR REPLACE FUNCTION prevent_pricing_project_estimate_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."estimateNumber" IS DISTINCT FROM OLD."estimateNumber" THEN
        RAISE EXCEPTION 'Pricing Project estimate numbers are immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PricingProject_estimate_immutable"
BEFORE UPDATE ON "PricingProject"
FOR EACH ROW EXECUTE FUNCTION prevent_pricing_project_estimate_change();

CREATE OR REPLACE FUNCTION protect_pricing_configuration_version()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Pricing Configuration versions cannot be deleted';
    END IF;

    IF NEW."pricingConfigurationId" IS DISTINCT FROM OLD."pricingConfigurationId"
       OR NEW."companyId" IS DISTINCT FROM OLD."companyId"
       OR NEW."version" IS DISTINCT FROM OLD."version"
       OR NEW."schemaVersion" IS DISTINCT FROM OLD."schemaVersion"
       OR NEW."engineVersion" IS DISTINCT FROM OLD."engineVersion"
       OR NEW."currency" IS DISTINCT FROM OLD."currency"
       OR NEW."configuration" IS DISTINCT FROM OLD."configuration"
       OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom"
       OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
        RAISE EXCEPTION 'Pricing Configuration version contents are immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PricingConfigurationVersion_immutable"
BEFORE UPDATE OR DELETE ON "PricingConfigurationVersion"
FOR EACH ROW EXECUTE FUNCTION protect_pricing_configuration_version();
