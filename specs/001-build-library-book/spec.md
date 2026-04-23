# Feature Specification: University Library Book Management System

**Feature Branch**: `001-build-library-book`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "Build a library book management system for a university with 5000 students. Core features: borrow/return, inventory management, overdue tracking and late fees, borrow limits, 14-day loan period, and search by title/author/ISBN."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Borrow And Return Books (Priority: P1)

As a student, I can borrow available books and return them so I can access course materials while the library can enforce fair circulation rules.

**Why this priority**: Borrow/return circulation is the core mission of a university library. Without it, the system does not deliver primary user value.

**Independent Test**: Can be fully tested by creating a student account with active status, borrowing eligible books up to policy limits, and returning books with and without overdue status.

**Acceptance Scenarios**:

1. **Given** a student has fewer than 5 active loans and a book is available, **When** the student borrows the book, **Then** the system creates a loan with a due date 14 calendar days from checkout and marks the copy unavailable.
2. **Given** a student already has 5 active loans, **When** the student attempts to borrow another book, **Then** the system rejects the request with a clear policy message.
3. **Given** a student has an active loan, **When** the student returns the book on or before the due date, **Then** the system closes the loan, records zero late fee, and marks the copy available.
4. **Given** a student has an active loan past due date, **When** the student returns the book, **Then** the system calculates a late fee at 5,000 VND per overdue day capped at 500,000 VND and records the fee on the closed loan.

---

### User Story 2 - Manage Library Inventory (Priority: P2)

As a librarian, I can add, update, and remove books from inventory so the catalog reflects actual holdings and circulation remains accurate.

**Why this priority**: Accurate inventory is essential for reliable borrowing and search outcomes. It directly affects whether students can find and borrow needed materials.

**Independent Test**: Can be fully tested by librarian-only flows for create/update/remove inventory records and confirming visibility changes in circulation and search.

**Acceptance Scenarios**:

1. **Given** a librarian is managing inventory, **When** they add a new book with required bibliographic data and copy count, **Then** the book becomes searchable and available for borrowing.
2. **Given** a librarian updates a book's metadata (title, author, ISBN, copies), **When** the update is saved, **Then** subsequent search and availability results reflect the updated data.
3. **Given** a book has no active loans, **When** a librarian removes it from inventory, **Then** the system prevents new loans and excludes it from default search results.
4. **Given** a book has one or more active loans, **When** a librarian attempts to remove it, **Then** the system rejects removal and explains that active circulation must be resolved first.

---

### User Story 3 - Search And Discover Books (Priority: P3)

As a student, I can search books by title, author, or ISBN so I can quickly locate relevant learning resources.

**Why this priority**: Discovery is a high-frequency action that drives borrow conversions, but core circulation can still function without advanced search in the earliest MVP.

**Independent Test**: Can be fully tested by loading mixed catalog data and validating search results independently for title, author, and ISBN inputs.

**Acceptance Scenarios**:

1. **Given** a catalog with multiple books, **When** a user searches by title keywords, **Then** matching titles are returned with current availability indicators.
2. **Given** a catalog with multiple authors, **When** a user searches by author name, **Then** books by that author are returned regardless of exact capitalization.
3. **Given** a user provides an ISBN, **When** the ISBN exists in catalog, **Then** the exact matching book record is returned.

---

### User Story 4 - Overdue Monitoring And Fee Transparency (Priority: P4)

As library staff and students, we can identify overdue loans and see fee calculations so policies are enforceable, transparent, and fair.

**Why this priority**: Operational oversight and fee transparency reduce disputes, improve return compliance, and protect inventory turnover.

**Independent Test**: Can be fully tested by creating loans with varied due dates, advancing date context, and validating overdue status and fee amounts.

**Acceptance Scenarios**:

1. **Given** an active loan with due date passed, **When** the system evaluates loan status, **Then** the loan is marked overdue.
2. **Given** an overdue loan, **When** fee is computed, **Then** fee equals overdue days x 5,000 VND and never exceeds 500,000 VND.
3. **Given** a student views their active and past loans, **When** overdue loans exist, **Then** each overdue loan displays overdue days and current fee amount.

