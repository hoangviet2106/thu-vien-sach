# Tasks: University Library Book Management System

**Input**: Design documents from `/specs/001-build-library-book/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/openapi.yaml

**Tests**: Testing is required by constitution and plan. Service-layer coverage must remain >= 80% lines and >= 80% branches.

**Organization**: Tasks are grouped by user story so each story remains independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no hard dependency)
- **[Story]**: `US1`, `US2`, `US3`, `US4`, or `FOUNDATION`
- All tasks include concrete file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Node.js + Express + TypeScript + Prisma + Jest/Supertest foundations.

- [ ] T001 [FOUNDATION] Initialize project dependencies in `package.json` (express, prisma, @prisma/client, zod, jsonwebtoken, jest, supertest, ts-jest, typescript).
- [ ] T002 [FOUNDATION] Add TypeScript config in `tsconfig.json` and Jest config in `jest.config.ts`.
- [ ] T003 [P] [FOUNDATION] Add scripts for dev/test/coverage/prisma in `package.json`.
- [ ] T004 [P] [FOUNDATION] Create environment validation in `src/config/env.ts` including `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_ACCESS_TTL=15m`, `DATABASE_URL`.
- [ ] T005 [P] [FOUNDATION] Create app bootstrap in `src/app.ts` and server entry in `src/server.ts` with `/api/v1` prefix.
- [ ] T006 [P] [FOUNDATION] Add base middleware skeletons in `src/middleware/error-handler.middleware.ts`, `src/middleware/validate.middleware.ts`, `src/middleware/request-id.middleware.ts`.
- [ ] T007 [FOUNDATION] Add Prisma baseline files in `prisma/schema.prisma` and `prisma/seed.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core architecture, auth, data integrity, and shared cross-cutting behavior.

**CRITICAL**: No user-story completion before this phase is done.

- [ ] T008 [FOUNDATION] Define core enums/models in `prisma/schema.prisma`: `User`, `StudentProfile`, `Book`, `Loan`, `FeePayment`, `AuditLog` with `deletedAt` soft-delete fields.
- [ ] T009 [FOUNDATION] Create initial migration in `prisma/migrations/*` and validate generated client.
- [ ] T010 [P] [FOUNDATION] Implement shared error types and stable error codes in `src/shared/errors/`.
- [ ] T011 [P] [FOUNDATION] Implement JWT RS256 middleware in `src/middleware/auth-jwt.middleware.ts` (15-minute access token verification).
- [ ] T012 [P] [FOUNDATION] Implement auth module (`Controller -> Service -> Repository`) in `src/modules/auth/` for login/token issuance.
- [ ] T013 [P] [FOUNDATION] Implement audit write service/repository in `src/modules/audits/` and wire to mutation flows.
- [ ] T014 [FOUNDATION] Implement global error response contract `{ "error_code", "message" }` in `src/middleware/error-handler.middleware.ts`.
- [ ] T015 [FOUNDATION] Register versioned routers under `/api/v1` in `src/app.ts`.
- [ ] T016 [FOUNDATION] Add base integration test harness in `tests/integration/test-app.ts`.
- [ ] T017 [FOUNDATION] Add CI coverage gate configuration for service layer in `jest.config.ts`.

**Checkpoint**: Foundation complete, user stories can proceed independently.

---

## Phase 3: User Story 1 - Borrow And Return Books (Priority: P1) 🎯 MVP

**Goal**: Students can borrow/return books with enforced limits, due dates, and fee computation.

**Independent Test**: Student borrows eligible book, blocked at 6th active loan, returns on-time/overdue with correct fee and state transitions.

### Tests for User Story 1 (write first)

