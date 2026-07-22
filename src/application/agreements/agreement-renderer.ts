export type AgreementArtifactType = "HTML" | "PDF";
export interface AgreementDocumentSource { agreementNumber: string; agreementVersion: 1; companyName: string; clientName: string; proposalNumber: string; proposalVersionNumber: number; generatedAt: string; scope: readonly { heading: string; body: string }[]; pricingSummary: string; paymentTerms: string; term: string; }
export interface GeneratedAgreementArtifact { type: AgreementArtifactType; contentType: string; content: Uint8Array; checksum: string; rendererVersion: string; metadata: Record<string, unknown>; }
export interface AgreementRenderer { render(source: AgreementDocumentSource, type: AgreementArtifactType): GeneratedAgreementArtifact; }
