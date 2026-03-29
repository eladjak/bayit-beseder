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
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>משהו השתבש</h2>
          <button onClick={reset}>נסו שוב</button>
        </div>
      </body>
    </html>
  );
}
