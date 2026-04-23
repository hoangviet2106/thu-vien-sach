import { calculateLateFeeVnd } from "./fee";

describe("calculateLateFeeVnd", () => {
    it("returns zero when returned on due day", () => {
        const due = new Date("2026-05-06T00:00:00.000Z");
        const returned = new Date("2026-05-06T23:59:59.000Z");
        expect(calculateLateFeeVnd(due, returned)).toBe(0);
    });

    it("returns 5000 for one overdue day", () => {
        const due = new Date("2026-05-06T00:00:00.000Z");
        const returned = new Date("2026-05-07T00:00:00.000Z");
        expect(calculateLateFeeVnd(due, returned)).toBe(5000);
    });

    it("caps late fee at 500000", () => {
        const due = new Date("2026-01-01T00:00:00.000Z");
        const returned = new Date("2026-12-01T00:00:00.000Z");
        expect(calculateLateFeeVnd(due, returned)).toBe(500000);
    });
});
