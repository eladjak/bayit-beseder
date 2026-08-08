# Closing the WhatsApp webhook fail-open

**Status: PREPARED, NOT APPLIED.** Deliberately. Applying the code change
before the secret exists would take the live reply-to-complete flow down.

## What is true right now (verified 2026-08-08)

`POST /api/whatsapp/webhook` accepts unsigned requests from anyone on the
internet. `WHATSAPP_WEBHOOK_SECRET` is not set in production, and the route
treats "no secret" as "skip verification and continue".

Its sibling `api/sumit/webhook` makes the opposite decision for the same
situation: no secret in production means refuse to run (503). Same repo,
opposite defaults.

### How this was verified (two independent readings, both agreeing)

1. **Env listing.** `vercel env ls production` returns 23 variables and
   `WHATSAPP_WEBHOOK_SECRET` is not among them. Positive controls: the same
   listing *does* return `SUMIT_WEBHOOK_SECRET` and `WHATSAPP_PHONES`, so the
   check is capable of finding a variable that exists.

2. **Runtime probe (the stronger one).** An env listing is not the running
   process, so the behaviour was probed directly against production:

   ```
   # Note: bayitbeseder.com 307-redirects to www. — probe www directly,
   # or a 307 will read exactly like a rejection.

   A) bogus signature   -> 403 {"error":"Forbidden"}      (instance check)
   B) no signature      -> 403 {"error":"Forbidden"}      (instance check)
   C) invalid JSON body -> 400 {"error":"Invalid JSON"}   (CONTROL)
   ```

   Arm C is the discriminator: reaching *JSON parsing* proves the request got
   **past** the signature gate. If the secret were set, arm A would have been
   rejected `401 Invalid signature` before the body was ever parsed.

The only thing standing between a stranger and this endpoint today is the
`GREEN_API_INSTANCE_ID` check — a non-secret ID that is guessable and is not
an authentication mechanism.

## The change, once the secret exists

`src/app/api/whatsapp/webhook/route.ts`, replacing the `else` branch:

```diff
   } else {
-    // NOTE: this branch is the fail-open path, and it is the LIVE path in
-    // production today. It deliberately still continues — see
-    // reportMissingWebhookSecret() above for why this only reports.
-    reportMissingWebhookSecret();
+    // Fail CLOSED in production, matching api/sumit/webhook. An unsigned
+    // webhook can mark household tasks complete; without a secret there is
+    // no way to tell Green API apart from anyone else.
+    if (process.env.NODE_ENV === "production") {
+      reportMissingWebhookSecret();
+      return NextResponse.json(
+        { error: "Webhook not configured" },
+        { status: 503 }
+      );
+    }
+    // dev/test only: continue unsigned so local work is not blocked.
+    reportMissingWebhookSecret();
   }
```

## Order of operations — this order matters

1. **Elad** creates the secret (this step is his; not done here):
   `vercel env add WHATSAPP_WEBHOOK_SECRET production`
2. **Configure the same value in Green API** as the webhook signature secret,
   sent as the `x-webhook-signature` header (hex HMAC-SHA256 of the raw body).
3. **Verify the sender actually signs** before enforcing — send one real
   message and confirm it still completes a task. If Green API cannot send a
   custom signature header, **stop**: enforcing would silently break
   reply-to-complete, and this doc's change would be the wrong fix. Reach for
   an IP allowlist or a secret path segment instead.
4. Only then apply the diff above and deploy.

Step 3 is the one that is easy to skip and expensive to skip. Enforcing a
signature the caller never sends turns a security hole into an outage.

## What was NOT done, and why

- The secret was **not** created or rotated — keys are Elad's.
- The route was **not** switched to fail-closed — see step 3.
- Whether Green API can even send a custom signature header was **not**
  verified. That is the open question this whole change depends on.