---

### Edge Cases

- Student attempts to borrow exactly the 6th active book.
- Student returns a book exactly on the due date (no fee should apply).
- Overdue fee reaches cap after long delay; additional days do not increase fee beyond 500,000 VND.
- Attempt to borrow a book with zero available copies.
- ISBN search input includes separators/spaces (for example, `978-...`) while catalog stores normalized form.
- Librarian attempts to remove an inventory record that still has active loans.
- Duplicate ISBN is submitted during book creation.
- A returned book is processed twice by mistake.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST maintain student records that support a university population of at least 5,000 students.
- **FR-002**: System MUST allow eligible students to borrow available books.
- **FR-003**: System MUST prevent a student from having more than 5 active borrowed books at any time.
- **FR-004**: System MUST assign a due date exactly 14 calendar days after each borrow transaction.
- **FR-005**: System MUST allow students to return borrowed books and close the corresponding active loan.
- **FR-006**: System MUST mark loans as overdue when current date is later than due date and book not yet returned.
- **FR-007**: System MUST compute late fees at 5,000 VND per overdue day.
- **FR-008**: System MUST cap total late fee per loan at 500,000 VND.
- **FR-009**: System MUST persist fee calculation basis (overdue days and applied cap) for each completed late return.
- **FR-010**: System MUST provide librarian capabilities to add new books to inventory.
- **FR-011**: System MUST provide librarian capabilities to update existing book metadata and copy counts.
- **FR-012**: System MUST provide librarian capabilities to remove books from active inventory only when there are no active loans.
- **FR-013**: System MUST support book search by title.
- **FR-014**: System MUST support book search by author.
- **FR-015**: System MUST support book search by ISBN.
- **FR-016**: System MUST show current availability state in search and detail views.
- **FR-017**: System MUST record borrow and return transaction history per student and per book.
- **FR-018**: System MUST provide overdue visibility for librarians to identify outstanding returns.
- **FR-019**: System MUST provide students visibility into their active loans, due dates, overdue status, and applicable fees.
- **FR-020**: System MUST reject invalid circulation actions with clear, user-facing reason messages (for example, limit reached, unavailable copy, or missing active loan).

### Key Entities *(include if feature involves data)*

- **Student**: Represents a university borrower; key attributes include student identifier, active status, and current active loan count.
- **Librarian**: Represents authorized staff who manage inventory.
- **Book**: Represents a bibliographic title; key attributes include title, author, ISBN, and catalog status.
- **Book Copy/Inventory Item**: Represents loanable availability for a book title, including total copies and currently available copies.
- **Loan Transaction**: Represents a borrow-return lifecycle for one student and one copy/title, including borrow date, due date, return date, and status.
- **Late Fee Record**: Represents computed penalty details for overdue returns, including overdue days, daily rate, cap applied, and total fee.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 100% of borrow transactions enforce both policy constraints: maximum 5 active books per student and 14-day due date assignment.
- **SC-002**: 100% of overdue return transactions produce late fees using the rule `min(overdue_days x 5,000 VND, 500,000 VND)`.
- **SC-003**: In acceptance testing, at least 95% of search attempts by title, author, or ISBN return correct matching records for seeded catalog data.
- **SC-004**: Librarian inventory operations (add/update/remove) succeed with correct rule enforcement in at least 99% of test scenarios, including blocked removals for actively borrowed books.
- **SC-005**: During pilot operation, at least 90% of students complete borrow or return actions without staff intervention.

## Assumptions

- Students and librarians are already identifiable in institutional records; identity provisioning details are out of scope for this feature spec.
- Currency formatting and payment collection workflow for late fees are out of scope; this spec covers fee calculation and tracking only.
- Reservation/waitlist and inter-library loan are out of scope for this version.
- One-time loan renewal (14 additional days) is in scope per clarification decisions.
- University policy defines a fixed loan period of 14 days and fixed fee policy of 5,000 VND/day capped at 500,000 VND.
- The system is expected to serve at least 5,000 students, but detailed non-functional performance targets will be specified separately.
