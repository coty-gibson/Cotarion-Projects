# Cotarion Platform Development Operating Model

## Governance Status

This capability-driven operating model governs Cotarion Platform development effective 2026-07-20.

Its objective is to maximize development velocity while maintaining architectural integrity, product consistency, technical quality, and Product Owner oversight.

## Guiding Philosophy

> The Product Owner should spend time operating Cotarion.
>
> Development should spend time building Cotarion.
>
> Architecture should spend time protecting Cotarion.

Each role succeeds by focusing on its responsibilities while trusting the others to perform theirs.

## Product Owner Responsibilities

The Product Owner is responsible for:

- Business vision
- Operational workflow validation
- Product priorities
- Acceptance decisions
- Refinement priorities
- Production approval

The Product Owner evaluates Cotarion as a business operator rather than as a software developer.

Only the Product Owner may exercise the decision authority assigned in the [Product Owner Refinement Backlog](Product_Owner_Refinement_Backlog.md).

## Architecture Responsibilities

Architecture is responsible for:

- Long-term platform structure
- Domain model integrity
- Module boundaries
- Scalability
- Naming consistency
- Technical governance

Architecture is consulted when implementation affects long-term platform design or introduces a significant structural decision. Routine implementation does not require a separate architecture checkpoint when it follows approved architecture, domain boundaries, and business rules.

## Development Responsibilities

Development is responsible for:

- Feature implementation
- User interface construction
- Business logic implementation
- Testing
- Documentation
- Refactoring
- Technical quality

Development is expected to make reasonable routine engineering decisions without requesting Product Owner approval. Approved architecture and documented business rules remain authoritative until the Product Owner explicitly changes them.

Implementation favors safe progress over unnecessary checkpoints.

## Escalation Criteria

Development interrupts roadmap implementation only when at least one of these conditions occurs:

- A Critical Defect
- A significant architecture decision
- Conflicting business requirements
- A Product Owner policy conflict
- A security concern
- An operational workflow that cannot reasonably be completed without Product Owner direction

Otherwise, Development continues within the approved capability and roadmap.

### Routine Decisions That Do Not Require Escalation

Provided they remain within approved scope and architecture, Development may decide:

- File and component organization
- Internal implementation details
- Test structure and fixtures
- Refactoring needed to maintain quality
- Error handling consistent with existing policy
- Responsive layout implementation
- Accessible control selection
- Reuse of established design-system components
- Performance improvements that preserve behavior
- Documentation organization

These examples do not authorize changes to Product Owner policy, approved business methodology, security boundaries, or long-term architecture.

## Capability Delivery Cycle

1. Development completes an operational capability.
2. Development validates the capability through appropriate automated and manual testing.
3. Development issues a capability-focused Development Milestone Report.
4. The Product Owner exercises the capability with real Cotarion business scenarios.
5. Workflow observations are recorded in the permanent Product Owner Refinement Backlog.
6. Critical Defects are resolved immediately.
7. Non-critical Workflow Improvements remain in the backlog.
8. Development proceeds to the next approved capability.
9. Approved refinement work is addressed during the dedicated Product Owner Refinement phase.

## Development Communication Cadence

Development communication is capability-driven rather than implementation-driven.

Routine engineering proceeds without status requests or Product Owner approval checkpoints. Development reports when:

- An operational capability is complete; or
- An approved escalation condition requires immediate Product Owner authority.

At capability completion, Development uses the [Development Milestone Report](Development_Milestone_Report_Template.md) structure and reports:

1. Capability Completed
2. Operational Workflow
3. Technical Summary
4. Architecture Notes
5. Critical Defects
6. Product Owner Attention Required
7. Product Owner Refinement Backlog
8. Next Capability

Product Owner Attention Required contains only matters reserved for Product Owner authority. Workflow Improvements are recorded in the permanent backlog without delaying the next capability.

The primary measure of progress is the number of complete business capabilities Cotarion can perform using its own platform.

## Quality Expectations

Velocity does not remove the requirement for:

- Layered architecture
- Domain and module boundaries
- Company isolation
- Authentication and authorization controls
- Correct business calculations
- Durable persistence
- Appropriate automated testing
- Operational documentation
- Clean, maintainable implementation

Development may incrementally improve implementation quality while delivering capabilities, provided the work does not expand scope or conflict with approved policy.

## Relationship to Product Owner Acceptance

Product Owner Acceptance is operational validation, not a requirement for the Product Owner to review routine engineering decisions.

During Acceptance:

- The Product Owner uses real business scenarios.
- Critical Defects interrupt and block progression until resolved.
- Workflow Improvements are recorded for structured review.
- Product Owner priorities and acceptance decisions remain authoritative.

## Release Governance

This operating model does not weaken the release gates in the Product Owner Refinement Backlog.

Production deployment still requires:

- Complete core functionality
- Completed Product Owner Acceptance
- Resolved Critical Defects
- Review of High-priority Workflow Improvements
- Implementation of approved refinement work
- Successful end-to-end validation
- Explicit Product Owner production approval

## Expected Outcomes

The operating model is intended to:

- Reduce development interruptions
- Increase implementation velocity
- Preserve architectural consistency
- Encourage thoughtful engineering decisions
- Keep Product Owner attention on business outcomes
- Produce a cohesive Version 1 operating platform
