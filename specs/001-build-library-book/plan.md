# Implementation Plan: University Library Book Management System

**Branch**: `001-build-library-book` | **Date**: 2026-04-22 | **Spec**: `specs/001-build-library-book/spec.md`
**Input**: Feature specification from `specs/001-build-library-book/spec.md`

## Summary

Build a RESTful library management backend for a university of 5,000 students that enforces circulation rules (max 5 active loans, 14-day due date), calculates overdue fees (5,000 VND/day capped at 500,000 VND), supports librarian inventory management, and enables search by title/author/ISBN. The solution uses Node.js 20, Express, TypeScript, PostgreSQL 16, and Prisma under strict Controller -> Service -> Repository boundaries with JWT RS256 auth and comprehensive tests.

## Technical Context

**Language/Version**: TypeScript on Node.js 20  
**Primary Dependencies**: Express, Prisma Client, jsonwebtoken, zod, pino  
**Storage**: PostgreSQL 16  
**Testing**: Jest + Supertest  
**Target Platform**: Linux server/containerized API backend  
**Project Type**: Web service (REST API)  
**Performance Goals**: p95 read API < 300ms, p95 mutation API < 500ms, search p95 < 2s  
**Constraints**: JWT RS256 access token TTL = 15 minutes; error format must be `{ "error_code": string, "message": string }`; soft-delete + audit log for all entities  
**Scale/Scope**: 5,000 students, up to 50,000 books, ~500 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Principle I (Controller -> Service -> Repository): PASS
  - Plan defines strict layer ownership and disallows controller-to-Prisma direct access.
- Principle II (Security By Default): PASS
  - Input validation at controller boundary; secrets from env only; Prisma parameterized access only.
- Principle III (Coverage And Placement): PASS
  - Service tests are co-located and target >= 80% lines and >= 80% branches.
- Principle IV (Data Integrity And Traceability): PASS
  - Soft-delete on business entities; audit entries for all mutation flows.
- Principle V (API Consistency): PASS
  - REST JSON API under `/api/v1`; standardized error contract.

## Project Structure

### Documentation (this feature)

```text
specs/001-build-library-book/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md              # created by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app.ts
├── server.ts
├── config/
│   ├── env.ts
│   └── logger.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.schemas.ts
│   │   └── auth.service.test.ts
│   ├── books/
│   │   ├── book.controller.ts
│   │   ├── book.service.ts
│   │   ├── book.repository.ts
│   │   ├── book.schemas.ts
│   │   └── book.service.test.ts
│   ├── loans/
│   │   ├── loan.controller.ts
│   │   ├── loan.service.ts
│   │   ├── loan.repository.ts
│   │   ├── loan.schemas.ts
│   │   └── loan.service.test.ts
│   ├── students/
│   │   ├── student.controller.ts
│   │   ├── student.service.ts
│   │   ├── student.repository.ts
│   │   ├── student.schemas.ts
│   │   └── student.service.test.ts
│   └── audits/
│       ├── audit.service.ts
│       └── audit.repository.ts
├── middleware/
│   ├── auth-jwt.middleware.ts
│   ├── validate.middleware.ts
│   ├── error-handler.middleware.ts
│   └── request-id.middleware.ts
├── shared/
│   ├── errors/
│   ├── types/
│   └── utils/
└── prisma/
    ├── schema.prisma
    ├── migrations/
    └── seed.ts

tests/
├── integration/
│   ├── books.api.test.ts
│   ├── loans.api.test.ts
│   └── search.api.test.ts
└── contract/
    └── openapi.contract.test.ts
```

**Structure Decision**: Single backend service with module-oriented layering to preserve Controller -> Service -> Repository consistency and keep tests close to business logic.

## Phase Plan

### Phase 0 - Research And Decisions

- Define JWT RS256 key strategy (private/public key management and rotation approach).
- Confirm PostgreSQL isolation strategy for borrow/return race conditions.
- Define search strategy (ILIKE + indexes + ISBN normalization).
- Confirm late-fee time semantics (calendar-day policy from clarifications).

### Phase 1 - Design And Contracts

- Finalize Prisma schema for Student, Librarian, Book, Loan, FeePayment, AuditLog.
- Define API contracts for auth, inventory, borrowing, returns, search, and reporting endpoints.
- Define domain error code catalog and mapping to HTTP statuses.
- Define background jobs: overdue recomputation and auto unsuspension checks.

### Phase 2 - Implementation Preparation

- Break down work by user story priority P1 -> P4.
- Create tasks with explicit tests-first steps for service logic.
- Include migration tasks and seed data for realistic scenarios.

## Testing Strategy

- Unit tests (Jest) co-located with service files for all business rules.
- Repository tests for query behavior and soft-delete defaults.
- Integration/API tests (Supertest) for `/api/v1` behavior and error contract.
- Contract tests to ensure response schema and error consistency.

Coverage gates:
- Service layer: >= 80% lines and >= 80% branches (hard gate).
- Changed modules: no coverage regression allowed.

## Risks And Mitigations

- Race conditions on concurrent return/borrow actions:
  - Mitigate with DB transaction + optimistic checks on loan status.
- RS256 key misconfiguration:
  - Mitigate with startup validation and healthcheck exposing key readiness.
- Overdue batch complexity:
  - Mitigate with idempotent daily job and deterministic fee recomputation.
- Search performance degradation:
  - Mitigate with indexes on normalized title/author/isbn.

## Definition Of Done

- All functional requirements FR-001 to FR-020 implemented.
- Clarifications applied (renewal once, manual payment, aggregate availability, first-write return handling).
- All constitution gates pass in CI.
- OpenAPI contract aligns with implementation and tests pass.
