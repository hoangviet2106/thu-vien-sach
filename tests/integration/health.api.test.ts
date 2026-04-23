import request from "supertest";
import { buildApp } from "../../src/app";

describe("Health API", () => {
    it("returns 200 status", async () => {
        const app = buildApp();
        const response = await request(app).get("/api/v1/health");
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });
});
