import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GET as getConversations,
  POST as createConversation,
} from "@/app/api/ai/conversations/route";
import {
  GET as getConversationById,
  DELETE as deleteConversationById,
} from "@/app/api/ai/conversations/[id]/route";
import { NextRequest } from "next/server";

describe("AI Conversations API Routes", () => {
  it("rejects unauthenticated GET /api/ai/conversations with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/conversations", {
      method: "GET",
      headers: {
        "x-forwarded-for": "198.51.100.10",
      },
    });

    const res = await getConversations(req);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.code, "UNAUTHORIZED");
  });

  it("rejects unauthenticated POST /api/ai/conversations with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.11",
      },
      body: JSON.stringify({ title: "My Weather Plan" }),
    });

    const res = await createConversation(req);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.code, "UNAUTHORIZED");
  });

  it("rejects unauthenticated GET /api/ai/conversations/[id] with 401", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/ai/conversations/123e4567-e89b-12d3-a456-426614174000",
      {
        method: "GET",
        headers: {
          "x-forwarded-for": "198.51.100.12",
        },
      }
    );

    const params = Promise.resolve({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    const res = await getConversationById(req, { params });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.code, "UNAUTHORIZED");
  });

  it("rejects unauthenticated DELETE /api/ai/conversations/[id] with 401", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/ai/conversations/123e4567-e89b-12d3-a456-426614174000",
      {
        method: "DELETE",
        headers: {
          "x-forwarded-for": "198.51.100.13",
        },
      }
    );

    const params = Promise.resolve({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    const res = await deleteConversationById(req, { params });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.code, "UNAUTHORIZED");
  });
});
