const DAILY_FEE = 5000;
const MAX_FEE = 500000;

export function calculateLateFeeVnd(dueAt: Date, returnedAt: Date): number {
    const dueDateOnly = new Date(Date.UTC(dueAt.getUTCFullYear(), dueAt.getUTCMonth(), dueAt.getUTCDate()));
    const returnDateOnly = new Date(Date.UTC(returnedAt.getUTCFullYear(), returnedAt.getUTCMonth(), returnedAt.getUTCDate()));
    const daysOverdue = Math.max(0, Math.floor((returnDateOnly.getTime() - dueDateOnly.getTime()) / (24 * 60 * 60 * 1000)));
    return Math.min(daysOverdue * DAILY_FEE, MAX_FEE);
}
