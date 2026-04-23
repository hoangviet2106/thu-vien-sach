export class AppError extends Error {
    constructor(
        public readonly errorCode: string,
        public readonly statusCode: number,
        message: string
    ) {
        super(message);
        this.name = "AppError";
    }
}
