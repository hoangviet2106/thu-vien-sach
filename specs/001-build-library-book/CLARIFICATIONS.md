# Specification Clarifications & Amendments
**Feature**: University Library Book Management System  
**Date**: April 22, 2026  
**Status**: Approved by stakeholders

These clarifications resolve ambiguities in the initial specification and provide implementation guidance.

---

## 1. Late Fee Calculation - Day Rounding

**Decision**: Charge by calendar day (day-based, not hourly)

**Rule**:
- Due date = Day 14 (borrow date + 14 days)
- Day 14: Return anytime = **0 fee** ✅
- Day 15: Return anytime (even 00:01 AM) = **5,000 VND** (1 day overdue)
- Day 16: Return anytime = **10,000 VND** (2 days overdue)
- Day 115+: Return anytime = **500,000 VND** (capped at day 100)

**Implementation**:
```
lateFeeAmount = min((returnDate - dueDate) × 5000, 500000)

Example:
  borrowDate = 2026-04-22
  dueDate = 2026-05-06 (14 days later)
  
  Scenario A: Return on 2026-05-06 → lateFeeAmount = 0
  Scenario B: Return on 2026-05-07 → lateFeeAmount = 5,000 (1 day overdue)
  Scenario C: Return on 2026-07-15 → lateFeeAmount = 500,000 (70 days × 5,000 = 350,000 VND, but capped)
```

**Why this approach**: Simpler than hourly calculation, fair to students (no charge if returned same day), easier to communicate to users.

---

## 2. Late Fee Payment

**Decision**: Manual payment only (Phase 1)

**Process**:
1. Student accumulates late fees in system (totalFees field updated)
2. Student visits library or contacts librarian
3. Librarian records payment in system:
   - Mark partial or full fee as paid
   - Update Student.totalFees
   - Create payment record for audit trail
4. Account suspension lifted if all fees paid

**Scope Clarification**:
- ❌ No online payment gateway integration (Phase 1)
- ❌ No automatic payment system
- ❌ No payment history tracking (just final amounts)

**Why this approach**: Reduces Phase 1 complexity, aligns with university accounting systems (likely have centralized payment processing), can add online payments in Phase 2.

---

## 3. Book Renewal

**Decision**: Allow exactly ONE renewal per borrow, extending 14 days if eligible

**Renewal Eligibility**:
- Borrow must NOT be overdue (dueDate >= today)
- No other student is waiting for this book (no reservation queue yet)
- Student has fewer than 5 active borrows after renewal
- Student account status = ACTIVE

**Renewal Process**:
1. Student initiates renewal (via web interface or librarian)
2. System checks eligibility
3. If eligible:
   - Create new Borrow record with extended dueDate (+ 14 days)
   - Mark original borrow as RENEWED
   - (Original borrow no longer counted as active)
4. If ineligible:
   - Return error with reason (e.g., "Book is overdue")

**Data Model Addition**:
```
Borrow.renewalCount = 0 or 1 (prevents 2+ renewals)
Borrow.renewedFromBorrowId = (links to original if this is renewal)
```

**Why this approach**: Balances student needs with fair access for others, prevents indefinite hoarding, simple implementation.

---

## 4. Same Book - Multiple Copies

**Decision**: Yes, student can borrow multiple copies of the SAME TITLE, counts toward 5-book limit

**Example**:
- Student borrows "1984" (Copy A) - Borrow #1
- Student borrows "1984" (Copy B) - Borrow #2
- Both count toward 5-book limit
- If student borrows 3 more different books, limit reached (5 total)

**Data Model Constraint**:
```sql
-- Prevent infinite borrowing of same title
SELECT COUNT(*) FROM Borrow 
WHERE studentId = ? 
  AND status IN ('ACTIVE', 'RENEWED')
-- Must be < 5 (includes all titles, same or different)
```

**Why this approach**: Allows students to borrow multiple copies if genuinely needed (e.g., study group with one text), but limit still enforced.

---

## 5. Lost Book Fee

