# Development Milestone Report — Pricing Workspace Capability

Date: 2026-07-20

## 1. Capability Completed

The Cotarion Platform now supports the complete approved Version 1 Cotarion Consulting Group pricing policy through one company-isolated Pricing Project workflow. Project, Fixed Retainer, Profit-Share Retainer, Hybrid Retainer, and Advisory Hourly models are operational.

## 2. Operational Workflow

The Product Owner can create a Pricing Project for an existing Client, switch between pricing models, enter model-specific inputs, see the complete approved calculation update live, save the draft, return to the project list, reopen it, and continue editing. The saved record retains the pricing model, methodology, immutable configuration reference, inputs, adjustments, outputs, discounts, rounding result, and final amount or percentage. Warnings and blocking validation errors use separate visual treatments.

## 3. Technical Summary

- Added isolated pure-domain calculators for Fixed, Profit-Share, Hybrid, and Advisory pricing without changing approved Project Pricing behavior.
- Added exact fixed-decimal handling for signed operating-profit inputs, monetary calculations, and half-percentage-point rate rounding.
- Extended the existing Pricing Project aggregate and persistence implementation with explicitly typed model details and immutable input/output snapshots.
- Added model-aware application orchestration and a single responsive editing workflow that delegates calculations to the domain.
- Ensured reopened Drafts load and retain their original Pricing Configuration version even after a newer configuration becomes active.
- Added complete model-specific calculation breakdowns and visible methodology/configuration version identifiers.
- Added domain, persistence, precision, seed, concurrency, and browser workflow coverage.
- Production build passes with development authentication disabled.

## 4. Architecture Notes

ADR-016 records the durable decision to keep all pricing models inside the shared Pricing Project aggregate while isolating their calculation policies by model boundary. No general governance documents were expanded for this capability.

## 5. Critical Defects

No open Critical Defects remain. Browser-test selector ambiguity caused by responsive duplicate navigation and multiple draft rows was corrected without changing business behavior.

## 6. Product Owner Attention Required

None. The implementation uses the approved Version 1 pricing policy without introducing new business decisions.

## 7. Product Owner Refinement Backlog

The existing Retainer pricing observation remains governed by the Product Owner Refinement Backlog lifecycle. This milestone implements the approved capability; only the Product Owner may validate or close the backlog item.

## 8. Next Capability

Proposal Builder is the next approved Version 1 operational capability.
