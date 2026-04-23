export function normalizeIsbn(input: string): string {
    return input.replace(/[^0-9]/g, "");
}

export function assertIsbn13(input: string): void {
    if (!/^\d{13}$/.test(input)) {
        throw new Error("ISBN must be 13 digits");
    }
}
