import type { ProposalDeliveryPublicService } from "@/application/proposals/proposal-delivery-public-service";
import type { ProposalClientDecisionPublicService } from "@/application/proposals/proposal-client-decision-public-service";

export async function handlePublicProposalDelivery(request: Request, token: string, service: ProposalDeliveryPublicService, now: () => Date = () => new Date(), randomUUID: () => string = () => crypto.randomUUID(), decisions?: ProposalClientDecisionPublicService) {
  if (request.method !== "GET") return Response.json({ error: { code: "NOT_FOUND", message: "Secure Proposal link is unavailable." } }, { status: 404 });
  const correlationId = randomUUID();
  try {
    const occurredAt = now().toISOString();
    const artifact = await service.resolve(token, occurredAt, correlationId);
    if (!artifact) return Response.json({ error: { code: "NOT_FOUND", message: "Secure Proposal link is unavailable." } }, { status: 404, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
    const extension = artifact.representationType === "HTML" ? "html" : "pdf";
    const decision = decisions ? await decisions.status(token, occurredAt) : null;
    return new Response(Buffer.from(artifact.content), { headers: {
      "content-type": artifact.contentType,
      "content-disposition": `inline; filename="${artifact.proposalNumber}-v${artifact.proposalVersionNumber}.${extension}"`,
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'",
      "referrer-policy": "no-referrer",
      "x-proposal-title": encodeURIComponent(artifact.title),
      "x-proposal-number": artifact.proposalNumber,
      "x-proposal-version": String(artifact.proposalVersionNumber),
      "x-client-decision-eligible": decision?.eligible ? "true" : "false",
      "x-client-decision-status": decision?.outcome ?? "NONE"
    } });
  } catch {
    return Response.json({ error: { code: "NOT_FOUND", message: "Secure Proposal link is unavailable." } }, { status: 404, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  }
}
