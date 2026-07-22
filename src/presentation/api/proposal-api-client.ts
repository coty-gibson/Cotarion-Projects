export interface ProposalSummaryDto {
  id: string;
  proposalNumber: string;
  companyId: string;
  clientId: string;
  ownerId: string;
  title: string;
  status: string;
  currentVersionNumber: number | null;
  submittedVersionNumber: number | null;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
  effectiveAt: string | null;
  closedAt: string | null;
}

export interface ProposalStructuredContentDto {
  schemaVersion: number;
  title: string;
  sections: {
    sectionId: string;
    sectionType: string;
    heading: string;
    body: string;
    displayOrder: number;
    clientVisible: boolean;
  }[];
}
export interface ProposalCommercialTermsDto {
  paymentSchedule: string;
  billingMethod: string;
  depositTerms: string;
  recurrenceAndTerm: string;
  cancellationSummary: string;
  assumptionsAndExclusions: string;
  clientResponsibilities: string;
  offerNotes: string;
}
export interface ProposalRecipientDto {
  recipientId: string;
  contactId: string | null;
  name: string;
  email: string;
  authorizedToAccept: boolean;
}
export interface ProposalPricingSnapshotDto {
  pricingProjectId: string;
  pricingProjectNumber: string;
  pricingModel: string;
  methodologyVersion: string;
  engineVersion: string;
  pricingConfigurationVersion: number;
  approvedAt: string;
  approvedByUserId: string;
  outputSnapshot: Record<string, unknown>;
}
export interface ProposalDraftDto {
  title: string;
  structuredContent: ProposalStructuredContentDto;
  commercialTerms: ProposalCommercialTermsDto;
  recipients: ProposalRecipientDto[];
  pricingSnapshot: ProposalPricingSnapshotDto;
  expirationAt: string;
  expirationOverrideReason: string | null;
}
export interface ProposalVersionDto {
  id: string;
  number: number;
  status: "SAVED" | "SUBMITTED";
  createdAt: string;
  createdByUserId: string;
  revisionReason: string | null;
  submittedAt: string | null;
  submittedByUserId: string | null;
}
export interface ProposalReviewDto {
  status: "NOT_REQUESTED" | "PENDING" | "CHANGES_REQUESTED" | "APPROVED";
  requestedAt: string | null;
  requestedByUserId: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  outcome: "CHANGES_REQUESTED" | "SUBMITTED" | null;
}
export interface ProposalExecutiveAuthorizationDto {
  status: "NOT_USED" | "AUTHORIZED_AND_SUBMITTED";
  submittedAt: string | null;
  submittedByUserId: string | null;
  authorizedAt: string | null;
  authorizedByUserId: string | null;
  businessJustification: string | null;
}
export interface ProposalAcceptanceDto {
  viewedAt: string | null;
  acceptances: {
    acceptanceId: string;
    proposalVersionId: string;
    occurredAt: string;
    channel: string;
    recipientId: string;
    recordedByUserId: string | null;
    reason: string | null;
    notes: string;
    current: boolean;
  }[];
  withdrawals: {
    withdrawalId: string;
    acceptanceId: string;
    occurredAt: string;
    recordedByUserId: string;
    reason: string;
  }[];
  declinedAt: string | null;
  executedAgreementId: string | null;
}
export interface ProposalTimelineItemDto {
  id: string;
  type: string;
  occurredAt: string;
  actorUserId: string | null;
  label: string;
  summary: string;
  versionId: string | null;
  relatedProposalId: string | null;
  agreementId: string | null;
}
export interface ProposalPermittedActionsDto {
  generateRepresentation: boolean;
  createDelivery: boolean;
  attachPricingVersion: boolean;
  updateDraft: boolean;
  saveVersion: boolean;
  requestQualityReview: boolean;
  requestChanges: boolean;
  submitForExecutiveAuthorization: boolean;
  approve: boolean;
  reject: boolean;
  submitThroughQualityReview: boolean;
  submitThroughExecutiveAuthorization: boolean;
  recordViewed: boolean;
  recordClientAcceptance: boolean;
  recordVerbalAcceptance: boolean;
  withdrawAcceptance: boolean;
  linkExecutedAgreement: boolean;
  decline: boolean;
  expire: boolean;
  createReplacement: boolean;
  supersede: boolean;
  archive: boolean;
}
export interface ProposalDetailDto extends ProposalSummaryDto {
  concurrencyToken: string;
  engagementTypeCode: string;
  currentVersionId: string | null;
  submittedVersionId: string | null;
  supersedesProposalId: string | null;
  supersededByProposalId: string | null;
  executedAgreementId: string | null;
  expirationAt: string;
  draft: ProposalDraftDto;
  versions: ProposalVersionDto[];
  review: ProposalReviewDto;
  executiveAuthorization: ProposalExecutiveAuthorizationDto;
  acceptance: ProposalAcceptanceDto;
  timeline: ProposalTimelineItemDto[];
  permittedActions: ProposalPermittedActionsDto;
}
export interface ProposalCommandResponse {
  proposal: ProposalDetailDto;
  idempotentReplay: boolean;
}
export interface ProposalRepresentationDto {
  id: string;
  proposalId: string;
  proposalVersionId: string;
  proposalVersionNumber: number;
  representationType: "HTML" | "PDF";
  representationVersion: number;
  rendererVersion: string;
  status: "GENERATED";
  contentChecksum: string;
  contentType: string;
  generatedAt: string;
  generatedByUserId: string;
  metadata: Record<string, unknown>;
}
export interface ProposalRepresentationCommandResponse {
  representation: ProposalRepresentationDto;
  idempotentReplay: boolean;
}
export interface ProposalDeliveryDto {
  id: string; proposalId: string; proposalVersionId: string; proposalRepresentationId: string;
  representationType: "HTML" | "PDF"; deliveryChannel: "SECURE_LINK";
  recipients: { name: string; email: string; recipientRole: string | null }[];
  status: "REQUESTED" | "AVAILABLE" | "FAILED" | "REVOKED" | "EXPIRED";
  requestedAt: string; requestedByUserId: string; sentAt: string | null; failedAt: string | null;
  failureCode: string | null; failureMessage: string | null; externalProviderReference: string | null;
  correlationId: string; deliveryAttemptNumber: number; expiresAt: string; revokedAt: string | null;
  createdAt: string; updatedAt: string;
  events: { id: string; eventType: string; occurredAt: string; actorUserId: string | null; correlationId: string }[];
  accesses: { id: string; accessedAt: string; accessType: string; correlationId: string }[];
  permittedActions: { revoke: boolean };
}
export interface ProposalClientDecisionDto {
  id: string; proposalId: string; proposalVersionId: string; proposalRepresentationId: string; deliveryId: string;
  representationType: "HTML" | "PDF"; outcome: "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED";
  decidedAt: string; actorType: "SECURE_LINK_CLIENT"; clientDisplayName: string | null; clientMessage: string | null;
  internalNotes: string | null; correlationId: string; requestIdentity: string; createdAt: string;
  timeline: { id: string; eventType: string; occurredAt: string; actorType: string; correlationId: string }[];
}
export interface AgreementDto { id: string; agreementNumber: string; agreementVersion: number; status: "READY_FOR_SIGNATURE"; generatedAt: string; generatedByUserId: string; proposalNumber: string; proposalVersionNumber: number; clientName: string; artifacts: { type: "HTML" | "PDF"; contentType: string; checksum: string; rendererVersion: string }[]; events: { eventType: string; occurredAt: string }[]; }
export interface SignatureRequestDto { id:string;agreementId:string;agreementVersion:number;agreementNumber:string;signer:{displayName:string;email:string;role:"CLIENT"|"COTARION_REPRESENTATIVE";order:number};signingMode:"PARALLEL"|"ORDERED";status:"REQUESTED"|"AVAILABLE"|"SIGNED"|"DECLINED"|"REVOKED"|"EXPIRED"|"FAILED";requestedAt:string;expiresAt:string;revokedAt:string|null;signedAt:string|null;declinedAt:string|null;artifactChecksum:string;permittedActions:{revoke:boolean};secureUrl?:string; }
export interface AgreementExecutionDto { id:string;agreementId:string;agreementVersion:number;executed:true;executedAt:string;executedBy:string;artifactChecksum:string;determination:"ALL_REQUIRED_SIGNERS_SIGNED";signerSummary:{role:string;displayName:string;signedAt:string;signatureEvidenceReference:string}[];history:{eventType:string;occurredAt:string;actorUserId:string}[]; }
export type ProposalDraftUpdate = Partial<
  Pick<
    ProposalDraftDto,
    "title" | "commercialTerms" | "recipients" | "expirationAt" | "expirationOverrideReason"
  >
