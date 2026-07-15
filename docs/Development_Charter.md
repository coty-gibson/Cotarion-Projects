# Development Charter

## Project

**Application:** Cotarion Platform  
**Version 1 Module:** Pricing & Proposals  
**Purpose:** Permanent development guide for all future coding, planning, review, and sprint execution.

This charter governs how the Cotarion Platform will be designed, built, reviewed, tested, and evolved.

## 1. Development Philosophy

The Cotarion Platform should be built as long-term business software, not as a quick spreadsheet replacement.

Permanent rules:

- Never implement functionality that is not approved in the Functional Design Specification or User Experience Specification.
- Never remove existing functionality without approval.
- Build in small, testable modules.
- Each sprint must end with working software.
- Prefer maintainable code over clever code.
- Explain major architectural decisions.
- Minimize technical debt.
- Every new feature must include appropriate validation and error handling.
- Every completed sprint should be reviewable independently.
- Stop after each sprint and wait for approval before beginning the next sprint.

Development should prioritize:

- Business correctness
- Transparent calculations
- Historical accuracy
- Maintainability
- Clear user workflows
- Future expansion
- Safe, reviewable increments

## 2. Coding Standards

Code should be clear, boring, and maintainable.

Standards:

- Use descriptive names for files, functions, variables, records, and modules.
- Keep modules focused on one responsibility.
- Avoid hidden business logic.
- Keep pricing and calculation logic isolated from presentation logic.
- Prefer explicit validation over implicit assumptions.
- Avoid duplicating business rules across the codebase.
- Do not hard-code configurable business data when it belongs in administration.
- Keep comments concise and useful.
- Write code so another developer can understand the intent without reconstructing the business discussion.

Business rules should be represented in a way that can be tested independently.

## 3. Documentation Standards

Documentation is part of the product.

Permanent project documents:

- Functional Design Specification
- User Experience Specification
- Development Charter
- Sprint plans
- Architectural decision records, when needed
- Release notes or sprint summaries

Documentation standards:

- Keep requirements separate from implementation details.
- Update documentation when approved requirements change.
- Document major architectural decisions before or during implementation.
- Record intentionally deferred items.
- Record known risks and tradeoffs.
- Do not let implementation drift away from approved documentation.

If code and documentation disagree, stop and resolve the discrepancy before continuing.

## 4. Git Commit Standards

Commits should be small, purposeful, and reviewable.

Standards:

- Commit related changes together.
- Avoid mixing unrelated features, refactors, and formatting changes.
- Use clear commit messages that describe the business or technical purpose.
- Do not commit generated noise, temporary files, secrets, credentials, or local environment artifacts.
- Do not rewrite or discard user work without explicit approval.
- Prefer a clean history where each commit can be understood independently.

Suggested commit message format:

```text
type(scope): concise description
```

Examples:

```text
docs(charter): add development charter and sprint workflow
feat(proposals): add proposal ownership fields
test(pricing): cover project complexity calculation
fix(discounts): prevent multiple standard discounts
```

## 5. Sprint Workflow

Every sprint must have:

- Objectives
- Deliverables
- Acceptance criteria
- Risks
- Items intentionally deferred

Sprint workflow:

1. Define sprint scope from approved FDS/UXS requirements.
2. Confirm deliverables and acceptance criteria.
3. Build only the approved sprint scope.
4. Validate behavior with appropriate tests and manual review.
5. Document completed work, risks, and deferred items.
6. Stop and wait for approval before beginning the next sprint.

Each sprint must end with working software, even if the feature set is small.

## 6. Code Review Process

Code review should focus on correctness, maintainability, and alignment with approved requirements.

Review priorities:

- Does the change match the FDS and UXS?
- Are business rules implemented clearly?
- Are calculations explainable and testable?
- Are validation and error handling included?
- Is historical data protected where required?
- Is the change appropriately scoped?
- Are tests adequate for the risk?
- Does the change introduce avoidable technical debt?

Code review should identify:

- Bugs
- Missing requirements
- Unapproved behavior
- Confusing workflows
- Security or data-integrity risks
- Test gaps
- Maintainability concerns

No sprint should be considered complete until review findings are resolved or explicitly deferred.

## 7. Testing Expectations

Testing should scale with risk.

Required testing expectations:

- Calculation logic must have automated tests.
- Validation rules must be tested.
- Critical workflows must be manually verified at minimum.
- Regression tests should be added when fixing bugs.
- Snapshot or fixture-based tests should be considered for proposal/agreement outputs when practical.
- Tests should verify both successful and invalid states.

High-priority test areas:

- Project service totals
- Complexity multipliers
- Retainer pricing
- Advisory Consulting billing increments
- AOP averages
- Profit-share recommendations
- Hybrid Payment recommendations
- Discounts and discount eligibility
- Proposal version snapshots
- Agreement generation
- Ownership and reassignment

## 8. Definition of Done

A sprint is considered complete only when:

- All acceptance criteria pass.
- Unit tests pass.
- Integration tests pass, when applicable.
- Manual testing is completed.
- The Product Owner reviews and approves the sprint.
- Documentation is updated if affected.
- ADRs are updated if architectural decisions changed.
- No critical known defects remain.
- The sprint is demonstrably usable for its intended purpose.

Passing automated tests alone does not constitute completion.

## 9. Versioning Strategy

The Cotarion Platform should use clear versioning for both software releases and business records.

Software versioning:

