import request from "supertest";
import { buildApp } from "../../src/app";

describe("Error envelope contract", () => {
    it("returns { error_code, message } for validation errors", async () => {
        const app = buildApp();
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "invalid-email", password: "1" });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error_code");
        expect(response.body).toHaveProperty("message");
    });
});
