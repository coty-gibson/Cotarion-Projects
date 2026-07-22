# Proposal Sprint 4 — Client Decisions

Status: Implemented; Product Owner operational acceptance and release approval remain pending.

## Implemented architecture

Client Decisions are immutable terminal evidence records beside the Proposal aggregate. Each Decision references exactly one governed Client Delivery and retains its Proposal Version and Representation identities without copying Proposal content, Pricing evidence, or Representation bytes. Database uniqueness permits at most one terminal Decision per Delivery.

The implemented public outcomes are `ACCEPTED` and `DECLINED`. The normalized outcome contract also recognizes `WITHDRAWN` and `EXPIRED` for explicit future business-event paths; terminal evidence cannot be edited or deleted.

Decision submission validates the opaque Delivery token, AVAILABLE status, expiration, revocation state, and absence of a prior Decision in one transaction. Identical request replay returns the retained Decision; conflicting outcomes or request identities are rejected. The command creates no Agreement, Engagement, project, payment, or signature record and does not update Proposal Versions or Representations.

Internal history, current Decision, Delivery status, and timeline projections query Decision persistence directly and require `proposal:view-decisions`. Public accept/decline endpoints are separate from authenticated internal APIs and return only approved client-facing metadata.

## Client experience

An active secure Delivery link presents the Proposal artifact and server-projected Decision eligibility. Accept and Decline require explicit confirmation. Optional client display name and message are retained as Decision evidence. Viewing remains access evidence only and is never treated as a Decision.

## Verified technical behavior

Automated coverage verifies immutable evidence, single-terminal semantics, acceptance, decline, replay, conflict rejection, revoked/expired/invalid link rejection, safe public contracts, direct CQRS reads, internal authorization, normalized persistence, and preservation of Proposal Version and Representation records.

## Operational acceptance

Implementation does not constitute operational acceptance. Client wording, authorized-recipient policy, correction procedures, and support handling require Product Owner exercise before release.

## Future capability work

Electronic signatures, Agreements, Engagements, payments, negotiation, client accounts, email automation, reminders, CRM updates, and project creation remain unimplemented.
