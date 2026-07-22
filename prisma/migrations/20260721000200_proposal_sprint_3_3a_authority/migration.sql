CREATE TYPE "RoleAdministrationAction" AS ENUM (
  'FOUNDER_BOOTSTRAPPED',
  'FOUNDER_TRANSFERRED',
  'FOUNDER_RECOVERED',
  'ADMIN_ASSIGNED',
  'ADMIN_REVOKED',
  'ADMIN_RELINQUISHED'
);

CREATE TABLE "CompanyFounderSeat" (
  "companyId" TEXT NOT NULL,
  "occupantUserId" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyFounderSeat_pkey" PRIMARY KEY ("companyId"),
  CONSTRAINT "CompanyFounderSeat_occupantUserId_companyId_key" UNIQUE ("occupantUserId", "companyId")
);

CREATE TABLE "CompanyAdminAssignment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyAdminAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoleAdministrationAudit" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "actorIdentity" TEXT NOT NULL,
  "actorUserId" TEXT,
  "affectedUserId" TEXT NOT NULL,
  "action" "RoleAdministrationAction" NOT NULL,
  "businessJustification" TEXT NOT NULL,
  "previousAuthority" TEXT NOT NULL,
  "resultingAuthority" TEXT NOT NULL,
  "administrationMethod" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleAdministrationAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoleAdministrationAudit_business_justification_nonblank" CHECK (length(btrim("businessJustification")) > 0),
  CONSTRAINT "RoleAdministrationAudit_actor_identity_nonblank" CHECK (length(btrim("actorIdentity")) > 0)
);

CREATE INDEX "CompanyAdminAssignment_companyId_userId_effectiveTo_idx"
  ON "CompanyAdminAssignment"("companyId", "userId", "effectiveTo");
CREATE UNIQUE INDEX "CompanyAdminAssignment_one_active_per_user"
  ON "CompanyAdminAssignment"("companyId", "userId") WHERE "effectiveTo" IS NULL;
CREATE INDEX "RoleAdministrationAudit_companyId_occurredAt_id_idx"
  ON "RoleAdministrationAudit"("companyId", "occurredAt", "id");
CREATE INDEX "RoleAdministrationAudit_companyId_affectedUserId_occurredAt_idx"
  ON "RoleAdministrationAudit"("companyId", "affectedUserId", "occurredAt");

ALTER TABLE "CompanyFounderSeat" ADD CONSTRAINT "CompanyFounderSeat_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyFounderSeat" ADD CONSTRAINT "CompanyFounderSeat_occupantUserId_companyId_fkey"
  FOREIGN KEY ("occupantUserId", "companyId") REFERENCES "ApplicationUser"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyAdminAssignment" ADD CONSTRAINT "CompanyAdminAssignment_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyAdminAssignment" ADD CONSTRAINT "CompanyAdminAssignment_userId_companyId_fkey"
  FOREIGN KEY ("userId", "companyId") REFERENCES "ApplicationUser"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoleAdministrationAudit" ADD CONSTRAINT "RoleAdministrationAudit_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoleAdministrationAudit" ADD CONSTRAINT "RoleAdministrationAudit_affectedUserId_companyId_fkey"
  FOREIGN KEY ("affectedUserId", "companyId") REFERENCES "ApplicationUser"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_role_administration_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Role administration audit records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RoleAdministrationAudit_immutable_update_delete"
BEFORE UPDATE OR DELETE ON "RoleAdministrationAudit"
FOR EACH ROW EXECUTE FUNCTION reject_role_administration_audit_mutation();
