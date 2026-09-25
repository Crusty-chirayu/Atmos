import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST } from "@/app/api/ai/chat/route";
import { NextRequest } from "next/server";

describe("AI Chat API Route (POST /api/ai/chat)", () => {
  it("processes a valid weather query with grounding location", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.1",
      },
      body: JSON.stringify({
        message: "Will it rain today in London?",
        location: {
          name: "London",
          latitude: 51.5074,
          longitude: -0.1278,
        },
        mode: "general",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.reply);
    assert.equal(typeof data.reply, "string");
    assert.equal(data.location?.name, "London");
    assert.ok(res.headers.has("X-RateLimit-Limit"));
  });

  it("rejects request with invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.2",
      },
      body: "not-json{",
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.code, "INVALID_BODY");
  });

  it("rejects prompt exceeding 1,000 characters", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.3",
      },
      body: JSON.stringify({
        message: "x".repeat(1050),
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.code, "INVALID_PARAMETERS");
  });

  it("enforces sliding-window rate limit after threshold", async () => {
    const ip = "203.0.113.88";
    let lastStatus = 200;

    // Send requests exceeding the limit of 20
    for (let i = 0; i < 22; i++) {
      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          message: `Query iteration ${i}`,
        }),
      });

      const res = await POST(req);
      lastStatus = res.status;
      if (lastStatus === 429) {
        assert.ok(res.headers.has("Retry-After"));
        break;
      }
    }

    assert.equal(lastStatus, 429);
  });
});
