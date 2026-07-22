# Proposal Sprint 6 — Electronic Signatures

Status: Implemented; legal review, provider certification, operational acceptance, execution, and release approval remain separate.

Electronic Signatures are an Agreement subsystem. Each independently governed Signature Request references one immutable Agreement Version and one retained Agreement artifact checksum. Signer name, email, role, and signing order are immutable snapshots. Supported roles are Client and Cotarion Representative; parallel and ordered signing are supported.

The application-owned `SignatureProvider` port isolates opaque token issuance. The internal adapter uses a strong HMAC-derived token and persists only its SHA-256 verifier. Public access is separate from authenticated Agreement APIs, uses constant unavailable responses, restrictive no-store/security headers, and exposes no persistence identities.

Only AVAILABLE requests can be signed or declined. Revoked and expired requests are rejected. Ordered requests require all earlier signers to be SIGNED. Completion persists typed acknowledgment or decline evidence, signer snapshot, artifact checksum, request/correlation identity, and append-only lifecycle evidence transactionally. Viewing/downloading records access only and never signs.

Signing progress reports factual signer states and `fullySigned`; it explicitly reports that the Agreement is not executed. No Agreement content, artifact, Proposal, Decision, Engagement, payment, invoice, project, or task record is modified or created.

Implementation does not claim legal enforceability, signature-provider certification, Agreement execution, Product Owner acceptance, legal approval, or release readiness.
