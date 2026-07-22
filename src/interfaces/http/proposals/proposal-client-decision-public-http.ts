import type { ProposalClientDecisionPublicService } from "@/application/proposals/proposal-client-decision-public-service";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const unavailable = () => Response.json({ error: { code: "NOT_FOUND", message: "Secure Proposal decision is unavailable." } }, { status: 404, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
export async function handlePublicProposalDecision(request: Request, token: string, outcome: string, service: ProposalClientDecisionPublicService, now: () => Date = () => new Date(), randomUUID: () => string = () => crypto.randomUUID()) {
  if (request.method !== "POST" || (outcome !== "accept" && outcome !== "decline")) return unavailable();
  const requestIdentity = request.headers.get("idempotency-key"); if (!requestIdentity || !UUID.test(requestIdentity)) return unavailable();
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.confirmed !== true) return unavailable();
    const result = await service.record(token, { outcome: outcome === "accept" ? "ACCEPTED" : "DECLINED", decidedAt: now().toISOString(), clientDisplayName: typeof body.clientDisplayName === "string" ? body.clientDisplayName : undefined, clientMessage: typeof body.clientMessage === "string" ? body.clientMessage : undefined, correlationId: randomUUID(), requestIdentity });
    if (result.status === "UNAVAILABLE") return unavailable();
    if (result.status === "CONFLICT") return Response.json({ error: { code: "DECISION_CONFLICT", message: "A final Proposal decision has already been recorded." } }, { status: 409, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
    return Response.json({ data: { outcome: result.decision.outcome, decidedAt: result.decision.decidedAt, title: result.title, proposalNumber: result.proposalNumber, proposalVersionNumber: result.proposalVersionNumber, idempotentReplay: result.status === "REPLAY" } }, { status: result.status === "REPLAY" ? 200 : 201, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" } });
  } catch { return unavailable(); }
}
