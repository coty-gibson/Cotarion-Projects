-- Sprint 3.2: additive persistence for the approved Sprint 3.1 Proposal state.
ALTER TABLE "Proposal"
  ADD COLUMN "qualityReviewRequestedByUserId" TEXT,
  ADD COLUMN "supersedesProposalId" TEXT,
  ADD COLUMN "aggregateRevision" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_aggregate_revision_nonnegative" CHECK ("aggregateRevision" >= 0);

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_qualityReviewRequestedByUserId_companyId_fkey"
  FOREIGN KEY ("qualityReviewRequestedByUserId", "companyId")
  REFERENCES "ApplicationUser"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_currentVersionId_id_fkey"
  FOREIGN KEY ("currentVersionId", "id")
  REFERENCES "ProposalVersion"("id", "proposalId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_submittedVersionId_id_fkey"
  FOREIGN KEY ("submittedVersionId", "id")
  REFERENCES "ProposalVersion"("id", "proposalId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_supersedesProposalId_companyId_fkey"
  FOREIGN KEY ("supersedesProposalId", "companyId")
  REFERENCES "Proposal"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_supersededByProposalId_companyId_fkey"
  FOREIGN KEY ("supersededByProposalId", "companyId")
  REFERENCES "Proposal"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Proposal_companyId_supersedesProposalId_idx"
  ON "Proposal"("companyId", "supersedesProposalId");

CREATE INDEX "Proposal_companyId_supersededByProposalId_idx"
  ON "Proposal"("companyId", "supersededByProposalId");
