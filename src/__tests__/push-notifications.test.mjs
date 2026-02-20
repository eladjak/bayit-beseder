import { describe, it, assert } from "node:test";
import assert2 from "node:assert/strict";

// ============================================
// Push notification tests (inline implementations)
// Node test runner can't import TypeScript directly
// ============================================

// --- sendPushToAll logic (simplified for testing) ---

function sendPushToAllSync(subscriptions, payload) {
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, expired: [] };
  }

  let sent = 0;
  let failed = 0;
  const expired = [];

  for (const sub of subscriptions) {
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      failed++;
      continue;
    }
    // Simulate successful send for valid subscriptions
    sent++;
  }

  return { sent, failed, expired };
}

// --- PushSubscription validation ---

function isValidSubscription(sub) {
  return (
    typeof sub === "object" &&
    sub !== null &&
    typeof sub.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    typeof sub.keys === "object" &&
    sub.keys !== null &&
    typeof sub.keys.p256dh === "string" &&
    sub.keys.p256dh.length > 0 &&
    typeof sub.keys.auth === "string" &&
    sub.keys.auth.length > 0
  );
}

// --- urlBase64ToUint8Array ---

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = Buffer.from(base64, "base64");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData[i];
  }
  return outputArray;
}

// --- Push payload builder ---

function buildPushPayload(title, body, options = {}) {
  return JSON.stringify({
    title,
    body,
    icon: options.icon ?? "/icons/icon-192.png",
    badge: options.badge ?? "/icons/icon-192.png",
    tag: options.tag ?? "bayit-beseder",
    data: { url: options.url ?? "/dashboard" },
  });
}

// ============================================
// Tests
// ============================================

describe("Push Notifications", () => {
  describe("isValidSubscription", () => {
    it("validates a correct subscription", () => {
      const sub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
        keys: {
          p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-T1",
          auth: "tBHItJI5svbpC7",
        },
      };
      assert2.strictEqual(isValidSubscription(sub), true);
    });

    it("rejects subscription without endpoint", () => {
      const sub = {
        keys: { p256dh: "abc", auth: "def" },
      };
      assert2.strictEqual(isValidSubscription(sub), false);
    });

    it("rejects subscription with non-https endpoint", () => {
      const sub = {
        endpoint: "http://insecure.com/push",
        keys: { p256dh: "abc", auth: "def" },
      };
      assert2.strictEqual(isValidSubscription(sub), false);
    });

    it("rejects subscription without keys", () => {
      const sub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      };
      assert2.strictEqual(isValidSubscription(sub), false);
    });

    it("rejects subscription with missing p256dh", () => {
      const sub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { auth: "def" },
      };
      assert2.strictEqual(isValidSubscription(sub), false);
    });

    it("rejects subscription with empty auth", () => {
      const sub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { p256dh: "abc", auth: "" },
      };
      assert2.strictEqual(isValidSubscription(sub), false);
    });

    it("rejects null", () => {
      assert2.strictEqual(isValidSubscription(null), false);
    });

    it("rejects string", () => {
      assert2.strictEqual(isValidSubscription("not-a-sub"), false);
    });
  });

  describe("sendPushToAllSync", () => {
    it("returns zeros for empty array", () => {
      const result = sendPushToAllSync([], { title: "Test", body: "Hello" });
      assert2.strictEqual(result.sent, 0);
      assert2.strictEqual(result.failed, 0);
      assert2.deepStrictEqual(result.expired, []);
    });

    it("sends to valid subscriptions", () => {
      const subs = [
        {
          endpoint: "https://push.example.com/1",
          keys: { p256dh: "key1", auth: "auth1" },
        },
        {
          endpoint: "https://push.example.com/2",
          keys: { p256dh: "key2", auth: "auth2" },
        },
      ];
      const result = sendPushToAllSync(subs, { title: "Test", body: "Hello" });
      assert2.strictEqual(result.sent, 2);
      assert2.strictEqual(result.failed, 0);
    });

    it("fails for invalid subscriptions", () => {
      const subs = [
        { endpoint: null, keys: { p256dh: "key1", auth: "auth1" } },
        { endpoint: "https://push.example.com/2", keys: null },
      ];
      const result = sendPushToAllSync(subs, { title: "Test", body: "Hello" });
      assert2.strictEqual(result.sent, 0);
      assert2.strictEqual(result.failed, 2);
    });

    it("handles mix of valid and invalid", () => {
      const subs = [
        {
          endpoint: "https://push.example.com/1",
          keys: { p256dh: "key1", auth: "auth1" },
        },
        { endpoint: "", keys: { p256dh: "key2", auth: "auth2" } },
        {
          endpoint: "https://push.example.com/3",
          keys: { p256dh: "key3", auth: "auth3" },
        },
      ];
      const result = sendPushToAllSync(subs, { title: "Test", body: "Hello" });
      assert2.strictEqual(result.sent, 2);
      assert2.strictEqual(result.failed, 1);
    });
  });

  describe("urlBase64ToUint8Array", () => {
    it("converts a base64url string to Uint8Array", () => {
      // Known base64url value
      const input = "SGVsbG8"; // "Hello" in base64url
      const result = urlBase64ToUint8Array(input);
      assert2.ok(result instanceof Uint8Array);
      assert2.strictEqual(result.length, 5);
      assert2.strictEqual(result[0], 72); // H
      assert2.strictEqual(result[1], 101); // e
      assert2.strictEqual(result[4], 111); // o
    });

    it("handles base64url with - and _ characters", () => {
      const input = "ab-cd_ef";
      const result = urlBase64ToUint8Array(input);
      assert2.ok(result instanceof Uint8Array);
      assert2.ok(result.length > 0);
    });

    it("handles empty string", () => {
      const result = urlBase64ToUint8Array("");
      assert2.ok(result instanceof Uint8Array);
      assert2.strictEqual(result.length, 0);
    });
  });

  describe("buildPushPayload", () => {
    it("creates payload with defaults", () => {
      const payload = JSON.parse(buildPushPayload("Test Title", "Test Body"));
      assert2.strictEqual(payload.title, "Test Title");
      assert2.strictEqual(payload.body, "Test Body");
      assert2.strictEqual(payload.icon, "/icons/icon-192.png");
      assert2.strictEqual(payload.tag, "bayit-beseder");
      assert2.strictEqual(payload.data.url, "/dashboard");
    });

    it("creates payload with custom options", () => {
      const payload = JSON.parse(
        buildPushPayload("Custom", "Body", {
          tag: "morning-brief",
          url: "/stats",
        })
      );
      assert2.strictEqual(payload.tag, "morning-brief");
      assert2.strictEqual(payload.data.url, "/stats");
    });

    it("creates Hebrew morning brief payload", () => {
      const payload = JSON.parse(
        buildPushPayload("בוקר טוב! ☀️", "יש לכם 5 משימות להיום", {
          tag: "morning-brief",
        })
      );
      assert2.strictEqual(payload.title, "בוקר טוב! ☀️");
      assert2.ok(payload.body.includes("5 משימות"));
    });

    it("creates Hebrew evening summary payload", () => {
      const payload = JSON.parse(
        buildPushPayload("סיכום יומי 🌙", "השלמתם 8/10 משימות (80%)", {
          tag: "evening-summary",
          url: "/stats",
        })
      );
      assert2.strictEqual(payload.title, "סיכום יומי 🌙");
      assert2.ok(payload.body.includes("80%"));
      assert2.strictEqual(payload.data.url, "/stats");
    });
  });
});