**Decision**: Charge maximum late fee (500,000 VND)

**Process**:
1. Student and librarian confirm book is lost
2. Librarian marks Borrow record as LOST
3. System automatically applies:
   - lateFeeAmount = 500,000 VND
   - Status = LOST
4. Book inventory adjusted:
   - Decrement availableCopies (one less copy available)
   - Optionally flag for replacement order
5. Student.totalFees += 500,000 VND
6. If totalFees > 500,000 → Account suspended

**Scope Limitation**: 
- ❌ No replacement cost tracking (future enhancement)
- ❌ No insurance claims workflow
- ❌ Fixed 500,000 VND regardless of book value

**Why this approach**: Simplicity (no need to maintain replacement cost per book), aligns with late fee cap (reasonable maximum), forces students to be more careful.

---

## 6. Account Suspension - Auto-Recovery

**Decision**: Automatic recovery when conditions are met (no manual intervention needed)

**Recovery Triggers** (any one):
1. All late fees paid (Student.totalFees = 0)
2. All overdue books returned (no ACTIVE borrows with dueDate < today)

**Implementation**:
- Batch job runs daily to check suspension criteria
- If both trigger conditions met → Status changes from SUSPENDED to ACTIVE
- Create audit log: "Account auto-recovered by system at HH:MM:SS"

**Code Example**:
```typescript
// Daily batch process
const suspendedStudents = await db.student.findMany({
  where: { accountStatus: 'SUSPENDED' }
});

for (const student of suspendedStudents) {
  const hasOutstandingFees = student.totalFees > 0;
  const hasOverdueBooks = await checkOverdueBooks(student.id);
  
  if (!hasOutstandingFees && !hasOverdueBooks) {
    await db.student.update({
      where: { id: student.id },
      data: { accountStatus: 'ACTIVE' }
    });
    
    // Log recovery
    await createAuditLog({
      action: 'ACCOUNT_RECOVERED',
      entityType: 'Student',
      entityId: student.id
    });
  }
}
```

**Why this approach**: Rewards compliance automatically, reduces support burden on librarians, transparent criteria for students.

---

## 7. Audit Log Retention

**Decision**: 7 years retention (regulatory requirement)

**Audit Log Scope**:
All mutations must be logged:
- Book added/updated/deleted (soft delete)
- Book marked lost/damaged
- Borrow created
- Borrow returned
- Renewal created
- Account suspended/activated
- Manual overrides (if any)
- Fee payments recorded

**Data Structure**:
```
AuditLog {
  id: UUID
  timestamp: DateTime
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RETURN' | 'RENEW' | 'PAYMENT' | ...
  entityType: 'Book' | 'Student' | 'Borrow' | ...
  entityId: String
  userId: String (who performed action)
  oldValues: JSON (before state)
  newValues: JSON (after state)
  ipAddress: String
  notes: String (optional explanation)
}
```

**Retention Policy**:
- Keep in hot database: 2 years (quick queries)
- Archive to cold storage: 2-7 years
- Delete after 7 years

**Why this approach**: Standard library retention period, compliance with financial regulations (refund disputes, reconciliation), enables dispute resolution.

---

## 8. Notifications & Alerts (Phase 1 - Core System Only)

**Decision**: Phase 1 does NOT include email/SMS notifications, but system is designed for Phase 2

**What Phase 1 DOES**:
- ✅ Track overdue books (data model ready)
- ✅ Calculate fees correctly
- ✅ Generate daily overdue reports for librarian
- ✅ Flag suspended accounts
- ✅ API endpoints available for future notification service

**What Phase 1 DOES NOT**:
- ❌ Send email "Book is due in 3 days"
- ❌ Send SMS "You're overdue, fine is 50,000 VND"
- ❌ Schedule notifications
- ❌ Track notification delivery

**Future Phase 2 - Notification System**:
```
Will trigger when:
- Book due in 3 days
- Book overdue 1 day
- Account suspended
- Late fees > 100,000 VND

Channels:
- Email (preferred)
- SMS (backup)
- In-app notifications (future)
```

