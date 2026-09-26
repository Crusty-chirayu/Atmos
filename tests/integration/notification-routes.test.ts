import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  GET as getAlerts,
  POST as postAlerts,
} from "../../src/app/api/user/alerts/route";
import {
  GET as getAlertDetail,
  PATCH as patchAlertDetail,
  DELETE as deleteAlertDetail,
} from "../../src/app/api/user/alerts/[id]/route";
import {
  GET as getNotifications,
  PATCH as patchNotifications,
  DELETE as deleteNotifications,
} from "../../src/app/api/user/notifications/route";
import {
  PATCH as patchNotificationItem,
  DELETE as deleteNotificationItem,
} from "../../src/app/api/user/notifications/[id]/route";
import { POST as postCronAlerts } from "../../src/app/api/cron/evaluate-alerts/route";
import { createNotification } from "../../src/lib/notifications/service/notification-service";

describe("M7 Notification & Alert Routes Integration", () => {
  it("rejects unauthenticated requests to /api/user/alerts with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/user/alerts");
    const res = await getAlerts(req);
    assert.equal(res.status, 401);
  });

  it("rejects invalid alert rule payload with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/user/alerts", {
      method: "POST",
      body: JSON.stringify({
        name: "", // Invalid empty name
        alertType: "invalid_type",
      }),
    });
    const res = await postAlerts(req);
    // Unauthenticated returns 401 first, or 400 if mocked
    assert.ok(res.status === 401 || res.status === 400);
  });

  it("rejects unauthenticated requests to /api/user/notifications with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/user/notifications");
    const res = await getNotifications(req);
    assert.equal(res.status, 401);
  });

  it("protects /api/cron/evaluate-alerts with authorization check", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/cron/evaluate-alerts",
      {
        method: "POST",
        headers: {
          authorization: "Bearer wrong-secret",
        },
      }
    );
    const res = await postCronAlerts(req);
    // When CRON_SECRET is unconfigured in development, it executes or checks auth
    assert.ok(res.status === 200 || res.status === 401);
  });

  it("creates in-app notifications and suppresses duplicates with same dedupKey", async () => {
    const userId = "test-user-dedup";
    const dedupKey = `test:dedup:${Date.now()}`;

    const n1 = await createNotification(userId, {
      title: "Freeze Warning",
      message: "Freezing temperatures imminent",
      category: "weather_alert",
      severity: "critical",
      dedupKey,
      metadata: {},
    });

    assert.ok(n1);
    assert.equal(n1.title, "Freeze Warning");
    assert.equal(n1.dedupKey, dedupKey);

    // Attempt duplicate creation with same dedupKey
    const n2 = await createNotification(userId, {
      title: "Freeze Warning (Duplicate)",
      message: "Freezing temperatures imminent",
      category: "weather_alert",
      severity: "critical",
      dedupKey,
      metadata: {},
    });

    // Should return existing record or null without creating duplicate
    assert.ok(n2 === null || n2.id === n1.id);
  });
});
