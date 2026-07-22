import type { ProposalVersionRepresentationSource } from "@/application/proposals/proposal-representation";
import { completeRepresentation } from "./representation-renderer-support";

function materialLines(source: ProposalVersionRepresentationSource) {
  const output = source.pricingSnapshot.outputSnapshot;
  return [source.draft.title, `Proposal ${source.proposalNumber} · Version ${source.proposalVersionNumber}`, ...source.draft.content.sections.filter(({ clientVisible }) => clientVisible).flatMap(({ heading, body }) => [heading, body]), `Commercial amount: ${output.currency} ${output.finalAmount}`, `Payment schedule: ${source.draft.commercialTerms.paymentSchedule}`, `Billing method: ${source.draft.commercialTerms.billingMethod}`, `Assumptions and exclusions: ${source.draft.commercialTerms.assumptionsAndExclusions}`, `Client responsibilities: ${source.draft.commercialTerms.clientResponsibilities}`];
}

function pdfText(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export class PdfRepresentationRenderer {
  render(source: ProposalVersionRepresentationSource) {
    const lines = materialLines(source).map(pdfText).slice(0, 35);
    const stream = `BT\n/F1 12 Tf\n50 760 Td\n${lines.map((line, index) => `${index ? "0 -18 Td\n" : ""}(${line}) Tj`).join("\n")}\nET`;
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    let pdf = "%PDF-1.4\n"; const offsets = [0];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, "latin1")); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return completeRepresentation(source, "PDF", "application/pdf", Buffer.from(pdf, "latin1"));
  }
}
