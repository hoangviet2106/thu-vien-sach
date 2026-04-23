import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isTest = process.env.NODE_ENV === "test";
if (isTest) {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/library_test";
    process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ?? "test-private-key";
    process.env.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY ?? "test-public-key";
}

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.string().default("3000"),
    API_PREFIX: z.string().default("/api/v1"),
    DATABASE_URL: z.string().min(1),
    JWT_PRIVATE_KEY: z.string().min(1),
    JWT_PUBLIC_KEY: z.string().min(1),
    JWT_ACCESS_TTL: z.string().default("15m")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = {
    ...parsed.data,
    port: Number(parsed.data.PORT)
};
