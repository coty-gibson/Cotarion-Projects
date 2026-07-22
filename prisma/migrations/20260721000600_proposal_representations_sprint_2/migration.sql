ALTER TABLE "ProposalRepresentation"
  ADD COLUMN "representationVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "representationStatus" TEXT NOT NULL DEFAULT 'GENERATED',
  ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  ADD COLUMN "generatedContent" BYTEA NOT NULL DEFAULT '\x',
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "generatedByUserId" TEXT NOT NULL DEFAULT 'legacy-system';

ALTER TABLE "ProposalRepresentation"
  ALTER COLUMN "representationVersion" DROP DEFAULT,
  ALTER COLUMN "representationStatus" DROP DEFAULT,
  ALTER COLUMN "contentType" DROP DEFAULT,
  ALTER COLUMN "generatedContent" DROP DEFAULT,
  ALTER COLUMN "metadata" DROP DEFAULT,
  ALTER COLUMN "generatedByUserId" DROP DEFAULT;

CREATE UNIQUE INDEX "ProposalRepresentation_proposalVersionId_representationType_representationVersion_key"
  ON "ProposalRepresentation"("proposalVersionId", "representationType", "representationVersion");
CREATE INDEX "ProposalRepresentation_companyId_proposalId_generatedAt_idx"
  ON "ProposalRepresentation"("companyId", "proposalId", "generatedAt");
