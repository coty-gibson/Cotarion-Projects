export interface AgreementExecutionReadModel {
  id: string;
  agreementId: string;
  agreementVersion: number;
  executed: true;
  executedAt: string;
  executedBy: string;
  artifactChecksum: string;
  determination: "ALL_REQUIRED_SIGNERS_SIGNED";
  signerSummary: readonly { role: string; displayName: string; signedAt: string; signatureEvidenceReference: string }[];
  history: readonly { eventType: string; occurredAt: string; actorUserId: string }[];
}

export interface AgreementExecutionRepository {
  execute(input: { id: string; companyId: string; agreementId: string; executedAt: string; executedByUserId: string; correlationId: string; requestIdentity: string }): Promise<{ execution: AgreementExecutionReadModel; replay: boolean }>;
  detail(companyId: string, agreementId: string): Promise<AgreementExecutionReadModel | null>;
  list(companyId: string, agreementId: string): Promise<readonly AgreementExecutionReadModel[]>;
  eligibility(companyId: string, agreementId: string): Promise<{ eligible: boolean; reason: string }>;
}
