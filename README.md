# Cotarion Platform

Version 1 module: **Pricing & Proposals**

This repository contains the Cotarion Platform application foundation. Sprint 1 establishes the approved project scaffold, layered architecture, development tooling, and minimal application shell only.

## Sprint 1 Scope

Included:

- Next.js, React, and TypeScript
- Tailwind CSS
- shadcn/ui configuration
- Presentation, Application, Domain, and Infrastructure layer folders
- ESLint and Prettier
- Vitest smoke test setup
- Playwright shell test setup
- Minimal shell page and navigation framework

Not included:

- Authentication
- Database
- Prisma
- Business logic
- Pricing engine
- Clients
- Proposals
- Agreements
- Engagements
- API endpoints
- PDF generation
- Object storage

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Architecture

The application uses the approved layered architecture:

- `src/presentation` - pages, screens, layouts, reusable UI, and previews
- `src/application` - future use cases and workflow coordination
- `src/domain` - future business rules, pricing logic, and historical integrity rules
- `src/infrastructure` - future database, auth, storage, PDF, and external integrations

Business logic must not be embedded in React pages or UI components.

## Approved Documentation

- [Functional Design Specification](docs/Functional_Design_Specification.md)
- [User Experience Specification](docs/User_Experience_Specification.md)
- [Development Charter](docs/Development_Charter.md)
- [Technology Evaluation Report](docs/Technology_Evaluation_Report.md)
- [Implementation Plan](docs/Implementation_Plan.md)
- [Architecture Decision Records](docs/adr/README.md)
