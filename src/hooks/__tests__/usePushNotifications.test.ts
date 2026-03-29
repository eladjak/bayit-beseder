/**
 * Unit tests for usePushNotifications hook.
 * Tests support detection, permission state, and subscribe/unsubscribe flows
 * using mocked browser APIs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ── Browser API mocks ──────────────────────────────────────────────────────────

function mockFullPushSupport(permission: NotificationPermission = "default") {
  Object.defineProperty(window, "Notification", {
    value: { permission, requestPermission: vi.fn().mockResolvedValue(permission) },
    writable: true,
    configurable: true,
  });

  const mockGetSubscription = vi.fn().mockResolvedValue(null);
  const mockSubscribe = vi.fn();
  const mockUnsubscribe = vi.fn().mockResolvedValue(true);
  const mockPushManager = { getSubscription: mockGetSubscription, subscribe: mockSubscribe };

  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      ready: Promise.resolve({ pushManager: mockPushManager }),
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "PushManager", {
    value: {},
    writable: true,
    configurable: true,
  });

  return { mockGetSubscription, mockSubscribe, mockUnsubscribe, mockPushManager };
}

function removePushSupport() {
  // Delete the property entirely so `"Notification" in window` returns false
  // (setting to undefined is not sufficient)
  try {
    // @ts-expect-error intentional deletion for test mocking
    delete window.Notification;
  } catch {
    Object.defineProperty(window, "Notification", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }
  try {
    // @ts-expect-error intentional deletion for test mocking
    delete window.PushManager;
  } catch {
    Object.defineProperty(window, "PushManager", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  // Clear any stored push subscription state
  localStorage.clear();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("usePushNotifications — support detection", () => {
  it("returns isSupported=false when Notification API is absent", () => {
    removePushSupport();

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(false);
  });

  it("returns isSupported=true when all required APIs are present", () => {
    mockFullPushSupport();

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);
  });
});

describe("usePushNotifications — initial permission state", () => {
  it("reads permission=default from Notification.permission", () => {
    mockFullPushSupport("default");

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe("default");
  });

  it("reads permission=granted from Notification.permission", () => {
    mockFullPushSupport("granted");

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe("granted");
  });

  it("reads permission=denied from Notification.permission", () => {
    mockFullPushSupport("denied");

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe("denied");
  });
});

describe("usePushNotifications — subscription state from localStorage", () => {
  it("initialises isSubscribed=false when localStorage key is absent", () => {
    mockFullPushSupport();
    localStorage.removeItem("bayit-push-subscribed");

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSubscribed).toBe(false);
  });

  it("initialises isSubscribed=true when localStorage key is 'true'", () => {
    mockFullPushSupport("granted");
    localStorage.setItem("bayit-push-subscribed", "true");

    const { result } = renderHook(() => usePushNotifications());
    // Initial state from localStorage is true; refresh may update it
    expect(result.current.isSubscribed).toBe(true);
  });
});

describe("usePushNotifications — subscribe when unsupported", () => {
  it("subscribe returns false when push is not supported", async () => {
    removePushSupport();

    const { result } = renderHook(() => usePushNotifications());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.subscribe("user-1");
    });

    expect(ok).toBe(false);
  });

  it("unsubscribe returns false when push is not supported", async () => {
    removePushSupport();

    const { result } = renderHook(() => usePushNotifications());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.unsubscribe("user-1");
    });

    expect(ok).toBe(false);
  });
});

describe("usePushNotifications — subscribe with permission denied", () => {
  it("subscribe returns false when permission is already denied", async () => {
    mockFullPushSupport("denied");

    // Mock requestPermission to return 'denied'
    (window.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission =
      vi.fn().mockResolvedValue("denied");

    const { result } = renderHook(() => usePushNotifications());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.subscribe("user-1");
    });

    expect(ok).toBe(false);
  });
});

describe("usePushNotifications — isLoading state", () => {
  it("isLoading starts as false", () => {
    mockFullPushSupport();

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isLoading).toBe(false);
  });
});
