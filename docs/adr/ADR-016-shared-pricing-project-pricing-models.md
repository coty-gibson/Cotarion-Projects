# ADR-016: Shared Pricing Project With Explicit Pricing Models

## Date

2026-07-20

## Status

Accepted

## Context

Cotarion Version 1 supports Project Pricing, Fixed Retainers, Profit-Share Retainers, Hybrid Retainers, and hourly Advisory Consulting.

These models have different inputs and calculation boundaries, but they share the same operational identity, Client and Company ownership, estimate numbering, lifecycle status, configuration history, downstream Proposal relationship, and future duplication behavior.

Separate top-level record systems would fragment Client history and require downstream modules to reconstruct a single pricing workflow from unrelated records.

## Decision

`PricingProject` remains the shared aggregate and major business record for every pricing model.

Each Pricing Project explicitly records one pricing-model type:

- `PROJECT`
- `FIXED_RETAINER`
- `PROFIT_SHARE_RETAINER`
- `HYBRID_RETAINER`
- `ADVISORY_HOURLY`

The aggregate preserves:

- Immutable estimate number
- Company, Client, and owner
- Pricing Configuration version
- Pricing-model type
- Methodology version
- Calculation inputs and adjustments
- Calculation outputs and rounding result
- Currency
- Lifecycle status

Calculation logic remains separated by pricing-model boundary in the Pricing Domain. Presentation and persistence coordinate the selected model but do not implement pricing methodology.

Project-specific service lines, recurring complexity selections, discounts, Adjusted Operating Profit inputs, and Advisory duration are used only where the selected model requires them.

## Consequences

- Client history receives one consistent kind of pricing record.
- Proposal Builder can reference one Pricing Project abstraction while consuming model-specific results.
- Company isolation and estimate numbering remain uniform.
- Historical records retain the configuration and methodology used.
- Model-specific validation remains explicit and independently testable.
- Future pricing models can extend the aggregate without creating disconnected operational record systems.

The shared aggregate must not become a single undifferentiated calculation function. Each methodology retains its own domain input, validation, calculation, and tests.

## Alternatives Rejected

### Separate record system for each pricing model

Rejected because it fragments Client history, duplicates ownership and lifecycle rules, and complicates downstream Proposal and Engagement connections.

### One generic untyped calculation payload

Rejected because it obscures business invariants and permits invalid combinations of inputs.

### Embed pricing formulas in the user interface

Rejected because pricing methodology must remain independently testable and reusable outside the web interface.
