#!/usr/bin/env node
/**
 * Issue (or revoke) a per-household agent token.
 *
 * Design: docs/DESIGN-per-household-agent-tokens.md
 * Table: household_agent_tokens (supabase/migrations/020_household_agent_tokens.sql)
 *
 * This is the "admin script" that creates the credential an external agent
 * (Kami, a future integration) presents as `Authorization: Bearer <token>`
 * against /api/agent/*. The RAW token is printed to the terminal EXACTLY
 * ONCE — only its SHA-256 hash is stored in the database. If you lose it,
 * issue a new one; there is no way to recover the raw value.
 *
 * Usage:
 *   node scripts/issue-agent-token.mjs issue <householdId> [label]
 *   node scripts/issue-agent-token.mjs revoke <tokenId>
 *   node scripts/issue-agent-token.mjs list [householdId]
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY (this table has no client RLS policy — only the
 * service-role key can read/write it).
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local (same pattern as scripts/check-and-seed.mjs).
const envPath = resolve(__dirname, "..", ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (!(key.trim() in process.env)) process.env[key.trim()] = value.trim();
    }
  }
} catch {
  // .env.local is optional if the caller already exported the vars.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (checked .env.local and the environment)."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const TOKEN_PREFIX = "bbs_agent_";

function generateRawToken() {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
}

function hashToken(rawToken) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

async function issue(householdId, label) {
  if (!householdId) {
    console.error("Usage: node scripts/issue-agent-token.mjs issue <householdId> [label]");
    process.exit(1);
  }

  const { data: household, error: householdErr } = await supabase
    .from("households")
    .select("id, name")
    .eq("id", householdId)
    .maybeSingle();
  if (householdErr || !household) {
    console.error(`Household ${householdId} not found: ${householdErr?.message ?? "no such row"}`);
    process.exit(1);
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  const { data, error } = await supabase
    .from("household_agent_tokens")
    .insert({ household_id: householdId, token_hash: tokenHash, label: label ?? null })
    .select("id, created_at")
    .single();

  if (error || !data) {
    console.error(`Failed to insert token: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }

  console.log(`Issued token for household "${household.name}" (${householdId})`);
  console.log(`  token id:   ${data.id}`);
  console.log(`  created at: ${data.created_at}`);
  console.log("");
  console.log("RAW TOKEN (shown once — copy it now, it cannot be recovered later):");
  console.log("");
  console.log(`  ${rawToken}`);
  console.log("");
  console.log("Give this to the agent integration as:");
  console.log(`  Authorization: Bearer ${rawToken}`);
}

async function revoke(tokenId) {
  if (!tokenId) {
    console.error("Usage: node scripts/issue-agent-token.mjs revoke <tokenId>");
    process.exit(1);
  }
  const { data, error } = await supabase
    .from("household_agent_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(`Failed to revoke: ${error.message}`);
    process.exit(1);
  }
  if (!data) {
    console.log(`No active token with id ${tokenId} (already revoked, or does not exist).`);
    return;
  }
  console.log(`Revoked token ${tokenId}.`);
}

async function list(householdId) {
  let q = supabase
    .from("household_agent_tokens")
    .select("id, household_id, label, created_at, revoked_at")
    .order("created_at", { ascending: false });
  if (householdId) q = q.eq("household_id", householdId);

  const { data, error } = await q;
  if (error) {
    console.error(`Failed to list: ${error.message}`);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log("No tokens found.");
    return;
  }
  for (const row of data) {
    const status = row.revoked_at ? `revoked at ${row.revoked_at}` : "active";
    console.log(
      `${row.id}  household=${row.household_id}  label=${row.label ?? "(none)"}  created=${row.created_at}  ${status}`
    );
  }
}

const [, , command, ...rest] = process.argv;

switch (command) {
  case "issue":
    await issue(rest[0], rest[1]);
    break;
  case "revoke":
    await revoke(rest[0]);
    break;
  case "list":
    await list(rest[0]);
    break;
  default:
    console.error("Usage:");
    console.error("  node scripts/issue-agent-token.mjs issue <householdId> [label]");
    console.error("  node scripts/issue-agent-token.mjs revoke <tokenId>");
    console.error("  node scripts/issue-agent-token.mjs list [householdId]");
    process.exit(1);
}