- [ ] T018 [P] [US1] Add service tests for borrow rules in `src/modules/loans/loan.service.test.ts` (eligibility, max-5 rule, unavailable book).
- [ ] T019 [P] [US1] Add service tests for return rules in `src/modules/loans/loan.service.test.ts` (on-time fee 0, overdue fee formula, cap 500,000).
- [ ] T020 [P] [US1] Add service tests for renewal rule in `src/modules/loans/loan.service.test.ts` (allow once, block second renewal).
- [ ] T021 [P] [US1] Add API integration tests in `tests/integration/loans.api.test.ts` for borrow, return, renewal, and duplicate return conflict.

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement loan validation schemas in `src/modules/loans/loan.schemas.ts`.
- [ ] T023 [P] [US1] Implement loan repository methods in `src/modules/loans/loan.repository.ts` (active counts, transactional updates, status checks).
- [ ] T024 [US1] Implement borrow/return/renew business logic in `src/modules/loans/loan.service.ts`.
- [ ] T025 [US1] Implement loan endpoints in `src/modules/loans/loan.controller.ts`: `POST /loans`, `POST /loans/{loanId}/return`, `POST /loans/{loanId}/renew`.
- [ ] T026 [US1] Wire loan routes in `src/modules/loans/loan.routes.ts` and register in `src/app.ts`.
- [ ] T027 [US1] Add audit writes for borrow/return/renew/lost mutations in `src/modules/loans/loan.service.ts`.
- [ ] T028 [US1] Enforce concurrent-return guard with conflict error in `src/modules/loans/loan.service.ts`.

**Checkpoint**: US1 is independently functional and testable (MVP).

---

## Phase 4: User Story 2 - Manage Library Inventory (Priority: P2)

**Goal**: Librarians can add/update/soft-delete books with rule enforcement.

**Independent Test**: Librarian CRUD operations succeed except deletion blocked when active loans exist; duplicate ISBN rejected.

### Tests for User Story 2 (write first)

- [ ] T029 [P] [US2] Add service tests for create/update/delete constraints in `src/modules/books/book.service.test.ts`.
- [ ] T030 [P] [US2] Add API integration tests in `tests/integration/books.api.test.ts` for librarian-only access and blocked delete.

### Implementation for User Story 2

- [ ] T031 [P] [US2] Implement book request schemas in `src/modules/books/book.schemas.ts` (ISBN normalization, copies validation).
- [ ] T032 [P] [US2] Implement book repository in `src/modules/books/book.repository.ts` with soft-delete defaults.
- [ ] T033 [US2] Implement inventory rules in `src/modules/books/book.service.ts` (duplicate ISBN, active-loan deletion guard, copy update constraints).
- [ ] T034 [US2] Implement inventory endpoints in `src/modules/books/book.controller.ts`: `POST /books`, `PATCH /books/{bookId}`, `DELETE /books/{bookId}`.
- [ ] T035 [US2] Wire book routes in `src/modules/books/book.routes.ts` and register in `src/app.ts`.
- [ ] T036 [US2] Add audit writes for add/update/delete in `src/modules/books/book.service.ts`.

**Checkpoint**: US2 independently functional and testable.

---

## Phase 5: User Story 3 - Search And Discover Books (Priority: P3)

**Goal**: Students can search by title, author, ISBN with availability counts.

**Independent Test**: Search returns correct records for each mode and normalized ISBN queries.

### Tests for User Story 3 (write first)

- [ ] T037 [P] [US3] Add service tests in `src/modules/books/book.service.test.ts` for title/author partial search and ISBN exact normalized search.
- [ ] T038 [P] [US3] Add API integration tests in `tests/integration/search.api.test.ts` for `/books?q=` behavior and pagination.

### Implementation for User Story 3

- [ ] T039 [P] [US3] Add searchable indexes and normalized fields in `prisma/schema.prisma` and migration.
- [ ] T040 [P] [US3] Implement search query methods in `src/modules/books/book.repository.ts`.
- [ ] T041 [US3] Implement search orchestration and availability aggregation in `src/modules/books/book.service.ts`.
- [ ] T042 [US3] Implement list/search endpoint in `src/modules/books/book.controller.ts`: `GET /books`.

**Checkpoint**: US3 independently functional and testable.

---

## Phase 6: User Story 4 - Overdue Monitoring And Fee Transparency (Priority: P4)

**Goal**: System tracks overdue states, recalculates fees daily, and exposes transparent fee data.