- Use version labels for meaningful development milestones.
- Each completed sprint should be independently reviewable.
- Release notes should summarize completed work and known limitations.

Business record versioning:

- Proposal versions must be preserved.
- Finalized proposals must be locked.
- Signed agreements must be locked.
- Pricing and template snapshots must remain historically accurate.
- Future catalog or template changes must not alter finalized records.

## 10. File Organization

The project should use clear separation between:

- Application source code
- Tests
- Documentation
- Configuration
- Generated outputs
- Scripts or developer tooling

Expected top-level organization should be decided during Sprint 0 after technology selection is approved.

General rules:

- Keep documentation in `docs/`.
- Keep generated files out of source control unless intentionally approved.
- Keep business logic organized by domain.
- Keep reusable UI components separate from workflow-specific screens.
- Keep pricing/calculation code in a dedicated area that can be tested independently.

## 11. Decision-Making Rules

Decision hierarchy:

1. Approved Functional Design Specification
2. Approved User Experience Specification
3. Development Charter
4. Approved sprint plan
5. Implementation details

Rules:

- If a request conflicts with approved documentation, update and approve the documentation first.
- If a feature is not approved, do not build it.
- If a change would remove or materially alter existing behavior, get approval first.
- If there is uncertainty about business behavior, ask before implementing.
- If there is uncertainty about technical implementation, prefer the simplest maintainable approach.
- If a shortcut creates meaningful future risk, document the risk or avoid the shortcut.
- Configuration is preferred over code for business-managed rules.

## 12. Architecture Decision Records (ADR)

The Cotarion Platform will maintain Architecture Decision Records (ADRs) for any significant architectural or business-logic decision that affects future development.

The purpose of ADRs is to preserve institutional knowledge so future developers understand why important decisions were made rather than only seeing the resulting code.

An ADR should be created whenever a decision:

- Changes the overall architecture.
- Establishes a permanent business rule.
- Introduces a major technical tradeoff.
- Alters data structure.
- Changes proposal or pricing philosophy.
- Impacts future scalability.
- Affects multiple modules.

Each ADR should contain:

1. ADR Number
2. Title
3. Date
4. Status: Proposed, Approved, Superseded, or Deprecated
5. Decision
6. Business Context
7. Alternatives Considered
8. Decision Rationale
9. Consequences
10. Related FDS/UXS Sections
11. Future Considerations

ADR storage rules:

- ADRs are stored in `docs/adr/`.
- Each ADR is stored as its own markdown file.
- ADR filenames should use the format `ADR-000-short-title.md`.
- ADRs should be updated by superseding or deprecating old decisions, not silently rewriting history.
- Significant implementation work should reference relevant ADRs when applicable.

Initial ADRs established for future completion:

- ADR-001: Cotarion Platform Architecture
- ADR-002: Pricing & Proposals as Version 1 Module
- ADR-003: Value-Based Project Pricing Philosophy
- ADR-004: Advisory Consulting as the Only Hourly Billing Model
- ADR-005: Engagement Lifecycle Architecture

## Sprint Definition Template

Every sprint plan must include:

### Objectives

What the sprint is intended to accomplish.

### Deliverables

Concrete outputs expected by the end of the sprint.

### Acceptance Criteria

Observable conditions that must be true for the sprint to be complete.

### Risks

Known risks, uncertainties, or tradeoffs.

### Items Intentionally Deferred

Relevant work that is explicitly not included in the sprint.

## Proposed Sprint 0 Plan

Sprint 0 is preparation only. It should not include application coding, scaffolding, or implementation of product functionality.

### Objectives

- Prepare the project for disciplined development.
- Confirm the approved documentation baseline.
- Identify decisions required before scaffolding.
- Define the initial development workflow.
- Prepare for technology stack selection without selecting it yet.

### Deliverables

- Confirmed documentation set:
  - Functional Design Specification
  - User Experience Specification
  - Development Charter
- Sprint planning structure.
- Initial backlog outline for Version 1.
- Decision log template.
- Risk log template.
- Definition of Done for future sprints.
- List of technology selection criteria.

### Acceptance Criteria

- Development Charter is created and approved.
- Sprint process is documented.
- No application code is written.
- No application scaffold is created.
- No technology stack is selected.
- Remaining pre-development decisions are listed clearly.
- Sprint 1 cannot begin until Sprint 0 is reviewed and approved.

### Risks

- Moving into coding before stack, architecture, and sprint rules are approved.
- Over-scoping Sprint 0 into implementation work.
- Selecting technology before the evaluation criteria are agreed.
- Allowing future-module concepts to leak into Version 1 implementation.

### Items Intentionally Deferred

- Technology stack recommendation.
- Application scaffolding.
- Database setup.
- UI implementation.
- Authentication implementation.
- Pricing engine implementation.
- PDF generation implementation.
- Deployment setup.
- Automated test setup.

### Proposed Sprint 0 Activities

1. Review and approve this Development Charter.
2. Review FDS and UXS as the official Version 1 scope baseline.
3. Create a Version 1 backlog from approved requirements.
4. Define the Definition of Done.
5. Create a decision log format.
6. Create a risk log format.
7. Define technology selection criteria for the next planning step.
8. Stop and wait for approval before any coding, scaffolding, or stack recommendation.

## Planning Freeze

Planning Phase: COMPLETE  
Architecture Phase: COMPLETE  
Governance Phase: COMPLETE  
Technology Selection: COMPLETE

All future work should proceed through the approved sprint process unless the Product Owner explicitly reopens planning.
