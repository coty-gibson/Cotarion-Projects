# Proposal Sprint 2 — Representations & Document Generation

Date: 2026-07-21  
Status: Implemented; operational acceptance remains a governance gate.

## Boundary

Proposal Representations are immutable derived artifacts. They reference exactly one immutable Proposal Version and never become editable business objects. Generation reads the normalized Proposal Version and its frozen Pricing evidence; it never reads the mutable Draft and never invokes Pricing calculation behavior.

## Generation

The application-owned `RepresentationRenderer` port isolates generation from format infrastructure. `HtmlRepresentationRenderer` and `PdfRepresentationRenderer` retain the deterministic byte algorithms, while the Proposal Representation service requests a type through the injected abstraction. The renderer produces deterministic HTML or PDF bytes, a SHA-256 checksum, content type, and reproducibility metadata. The artifact record stores its Proposal and Version identities, representation type and version, renderer version, status, generated timestamp and actor, immutable bytes, checksum, and metadata.

One renderer/version/type result is idempotent for a Proposal Version. A replay returns the retained artifact after verifying its checksum and renderer identity. Different Proposal Versions retain independent HTML and PDF history.

## CQRS and HTTP

Representation list, detail, current, history, and content queries read the Representation persistence model directly without Proposal aggregate reconstruction. Authenticated Company scope applies to generation, metadata, preview, and downloads. Generation additionally requires the Proposal Representation capability.

The Proposal HTTP API exposes generation, list, detail, current, history, and artifact download routes. The browser uses only the typed Proposal HTTP client. The minimal workspace supports generation, sandboxed HTML preview, PDF preview, download, and history.

## Exclusions

This sprint does not implement email delivery, Client Acceptance, signatures, Agreement generation, Engagement creation, payments, branding customization, or template design.
