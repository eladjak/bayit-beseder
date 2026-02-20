#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push notifications.
 * Run: node scripts/generate-vapid-keys.mjs
 *
 * Add the generated keys to your .env.local and Vercel environment:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
 *   VAPID_PRIVATE_KEY=<privateKey>
 *   VAPID_SUBJECT=mailto:your-email@example.com
 */

import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("VAPID Keys Generated:");
console.log("====================");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:bayit-beseder@example.com`);
console.log("");
console.log("Add these to .env.local and Vercel environment variables.");
