# Proposal Sprint 5 — Agreement Generation

Status: Implemented; architecture conformance, Product Owner operational acceptance, and release approval remain separate gates.

## Implemented architecture

Agreement is an independent bounded context consuming accepted Client Decision and immutable Proposal evidence through direct read-only persistence integration. One accepted Decision can generate one Agreement. Declined, withdrawn, expired, missing, or otherwise non-accepted Decisions are ineligible.

Generation creates immutable Agreement, Version 1, deterministic HTML/PDF artifacts, and append-only `AGREEMENT_GENERATED` and `AGREEMENT_READY_FOR_SIGNATURE` evidence in one transaction. Repeated generation for the accepted Decision returns the retained Agreement. No Proposal, Proposal Version, Representation, Delivery, Decision, Pricing, Signature, Agreement-execution, or Engagement state is changed.

Agreement rendering uses the application-owned `AgreementRenderer` abstraction with separate HTML and PDF infrastructure renderers. Documents include the parties, Proposal reference, scope, pricing summary, payment terms, term, required legal placeholders, and unsigned Client/Cotarion signature blocks.

Direct CQRS projections provide Agreement history, detail, and artifact retrieval without Proposal aggregate reconstruction. Internal generation and viewing require `agreement:generate` and `agreement:view`. Server projections determine whether Generate Agreement is available.

## Verified technical behavior

Automated tests cover accepted-Decision eligibility, rejection without accepted evidence, authorization and Company isolation, Version 1, idempotent replay, deterministic HTML/PDF rendering, renderer separation, direct reads, transactional normalized persistence, artifact preservation, and absence of Signature or Engagement creation.

## Operational acceptance

Generated legal placeholders are architectural scaffolding and are not approved legal language. Implementation does not constitute legal review, Product Owner operational acceptance, execution readiness, or release approval.

## Future capability work

Legal clause governance, Agreement corrections/new Versions, electronic signatures, execution evidence, delivery, Engagement creation, payments, reminders, and client portal access remain unimplemented.
