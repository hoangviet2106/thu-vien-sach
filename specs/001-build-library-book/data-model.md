# Phase 1 Data Model: University Library Book Management System

## Conventions

- IDs: UUID (database generated)
- Timestamps: UTC
- Soft-delete: `deletedAt` nullable timestamp (all business entities)
- Money: integer VND (avoid floating point)

## Enumerations

- `UserRole`: `STUDENT`, `LIBRARIAN`, `ADMIN`
- `AccountStatus`: `ACTIVE`, `SUSPENDED`, `INACTIVE`
- `LoanStatus`: `ACTIVE`, `OVERDUE`, `RETURNED`, `LOST`, `RENEWED`
- `AuditAction`: `CREATE`, `UPDATE`, `SOFT_DELETE`, `RESTORE`, `BORROW`, `RETURN`, `MARK_LOST`, `PAY_FEE`, `AUTO_RECOVER`

## Entity: User

Purpose: Auth principal and profile holder for student/librarian/admin roles.

Fields:
- `id`: UUID (PK)
- `email`: string unique
- `passwordHash`: string (nullable if external IdP later)
- `role`: UserRole
- `fullName`: string
- `createdAt`, `updatedAt`, `deletedAt`

Constraints:
- Unique email among non-deleted records.

## Entity: StudentProfile

Purpose: Student-specific borrowing and fee state.

Fields:
- `id`: UUID (PK)
- `userId`: UUID (FK -> User.id, unique)
- `studentCode`: string unique
- `accountStatus`: AccountStatus
- `totalOutstandingFeeVnd`: int default 0
- `createdAt`, `updatedAt`, `deletedAt`

Derived checks:
- `activeLoanCount` derived from Loan status in (`ACTIVE`, `OVERDUE`).

## Entity: Book

Purpose: Catalog title with aggregate copy counts.

Fields:
- `id`: UUID (PK)
- `isbn`: string unique (normalized digits only)
- `title`: string
- `author`: string
- `category`: string nullable
- `publishYear`: int nullable
- `totalCopies`: int
- `createdAt`, `updatedAt`, `deletedAt`

Derived fields:
- `availableCopies = totalCopies - activeLoansForBook`

Constraints:
- `totalCopies >= 1`
- Cannot soft-delete when active loans exist.

## Entity: Loan

Purpose: Borrow lifecycle record.

Fields:
- `id`: UUID (PK)
- `studentId`: UUID (FK -> StudentProfile.id)
- `bookId`: UUID (FK -> Book.id)
- `borrowedAt`: date
- `dueAt`: date
- `returnedAt`: date nullable
- `status`: LoanStatus
- `renewalCount`: int default 0
- `renewedFromLoanId`: UUID nullable (self FK)
- `finalLateFeeVnd`: int default 0
- `createdAt`, `updatedAt`, `deletedAt`

Constraints:
- `dueAt = borrowedAt + 14 days` at creation.
- `renewalCount <= 1`.
- Return allowed only when status in (`ACTIVE`, `OVERDUE`).

## Entity: FeePayment

Purpose: Record manual fee payments entered by librarian.

Fields:
- `id`: UUID (PK)
- `studentId`: UUID (FK -> StudentProfile.id)
- `recordedByUserId`: UUID (FK -> User.id)
- `amountVnd`: int (>0)
- `note`: string nullable
- `paidAt`: timestamp
- `createdAt`, `updatedAt`, `deletedAt`

Constraints:
- Payment cannot make outstanding fee negative.

## Entity: AuditLog

Purpose: Immutable mutation trace for all business writes.

Fields:
- `id`: UUID (PK)
- `actorUserId`: UUID nullable (system actor for scheduled jobs)
- `action`: AuditAction
- `entityType`: string
- `entityId`: UUID/string
- `changeSummary`: JSON
- `ipAddress`: string nullable
- `createdAt`: timestamp

Constraints:
- No update/delete operations through app path.

## Indexing Strategy

- Book: unique `isbn`, index `title`, index `author`, index `deletedAt`
- Loan: composite index `(studentId, status)`, `(bookId, status)`, `(dueAt, status)`
- StudentProfile: unique `studentCode`, index `accountStatus`
- AuditLog: `(entityType, entityId)`, `(createdAt)`, `(actorUserId)`

## Key Business Invariants

- Student can have at most 5 active/overdue loans.
- Loan period is fixed 14 calendar days.
- Late fee formula capped at 500,000 VND per loan.
- Borrow blocked when student suspended.
- All mutations generate audit records.
- Soft-deleted entities excluded by default queries.
