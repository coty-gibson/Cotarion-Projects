# Proposal Sprint 3 — Client Delivery

Status: Implemented; architecture and operational acceptance remain separate governance gates.

## Implemented architecture

Proposal Client Delivery is a dedicated Proposal subsystem beside the Proposal aggregate. A Delivery references exactly one retained immutable Proposal Representation and stores no duplicate Representation bytes, Proposal content, or Pricing evidence. The only implemented channel is `SECURE_LINK`; no email provider integration was introduced.

Normalized persistence retains the Delivery lifecycle, immutable recipient snapshot, append-only Delivery evidence, and minimal access evidence. Company-scoped constraints and indexes cover Delivery identity, idempotent request identity, Representation reference, token lookup, history, and expiration. Delivery creation and its recipient/event evidence commit transactionally.

The application layer owns authorization, recipient and expiration validation, durable request idempotency, revocation, and expiration. Direct CQRS repositories provide Delivery list, detail, history, active links, and access history without Proposal aggregate reconstruction. Server-projected permitted actions combine lifecycle, expiration, Company scope, and actor capability.

## Secure-link boundary

Secure links use a 256-bit HMAC-derived opaque token and persist only its SHA-256 digest. The token contains no business state or internal identifier. The public endpoint is separate from authenticated internal Proposal endpoints, accepts only `GET`, atomically validates status and expiration while recording access evidence, and returns the exact stored Representation bytes with restrictive content, caching, sniffing, framing, and referrer headers. Invalid, expired, revoked, and failed resolution share the same safe response.

Opening or downloading a secure link records retrieval evidence only. It is explicitly not Client Acceptance.

## Verified technical behavior

Automated coverage verifies Delivery lifecycle rules, idempotent replay and intentional separate requests, immutable recipient evidence, token opacity and non-reversible storage, invalid link handling, exact artifact bytes, safe public responses, capability and Company enforcement, and direct-read permitted-action projection. Database migration and production verification are recorded in the sprint handoff.

## Operational acceptance

Implementation does not constitute Product Owner operational acceptance or release approval. Operational review should exercise recipient policy, expiry choices, internal delivery procedures, client-facing wording, and revocation practice before release.

## Explicitly future

Client Acceptance, signatures, Agreement and Engagement creation, payments, client accounts, negotiation, comments, reminders, analytics, SMS, and outbound email-provider integration remain unimplemented.
