import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src", "<rootDir>/tests"],
    testMatch: ["**/*.test.ts"],
    collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0
        },
        "src/modules/**/*.service.ts": {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};

export default config;
