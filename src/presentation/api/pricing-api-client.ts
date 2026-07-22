export type PricingModel = "PROJECT" | "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | "HYBRID_RETAINER" | "ADVISORY_HOURLY";
export type PricingStatus = "DRAFT" | "IN_REVIEW" | "QUOTED" | "ARCHIVED";
export type PricingPermittedAction = "EDIT_DRAFT" | "SAVE_VERSION" | "REQUEST_QUALITY_REVIEW" | "APPROVE" | "REJECT" | "BEGIN_REVISION" | "ARCHIVE";
export type JsonObject = Record<string, unknown>;

export interface PricingDraftDto {
  projectName: string; pricingModel: PricingModel; currency: "USD";
  pricingConfigurationVersionId: string; pricingConfigurationVersion: number;
  configurationSchemaVersion: number; engineVersion: string; methodologyVersion: string;
  inputSnapshot: JsonObject; outputSnapshot: JsonObject; explanationSnapshot: JsonObject; catalogSnapshot: JsonObject;
}
export interface PricingPartyDto { id: string; name: string }
export interface PricingSummaryDto {
  id: string; estimateNumber: string;
  client: PricingPartyDto & { clientNumber: string };
  owner: PricingPartyDto & { email: string };
  projectName: string; status: PricingStatus; pricingModel: PricingModel;
  currentVersion: { id: string; number: number } | null; lastUpdated: string;
}
export interface PricingListDto { items: PricingSummaryDto[]; page: number; pageSize: number; total: number; totalPages: number }
export interface PricingVersionDto { id: string; number: number; createdAt: string; createdBy: PricingPartyDto; approvalStatus: "SAVED" | "IN_REVIEW" | "APPROVED" | "REJECTED"; reviewer: PricingPartyDto | null; reviewedAt: string | null; revisionOriginVersionId: string | null }
export interface PricingReviewDto { type: "REQUESTED" | "APPROVED" | "REJECTED"; pricingVersionId: string; versionNumber: number; actor: PricingPartyDto; findings: string | null; occurredAt: string }
export interface PricingDetailDto {
  summary: PricingSummaryDto;
  draft: Omit<PricingDraftDto, "inputSnapshot" | "outputSnapshot" | "explanationSnapshot" | "catalogSnapshot"> & { lastUpdated: string };
  approvedVersion: { id: string; number: number; approvedBy: PricingPartyDto; approvedAt: string } | null;
  reviewCandidate: { id: string; number: number; requestedBy: PricingPartyDto; requestedAt: string } | null;
  versionCount: number; versions: PricingVersionDto[]; reviews: PricingReviewDto[]; permittedActions: PricingPermittedAction[];
}
export interface PricingEditableDto { pricingProjectId: string; estimateNumber: string; client: PricingPartyDto & { clientNumber: string }; owner: PricingPartyDto & { email: string }; draft: PricingDraftDto; concurrencyToken: string; permittedActions: PricingPermittedAction[] }
export interface PricingCommandDto {
  pricingProject: { id: string; estimateNumber: string; companyId: string; clientId: string; ownerId: string; projectName: string; pricingModel: PricingModel; currency: "USD"; status: PricingStatus; draftCurrency: number; versionCount: number; latestVersionNumber: number | null; reviewCandidate: unknown | null; approvedVersion: unknown | null };
  concurrencyToken: string; idempotentReplay: boolean;
}
export interface PricingListQuery { page?: number; pageSize?: number; search?: string; status?: PricingStatus; pricingModel?: PricingModel; sortBy?: "lastUpdated" | "estimateNumber" | "projectName" | "status" | "pricingModel"; sortDirection?: "asc" | "desc" }
interface Envelope<T> { data?: T; error?: { code: string; message: string }; correlationId?: string }

export class PricingApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly correlationId: string) { super(message); this.name = "PricingApiError"; }
  get isConcurrencyConflict() { return this.status === 409 && this.code === "OPTIMISTIC_CONCURRENCY_CONFLICT"; }
}

export class PricingApiClient {
  constructor(private readonly companyId: string, private readonly fetcher: typeof fetch = fetch, private readonly baseUrl = "/api/pricing-projects") {}
  list(input: PricingListQuery = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) if (value !== undefined && value !== "") query.set(key, String(value));
    return this.request<PricingListDto>(`${this.baseUrl}${query.size ? `?${query}` : ""}`);
  }
  detail(id: string) { return this.request<PricingDetailDto>(this.resource(id)); }
  edit(id: string) { return this.request<PricingEditableDto>(`${this.resource(id)}/edit`); }
  versions(id: string) { return this.request<PricingVersionDto[]>(`${this.resource(id)}/versions`); }
  reviews(id: string) { return this.request<PricingReviewDto[]>(`${this.resource(id)}/reviews`); }
  create(input: { clientId: string; ownerId?: string; draft: PricingDraftDto }) { return this.request<PricingCommandDto>(this.baseUrl, { method: "POST", body: JSON.stringify(input), command: true }); }
  updateDraft(id: string, draft: PricingDraftDto, concurrencyToken: string) { return this.command(id, "draft", { draft, concurrencyToken }, "PATCH"); }
  saveVersion(id: string, token: string) { return this.command(id, "versions", { concurrencyToken: token }); }
  requestQualityReview(id: string, token: string, versionNumber: number) { return this.command(id, "quality-review", { concurrencyToken: token, versionNumber }); }
  approve(id: string, token: string) { return this.command(id, "approve", { concurrencyToken: token }); }
  reject(id: string, token: string, finding: string) { return this.command(id, "reject", { concurrencyToken: token, finding }); }
  beginRevision(id: string, token: string) { return this.command(id, "revision", { concurrencyToken: token }); }
  archive(id: string, token: string) { return this.command(id, "archive", { concurrencyToken: token }); }
  private resource(id: string) { return `${this.baseUrl}/${encodeURIComponent(id)}`; }
  private command(id: string, path: string, body: unknown, method = "POST") { return this.request<PricingCommandDto>(`${this.resource(id)}/${path}`, { method, body: JSON.stringify(body), command: true }); }
  private async request<T>(url: string, options: { method?: string; body?: string; command?: boolean } = {}): Promise<T> {
    const correlationId = crypto.randomUUID();
    let response: Response;
    try {
      const headers: Record<string, string> = { "x-company-id": this.companyId, "x-correlation-id": correlationId };
      if (options.body !== undefined) headers["content-type"] = "application/json";
      if (options.command) headers["idempotency-key"] = crypto.randomUUID();
      response = await this.fetcher(url, { credentials: "same-origin", method: options.method ?? "GET", headers, body: options.body });
    } catch { throw new PricingApiError("NETWORK_ERROR", "Cotarion could not be reached. Check your connection and try again.", 0, correlationId); }
    let envelope: Envelope<T>;
    try { envelope = await response.json() as Envelope<T>; }
    catch { throw new PricingApiError("INVALID_RESPONSE", "Cotarion returned an unreadable response.", response.status, response.headers.get("x-correlation-id") ?? correlationId); }
    if (!response.ok || envelope.data === undefined) throw new PricingApiError(envelope.error?.code ?? "REQUEST_FAILED", envelope.error?.message ?? "The Pricing request could not be completed.", response.status, envelope.correlationId ?? correlationId);
    return envelope.data;
  }
}
