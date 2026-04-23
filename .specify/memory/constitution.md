# Thu Vien Sach Constitution

## Core Principles

### I. Clean Layered Architecture (Controller -> Service -> Repository)
All business features MUST follow the architecture flow `Controller -> Service -> Repository`.
- Controllers handle HTTP concerns only: request parsing, input validation handoff, response shaping.
- Services contain business rules, orchestration, and transaction boundaries.
- Repositories handle data access only and MUST NOT contain business rules.
- Cross-layer shortcuts (for example, controller calling Prisma directly) are prohibited.
- Shared utilities MUST remain framework-agnostic unless they are explicitly transport or persistence helpers.

### II. Security By Default
Security controls are mandatory and non-optional.
- All database access MUST use Prisma or parameterized SQL queries only. String-concatenated SQL is prohibited.
- Hardcoded secrets (API keys, passwords, tokens, connection strings) are prohibited in source code, tests, and scripts.
- Secrets MUST be loaded from environment variables or a secret manager.
- All external input (params, query, body, headers) MUST be validated before business logic execution.
- Validation failures MUST return a structured error response and MUST NOT leak stack traces or sensitive internals.

### III. Test Coverage And Placement
Business logic reliability is enforced through measurable testing requirements.
- Minimum test coverage for business logic (Service layer) is 80% lines and 80% branches.
- Unit tests MUST be co-located with source files (for example, `book.service.ts` with `book.service.test.ts`).
- New or modified business rules MUST include unit tests covering success, validation failure, and edge cases.
- Pull requests failing coverage thresholds MUST NOT be merged.

### IV. Data Integrity And Traceability
All business entity changes must preserve recoverability and auditability.
- All business entities MUST implement soft-delete semantics (for example, `deletedAt` timestamp and optional `deletedBy`).
- Physical deletion is disallowed for business entities in normal application flows.
- Create, update, delete/restore operations MUST write audit log entries.
- Audit entries MUST capture actor, action, entity type, entity id, timestamp, and change summary.
- Read paths MUST exclude soft-deleted records by default unless explicitly requested for admin/audit use cases.

### V. API Consistency Standards
External behavior must remain predictable across all endpoints.
- APIs MUST follow REST conventions and exchange JSON only.
- Success responses MUST use consistent envelope conventions per module.
- Error responses MUST use the exact format: `{ "error_code": string, "message": string }`.
- Error codes MUST be stable, documented, and machine-readable.
- HTTP status codes MUST semantically match the error category.

## Technology Standards

The approved stack for this project is mandatory:
- Runtime/API: Node.js + Express
- Database: PostgreSQL
- ORM/Data Access: Prisma ORM

Implementation constraints:
- Prisma schema MUST model soft-delete and audit requirements for all business entities.
- Migrations MUST be versioned and reviewed.
- Any proposal to replace core stack components requires a constitution amendment.

## Delivery And Quality Gates

Every change MUST satisfy the following before merge:
- Architecture compliance check for `Controller -> Service -> Repository` boundaries.
- Input validation present for every externally reachable endpoint.
- No hardcoded secrets scan passes.
- Unit tests added/updated and coverage thresholds met (>=80% business logic).
- Soft-delete and audit-log behavior verified for each mutation path.
- API error contract verified to return `{ "error_code", "message" }` consistently.

## Governance

This constitution is the highest implementation authority for Thu Vien Sach.
- All pull requests and reviews MUST verify compliance with every principle.
- Violations require either immediate remediation or a documented exception approved by maintainers.
- Exceptions are temporary and MUST include expiration date and follow-up task.
- Amendments require: rationale, impacted principles, migration plan, and approval record.

**Version**: 1.0.0 | **Ratified**: 2026-04-22 | **Last Amended**: 2026-04-22
