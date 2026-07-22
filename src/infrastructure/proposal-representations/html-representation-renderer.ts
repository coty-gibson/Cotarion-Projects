import type { ProposalVersionRepresentationSource } from "@/application/proposals/proposal-representation";
import { completeRepresentation } from "./representation-renderer-support";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export class HtmlRepresentationRenderer {
  render(source: ProposalVersionRepresentationSource) {
    const sections = source.draft.content.sections
      .filter(({ clientVisible }) => clientVisible)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map(({ heading, body }) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`)
      .join("");
    const output = source.pricingSnapshot.outputSnapshot;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(source.draft.title)}</title></head><body><main data-proposal-id="${escapeHtml(source.proposalId)}" data-proposal-version-id="${escapeHtml(source.proposalVersionId)}"><header><p>${escapeHtml(source.proposalNumber)} · Version ${source.proposalVersionNumber}</p><h1>${escapeHtml(source.draft.title)}</h1></header>${sections}<section><h2>Commercial terms</h2><p data-commercial-total="true">${output.currency} ${escapeHtml(output.finalAmount)}</p><p>${escapeHtml(source.draft.commercialTerms.paymentSchedule)}</p><p>${escapeHtml(source.draft.commercialTerms.billingMethod)}</p><p>${escapeHtml(source.draft.commercialTerms.assumptionsAndExclusions)}</p><p>${escapeHtml(source.draft.commercialTerms.clientResponsibilities)}</p></section></main></body></html>`;
    return completeRepresentation(source, "HTML", "text/html; charset=utf-8", Buffer.from(html, "utf8"));
  }
}