> & { content?: ProposalStructuredContentDto };

export class WorkspaceApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly correlationId?: string
  ) {
    super(message);
    this.name = "WorkspaceApiError";
  }
}
interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
  correlationId?: string;
}

export class ProposalApiClient {
  private readonly concurrencyTokens = new Map<string, string>();
  constructor(
    private readonly companyId: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly baseUrl = "/api/proposals"
  ) {}

  list(
    input: {
      limit?: number;
      cursor?: string;
      status?: string;
      clientId?: string;
      ownerId?: string;
    } = {}
  ) {
    const query = new URLSearchParams();
    if (input.limit) query.set("limit", String(input.limit));
    if (input.cursor) query.set("cursor", input.cursor);
    if (input.status) query.set("status", input.status);
    if (input.clientId) query.set("clientId", input.clientId);
    if (input.ownerId) query.set("ownerId", input.ownerId);
    return this.request<{ items: ProposalSummaryDto[]; nextCursor: string | null }>(
      `${this.baseUrl}?${query}`
    );
  }
  async create(input: {
    clientId: string;
    ownerId?: string;
    engagementTypeCode: "STRATEGY_SESSION" | "ADVISORY" | "DIAGNOSTIC" | "PROJECT" | "RETAINER";
    pricingProjectId: string;
    pricingVersionId: string;
    title: string;
    expirationAt?: string;
    expirationOverrideReason?: string;
  }) {
    const result = await this.request<ProposalCommandResponse>(this.baseUrl, {
      method: "POST",
      body: JSON.stringify(input),
      idempotencyKey: crypto.randomUUID()
    });
    this.concurrencyTokens.set(result.proposal.id, result.proposal.concurrencyToken);
    return result;
  }
  generateRepresentation(
    proposalId: string,
    proposalVersionId: string,
    representationType: "HTML" | "PDF"
  ) {
    return this.request<ProposalRepresentationCommandResponse>(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}/versions/${encodeURIComponent(proposalVersionId)}/representations`,
      {
        method: "POST",
        body: JSON.stringify({ representationType }),
        idempotencyKey: crypto.randomUUID()
      }
    );
  }
  listRepresentations(proposalId: string, proposalVersionId?: string) {
    const query = proposalVersionId
      ? `?proposalVersionId=${encodeURIComponent(proposalVersionId)}`
      : "";
    return this.request<ProposalRepresentationDto[]>(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}/representations${query}`
    );
  }
  representationHistory(proposalId: string) {
    return this.request<ProposalRepresentationDto[]>(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}/representations/history`
    );
  }
  currentRepresentation(proposalId: string, type: "HTML" | "PDF") {
    return this.request<ProposalRepresentationDto | null>(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}/representations/current?type=${type}`
    );
  }
  representationDetail(proposalId: string, representationId: string) {
    return this.request<ProposalRepresentationDto>(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}/representations/${encodeURIComponent(representationId)}`
    );
  }
  async representationContent(proposalId: string, representationId: string) {
    const response = await this.fetcher(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}/representations/${encodeURIComponent(representationId)}/download`,
      {
        credentials: "same-origin",
        headers: { "x-company-id": this.companyId, "x-correlation-id": crypto.randomUUID() }
      }
    );
    if (!response.ok)
      throw new WorkspaceApiError(
        "REQUEST_FAILED",
        "The Proposal Representation could not be downloaded.",
        response.status
      );
    return response.blob();
  }
  createDelivery(proposalId: string, representationId: string, input: { recipients: { name: string; email: string; recipientRole?: string | null }[]; expiresAt: string }) {
    return this.request<{ delivery: ProposalDeliveryDto; secureUrl: string; idempotentReplay: boolean }>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/representations/${encodeURIComponent(representationId)}/deliveries`, { method: "POST", body: JSON.stringify(input), idempotencyKey: crypto.randomUUID() });
  }
  listDeliveries(proposalId: string) { return this.request<ProposalDeliveryDto[]>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/deliveries`); }
  deliveryHistory(proposalId: string) { return this.request<ProposalDeliveryDto[]>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/deliveries/history`); }
  activeDeliveries(proposalId: string) { return this.request<ProposalDeliveryDto[]>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/deliveries/active`); }
  deliveryDetail(proposalId: string, deliveryId: string) { return this.request<ProposalDeliveryDto>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/deliveries/${encodeURIComponent(deliveryId)}`); }
  deliveryAccessHistory(proposalId: string, deliveryId: string) { return this.request<ProposalDeliveryDto["accesses"]>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/deliveries/${encodeURIComponent(deliveryId)}/accesses`); }
  revokeDelivery(proposalId: string, deliveryId: string) { return this.request<ProposalDeliveryDto>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/deliveries/${encodeURIComponent(deliveryId)}/revoke`, { method: "POST", body: "{}", idempotencyKey: crypto.randomUUID() }); }
  decisionHistory(proposalId: string) { return this.request<ProposalClientDecisionDto[]>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/decisions`); }
  currentDecision(proposalId: string) { return this.request<ProposalClientDecisionDto | null>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/decisions/current`); }
  decisionTimeline(proposalId: string) { return this.request<ProposalClientDecisionDto["timeline"]>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/decisions/timeline`); }
  agreements(proposalId: string) { return this.request<{ items: AgreementDto[]; permittedActions: { generate: boolean } }>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/agreements`); }
  generateAgreement(proposalId: string) { return this.request<{ agreement: AgreementDto; idempotentReplay: boolean }>(`${this.baseUrl}/${encodeURIComponent(proposalId)}/agreements`, { method: "POST", body: "{}", idempotencyKey: crypto.randomUUID() }); }
  async agreementArtifact(proposalId: string, agreementId: string, type: "HTML" | "PDF") { const response = await this.fetcher(`${this.baseUrl}/${encodeURIComponent(proposalId)}/agreements/${encodeURIComponent(agreementId)}?artifact=${type}`, { credentials: "same-origin", headers: { "x-company-id": this.companyId, "x-correlation-id": crypto.randomUUID() } }); if (!response.ok) throw new WorkspaceApiError("REQUEST_FAILED", "Agreement artifact could not be opened.", response.status); return response.blob(); }
  signatureRequests(agreementId:string){return this.request<{items:SignatureRequestDto[];permittedActions:{create:boolean}}>(`/api/agreements/${encodeURIComponent(agreementId)}/signature-requests`);}
  createSignatureRequests(agreementId:string,input:{signers:{displayName:string;email:string;role:"CLIENT"|"COTARION_REPRESENTATIVE";order:number}[];signingMode:"PARALLEL"|"ORDERED";expiresAt:string}){return this.request<{items:SignatureRequestDto[];replay:boolean}>(`/api/agreements/${encodeURIComponent(agreementId)}/signature-requests`,{method:"POST",body:JSON.stringify(input),idempotencyKey:crypto.randomUUID()});}
  revokeSignatureRequest(agreementId:string,id:string){return this.request<SignatureRequestDto>(`/api/agreements/${encodeURIComponent(agreementId)}/signature-requests/${encodeURIComponent(id)}/revoke`,{method:"POST",body:"{}",idempotencyKey:crypto.randomUUID()});}
  execution(agreementId:string){return this.request<{execution:AgreementExecutionDto|null;permittedActions:{execute:boolean};determination:string}>(`/api/agreements/${encodeURIComponent(agreementId)}/execution`);}
  executions(agreementId:string){return this.request<AgreementExecutionDto[]>(`/api/agreements/${encodeURIComponent(agreementId)}/executions`);}
  executeAgreement(agreementId:string){return this.request<{execution:AgreementExecutionDto;replay:boolean}>(`/api/agreements/${encodeURIComponent(agreementId)}/execute`,{method:"POST",body:"{}",idempotencyKey:crypto.randomUUID()});}
  async load(proposalId: string) {
    const proposal = await this.request<ProposalDetailDto>(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}`
    );
    this.concurrencyTokens.set(proposalId, proposal.concurrencyToken);
    return proposal;
  }
  edit(proposalId: string) {
    return this.request<
      Pick<
        ProposalDetailDto,
        "id" | "proposalNumber" | "draft" | "permittedActions" | "concurrencyToken"
      >
    >(`${this.baseUrl}/${encodeURIComponent(proposalId)}/edit`);
  }
  workflow(proposalId: string) {
    return this.request<
      Pick<
        ProposalDetailDto,
        | "id"
        | "status"
        | "review"
        | "executiveAuthorization"
        | "permittedActions"
        | "concurrencyToken"
      >
    >(`${this.baseUrl}/${encodeURIComponent(proposalId)}/workflow`);
  }
  history(proposalId: string) {
    return this.request<Pick<ProposalDetailDto, "id" | "versions" | "timeline">>(
      `${this.baseUrl}/${encodeURIComponent(proposalId)}/history`
    );
  }
  attachPricingVersion(id: string, pricingProjectId: string, pricingVersionId: string) {
    return this.command(id, "pricing-version", { pricingProjectId, pricingVersionId });
  }
  submitForExecutiveAuthorization(id: string) {
    return this.command(id, "executive-authorization");
  }
  approve(id: string) {
    return this.command(id, "approve");
  }
  reject(id: string) {
    return this.command(id, "reject");
  }
  updateDraft(id: string, body: ProposalDraftUpdate) {
    return this.command(id, "draft", body, "PATCH");
  }
  saveVersion(id: string, revisionReason?: string) {
    return this.command(id, "versions", { revisionReason });
  }
  requestQualityReview(id: string) {
    return this.command(id, "quality-review");
  }
  requestChanges(id: string) {
    return this.command(id, "request-changes");
  }
  submitThroughQualityReview(id: string) {
    return this.command(id, "submit/quality-review");
  }
  submitThroughExecutiveAuthorization(id: string, businessJustification: string) {
    return this.command(id, "submit/executive-authorization", { businessJustification });
  }
  recordViewed(id: string) {
    return this.command(id, "viewed");
  }
  recordClientAcceptance(id: string, input: { recipientId: string; notes?: string }) {
    return this.command(id, "acceptances/client", input);
  }
  recordVerbalAcceptance(
    id: string,
    input: { recipientId: string; reason: string; notes: string }
  ) {
    return this.command(id, "acceptances/verbal", input);
  }
  withdrawAcceptance(id: string, reason: string) {
    return this.command(id, "acceptances/withdraw", { reason });
  }
  linkExecutedAgreement(id: string, agreementId: string) {
    return this.command(id, "agreement", { agreementId });
  }
  decline(id: string) {
    return this.command(id, "decline");
  }
  expire(id: string) {
    return this.command(id, "expire");
  }
  createReplacement(
    id: string,
    input: {
      ownerId?: string;
      title?: string;
      expirationAt?: string;
      expirationOverrideReason?: string;
    }
  ) {
    return this.command(id, "replacements", input);
  }
  supersede(id: string, replacementProposalId: string) {
    return this.command(id, "supersede", { replacementProposalId });
  }
  archive(id: string) {
    return this.command(id, "archive");
  }

  private async command(id: string, path: string, body: unknown = {}, method = "POST") {
    const concurrencyToken = this.concurrencyTokens.get(id);
    if (!concurrencyToken)
      throw new WorkspaceApiError(
        "CONCURRENCY_TOKEN_REQUIRED",
        "Reload the Proposal before submitting a command.",
        409
      );
    const result = await this.request<ProposalCommandResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}/${path}`,
      {
        method,
        body: JSON.stringify({ ...(body as Record<string, unknown>), concurrencyToken }),
        idempotencyKey: crypto.randomUUID()
      }
    );
    this.concurrencyTokens.set(id, result.proposal.concurrencyToken);
    return result;
  }

  private async request<T>(
    url: string,
    options: { method?: string; body?: string; idempotencyKey?: string } = {}
  ): Promise<T> {
    const correlationId = crypto.randomUUID();
    let response: Response | undefined;
    let networkError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const headers: Record<string, string> = {
          "x-company-id": this.companyId,
          "x-correlation-id": correlationId
        };
        if (options.body !== undefined) headers["content-type"] = "application/json";
        if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
        response = await this.fetcher(url, {
          credentials: "same-origin",
          method: options.method ?? "GET",
          headers,
          body: options.body
        });
        if (response.status < 500 || attempt === 1) break;
      } catch (error) {
        networkError = error;
        if (attempt === 1) break;
      }
    }
    if (!response)
      throw new WorkspaceApiError(
        "NETWORK_ERROR",
        "The workspace could not reach Cotarion services.",
        0,
        correlationId
      );
    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new WorkspaceApiError(
        "INVALID_RESPONSE",
        "Cotarion returned an unreadable response.",
        response.status,
        response.headers.get("x-correlation-id") ?? correlationId
      );
    }
    if (!response.ok || !("data" in envelope) || envelope.data === undefined)
      throw new WorkspaceApiError(
        envelope.error?.code ?? "REQUEST_FAILED",
        envelope.error?.message ??
          (networkError
            ? "The request could not be completed."
            : "Cotarion could not complete the request."),
        response.status,
        envelope.correlationId ?? correlationId
      );
    return envelope.data;
  }
}