**Independent Test**: Overdue loans are marked, daily fee recomputation works with cap, student/librarian can view overdue and fee details.

### Tests for User Story 4 (write first)

- [ ] T043 [P] [US4] Add service tests in `src/modules/loans/loan.service.test.ts` for overdue transition and daily recomputation idempotency.
- [ ] T044 [P] [US4] Add service tests in `src/modules/students/student.service.test.ts` for suspension and auto-recovery rules.
- [ ] T045 [P] [US4] Add API integration tests in `tests/integration/loans.api.test.ts` and `tests/integration/students.api.test.ts` for overdue visibility.

### Implementation for User Story 4

- [ ] T046 [P] [US4] Implement overdue batch job service in `src/modules/loans/loan-overdue.job.ts`.
- [ ] T047 [P] [US4] Implement student fee/suspension repository methods in `src/modules/students/student.repository.ts`.
- [ ] T048 [US4] Implement suspension and auto-recovery logic in `src/modules/students/student.service.ts`.
- [ ] T049 [US4] Implement student loan visibility endpoint in `src/modules/students/student.controller.ts`: `GET /students/me/loans`.
- [ ] T050 [US4] Implement librarian overdue report endpoint in `src/modules/loans/loan.controller.ts`: `GET /loans/overdue`.
- [ ] T051 [US4] Add manual fee payment endpoint (librarian) in `src/modules/students/student.controller.ts` and service/repository methods.
- [ ] T052 [US4] Add audit writes for overdue recalculation, payment, suspension, and auto-recovery.

**Checkpoint**: US4 independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Hardening across all stories before implementation handoff.

- [ ] T053 [P] [FOUNDATION] Align endpoint/response schemas with `specs/001-build-library-book/contracts/openapi.yaml`.
- [ ] T054 [P] [FOUNDATION] Add/finish contract tests in `tests/contract/openapi.contract.test.ts`.
- [ ] T055 [FOUNDATION] Validate quickstart flow in `specs/001-build-library-book/quickstart.md` against actual scripts and commands.
- [ ] T056 [FOUNDATION] Enforce role-based authorization checks across controllers.
- [ ] T057 [FOUNDATION] Add structured request logging + correlation IDs in middleware and logger config.
- [ ] T058 [FOUNDATION] Final coverage run and gap closure for service modules.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 -> no dependencies.
- Phase 2 -> depends on Phase 1 and blocks all user stories.
- Phase 3 (US1) -> starts after Phase 2; recommended first delivery (MVP).
- Phase 4 (US2), Phase 5 (US3), Phase 6 (US4) -> can proceed after Phase 2; may run in parallel if staffed.
- Phase 7 -> depends on completion of intended user stories.

### User Story Dependencies

- **US1 (P1)**: depends only on Foundation.
- **US2 (P2)**: depends on Foundation; independent from US1 but integrates with loans constraints.
- **US3 (P3)**: depends on Foundation and book model from US2.
- **US4 (P4)**: depends on US1 loan lifecycle and student module foundation.

### Parallel Opportunities

- `[P]` tasks within each phase are safe to execute concurrently.
- Test-writing tasks for a story can run in parallel before implementation tasks.
- Repository/schema tasks in separate modules can run in parallel if migration conflicts are managed.

---

## Implementation Strategy

### MVP First

1. Complete Phases 1-2.
2. Complete US1 (Phase 3) and validate independently.
3. Demo borrow/return/renew flow with fee and conflict behavior.

### Incremental Delivery

1. US2 inventory management.
2. US3 search/discovery.
3. US4 overdue monitoring + transparency + manual fee payment.
4. Phase 7 hardening and coverage closure.

### Team Parallel Strategy

- Developer A: US1 + loan job paths.
- Developer B: US2 + US3 book module.
- Developer C: US4 student/overdue/reporting.
- Shared owner: Foundation + contract/CI consistency.

---

## Notes

- All endpoints must return JSON and follow the error contract.
- All mutation paths must write audit logs.
- Soft-delete defaults must be enforced by repositories.
- Use only Prisma/parameterized access patterns; no string SQL concatenation.
