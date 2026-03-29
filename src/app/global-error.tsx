"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html dir="rtl" lang="he">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "var(--color-background, #fafaf9)",
          color: "var(--color-foreground, #1a1a1a)",
        }}
      >
        <div style={{ padding: "2rem", textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }} aria-hidden="true">😕</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            משהו השתבש
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted, #6b7280)", marginBottom: "1.5rem" }}>
            אירעה שגיאה לא צפויה. אנחנו מצטערים על אי הנוחות.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#4f46e5",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            נסו שוב
          </button>
        </div>
      </body>
    </html>
  );
}
