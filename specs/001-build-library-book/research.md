# Phase 0 Research: University Library Book Management System

## 1. Authentication Strategy

Decision: JWT RS256 with 15-minute access token TTL.

Rationale:
- RS256 supports asymmetric verification for distributed services.
- Short-lived access token reduces exposure window.
- Compatible with future refresh-token extension.

Implementation notes:
- Sign with `JWT_PRIVATE_KEY` (PEM) and verify with `JWT_PUBLIC_KEY`.
- Claims: `sub`, `role`, `studentId` (if student), `iat`, `exp`, `jti`.
- Token transport: `Authorization: Bearer <token>`.

## 2. Data Access Strategy

Decision: Prisma ORM over PostgreSQL 16 for all data access.

Rationale:
- Parameterized queries by default (constitution compliance).
- Type-safe query surface in TypeScript.
- Migration/versioning built in.

Implementation notes:
- No string-built SQL in repositories.
- Complex reports can use `prisma.$queryRaw` with bound parameters only.

## 3. Concurrency And Transaction Boundaries

Decision: Use database transactions around borrow/return/lost-book flows.

Rationale:
- Prevent stale availability checks.
- Guarantee consistency between Loan, Book, Student, and AuditLog writes.

Implementation notes:
- Borrow flow uses transaction with re-check of active loan count and availability.
- Return flow validates status (`ACTIVE|OVERDUE`) before mutation.
- Concurrent return behavior: first write succeeds, second returns conflict error.

## 4. Search Behavior

Decision: Support title/author partial case-insensitive search; ISBN exact normalized search.

Rationale:
- Meets user requirement and edge-case clarity.
- Keeps query design simple and performant.

Implementation notes:
- Normalize ISBN by stripping hyphens/spaces before persistence and querying.
- Add DB indexes for `isbnNormalized`, `titleNormalized`, `authorNormalized`.

## 5. Fee And Overdue Computation

Decision: Calendar-day late fee with cap.

Formula:
- `fee = min(overdueDays * 5000, 500000)`
- `overdueDays = max(0, dateOnly(returnedAt or today) - dateOnly(dueDate))`

Rationale:
- Consistent with approved clarifications and simple user communication.

Implementation notes:
- Daily batch recomputes current overdue fees for active overdue loans.
- Final fee is frozen at return time.

## 6. Validation Framework

Decision: Zod schema validation at controller boundary.

Rationale:
- Typed validation output and reusable schemas per route.
- Keeps controllers thin and services focused on business rules.

Implementation notes:
- Parse path/query/body separately.
- On failure return `400` with `{ "error_code": "VALIDATION_ERROR", "message": "..." }`.

## 7. Logging And Audit

Decision: Structured app logs (pino) plus immutable audit records in DB.

Rationale:
- Operational observability + business traceability.
- Supports 7-year retention requirement.

Implementation notes:
- Audit writes bundled in same transaction as mutation.
- Audit payload captures actor/action/entity/summary/timestamp.

## 8. Testing Approach

Decision: Jest for unit tests and Supertest for API integration tests.

Rationale:
- Fits Node + Express ecosystem.
- Enables both fast business-rule tests and HTTP contract checks.

Implementation notes:
- Service tests co-located with source files.
- Integration tests under `tests/integration` using test database.
- Coverage gate enforces service-layer thresholds.
