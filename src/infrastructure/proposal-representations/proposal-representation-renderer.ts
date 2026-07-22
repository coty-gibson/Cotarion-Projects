import type { RepresentationRenderer } from "@/application/proposals/proposal-representation-renderer";
import type { ProposalRepresentationType, ProposalVersionRepresentationSource } from "@/application/proposals/proposal-representation";
import { HtmlRepresentationRenderer } from "./html-representation-renderer";
import { PdfRepresentationRenderer } from "./pdf-representation-renderer";

export class ProposalRepresentationRenderer implements RepresentationRenderer {
  constructor(
    private readonly html = new HtmlRepresentationRenderer(),
    private readonly pdf = new PdfRepresentationRenderer()
  ) {}

  render(source: ProposalVersionRepresentationSource, representationType: ProposalRepresentationType) {
    return representationType === "HTML" ? this.html.render(source) : this.pdf.render(source);
  }
}