**Why this approach**: Reduces Phase 1 scope (no email provider setup, no template management), allows focusing on core business logic, enables Phase 2 as standalone feature.

---

## 9. Concurrent Return Handling

**Decision**: Last-write-wins prevented; first return accepted, second fails with clear error

**Scenario**:
- Student initiates return at 09:00:01
- Librarian initiates return at 09:00:02 (same borrow)

**System Behavior**:
1. First request (09:00:01) processes:
   - Borrow.returnDate = 2026-04-22
   - Borrow.status = RETURNED
   - Borrow.lateFeeAmount calculated
   - Response: "Book returned successfully"
2. Second request (09:00:02) attempts same:
   - Query finds: Borrow.status = RETURNED (not ACTIVE)
   - System rejects with: "This book is already returned. Check if another copy needs processing."
   - Response: 409 Conflict

**Implementation**:
```typescript
const borrow = await db.borrow.findUnique({
  where: { id: borrowId }
});

if (borrow.status !== 'ACTIVE' && borrow.status !== 'OVERDUE') {
  throw new ConflictError('Borrow already processed as ' + borrow.status);
}

// Safe to update
await db.borrow.update({ ... });
```

**Why this approach**: Prevents duplicate returns (data integrity), clear error for user (know what went wrong), no silent failures.

---

## 10. Book Availability Display

**Decision**: Aggregate count only ("2 of 5 copies available"), no individual copy tracking

**Display Format**:
```
Book Title: 1984
Author: George Orwell
Available: 2 of 5 copies

Borrow Button (enabled)
```

**Data Model**:
```
Book {
  totalCopies: 5
  availableCopies: 2  // Calculated from (totalCopies - active borrows)
}

// Calculated value, not stored:
availableCopies = totalCopies - COUNT(
  SELECT * FROM Borrow 
  WHERE bookId = ? 
    AND status IN ('ACTIVE', 'OVERDUE')
    AND returnDate IS NULL
)
```

**Future Enhancement (Phase 2+)**:
- Individual copy tracking: "Copy A: Available, Copy B: In transit"
- Physical location tracking
- Copy condition tracking

**Why this approach**: Simpler implementation, fast calculation, sufficient for Phase 1, can add detail later without breaking API.

---

## 11. Summary of Decisions

| Item | Decision | Impact |
|------|----------|--------|
| Fee rounding | Day-based | Easy to calculate, fair to students |
| Fee payment | Manual only | Reduces Phase 1 scope |
| Renewal | 1x per borrow | Prevents hoarding, simple rule |
| Same-title copies | Allowed, count to limit | Fair access maintained |
| Lost book fee | Fixed 500k VND | No need for replacement cost tracking |
| Account recovery | Automatic | Better UX, less support burden |
| Audit retention | 7 years | Regulatory compliance |
| Notifications | Phase 2 | Reduces Phase 1 scope |
| Concurrent returns | First wins, second fails | Data integrity protected |
| Availability display | Aggregate only | Simpler, sufficient for MVP |

---

## 12. Implementation Checklist

- [ ] Borrow entity includes `renewalCount` field (max 1)
- [ ] Borrow entity includes `renewedFromBorrowId` link
- [ ] Return calculation: `min((returnDate - dueDate) × 5000, 500000)`
- [ ] Daily batch job recalculates fees and checks suspensions
- [ ] Audit logs captured for all mutations (2+ years in DB, archive after)
- [ ] Account auto-recovery triggers daily
- [ ] Concurrent return check prevents duplicates (409 Conflict error)
- [ ] Availability = totalCopies - active borrows (calculated, not stored)
- [ ] API ready for Phase 2 notification service (overdue data exposed)
- [ ] Manual payment workflow documented for librarians

---

## Document Control

- **Version**: 1.0
- **Approved**: Yes
- **Date**: 2026-04-22
- **Next Review**: After Phase 1 implementation (2026-06-22)
