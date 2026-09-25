import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../../src/app/api/auth/callback/route";

describe("Auth Callback Route Handler (GET /api/auth/callback)", () => {
  it("redirects to login error when no auth code is supplied", async () => {
    const request = new Request("http://localhost:3000/api/auth/callback");
    const response = await GET(request);

    assert.equal(response.status, 307);
    const location = response.headers.get("location");
    assert.ok(location);
    assert.ok(location.includes("/login?error=auth_callback_failed"));
  });

  it("sanitizes open-redirect attempt in next parameter", async () => {
    const request = new Request(
      "http://localhost:3000/api/auth/callback?next=https://evil-phishing-site.com"
    );
    const response = await GET(request);

    assert.equal(response.status, 307);
    const location = response.headers.get("location");
    assert.ok(location);
    // Even on error, destination cannot be external
    assert.ok(!location.includes("evil-phishing-site.com"));
    assert.ok(location.startsWith("http://localhost:3000/"));
  });

  it("sanitizes protocol-relative open-redirect attempt (//evil.com)", async () => {
    const request = new Request(
      "http://localhost:3000/api/auth/callback?next=//evil.com/phish"
    );
    const response = await GET(request);

    assert.equal(response.status, 307);
    const location = response.headers.get("location");
    assert.ok(location);
    assert.ok(!location.includes("//evil.com"));
  });
});
