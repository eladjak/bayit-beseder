#!/usr/bin/env node
/**
 * Provision / rotate / revoke the named agent credential for Bayit BeSeder.
 *
 * A named agent is a normal per-household agent token (table household_agent_tokens, SHA-256 hashed)
 * flagged is_agent (migration 030), pinned to ONE household, carrying all four scopes.
 * The raw key is written ONLY to the --out file (mode 600, refuses to overwrite) and is
 * never printed. Run this in the go-live phase, after migration 030 is applied.
 *
 *   node scripts/agent-key.mjs issue  <householdId> <ownerUserId> --out <path> [--base-url URL] [--dry-run]
 *   node scripts/agent-key.mjs rotate <householdId> <ownerUserId> --out <path>   (issue new, then revoke old named agent tokens)
 *   node scripts/agent-key.mjs revoke <householdId>                              (revoke ALL named agent tokens of the household)
 *   node scripts/agent-key.mjs list   [householdId]
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (env or .env.local).
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AGENT_DISPLAY_NAME = process.env.BAYIT_AGENT_DISPLAY_NAME?.trim() || "סוכן";
const SCOPES = ["read", "write", "deliver_to_me", "delete_tasks"];

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(n);
  return i === -1 ? null : args[i + 1] ?? null;
};
const has = (n) => args.includes(n);
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && args[i - 1] !== "--dry-run"));
const [command, householdId, ownerUserId] = positional;
const out = flag("--out");
const baseUrl = flag("--base-url") ?? "https://www.bayitbeseder.com";
const dryRun = has("--dry-run");

try {
  const envContent = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"), "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !(m[1].trim() in process.env)) process.env[m[1].trim()] = m[2].trim();
  }
} catch {
  /* optional */
}

const die = (msg, code = 1) => {
  console.error(msg);
  process.exit(code);
};

function newKey() {
  const raw = `bbs_agent_${randomBytes(32).toString("hex")}`;
  return { raw, hash: createHash("sha256").update(raw, "utf8").digest("hex") };
}

const db = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) die("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key);
};

async function issue() {
  if (!householdId || !ownerUserId || !out) die("Usage: issue <householdId> <ownerUserId> --out <path>");
  if (dryRun) {
    console.log(`[dry-run] would verify ${ownerUserId} is a member of ${householdId}, insert a hashed token ` +
      `(is_agent=true, agent_name="${AGENT_DISPLAY_NAME}", scopes=${SCOPES.join(",")}) and write the key to ${out} (mode 600). Nothing done.`);
    return;
  }
  const supabase = db();
  const { data: member } = await supabase.from("household_members").select("user_id")
    .eq("household_id", householdId).eq("user_id", ownerUserId).maybeSingle();
  if (!member) die("Owner is not a member of that household. Refusing.");
  const { raw, hash } = newKey();
  const { data, error } = await supabase.from("household_agent_tokens").insert({
    household_id: householdId, token_hash: hash, label: AGENT_DISPLAY_NAME,
    scopes: SCOPES, created_by: ownerUserId, is_agent: true, agent_name: AGENT_DISPLAY_NAME,
  }).select("id").single();
  if (error || !data) die(`Insert failed (is migration 030 applied?): ${error?.message ?? "unknown"}`);
  try {
    writeFileSync(out, `BAYIT_AGENT_KEY=${raw}\nBAYIT_BASE_URL=${baseUrl}\n`, { mode: 0o600, flag: "wx" });
  } catch (e) {
    await supabase.from("household_agent_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
    die(`Could not write ${out} (${e.code ?? "error"}); the new token was revoked again.`);
  }
  console.log(`Issued ${AGENT_DISPLAY_NAME} token id ${data.id} for household ${householdId}. Key written to ${out} (mode 600), not printed.`);
  return data.id;
}

async function revokeAll(exceptId = null) {
  if (!householdId) die("Usage: revoke <householdId>");
  if (dryRun) return console.log("[dry-run] would revoke all active named agent tokens of the household.");
  let q = db().from("household_agent_tokens").update({ revoked_at: new Date().toISOString() })
    .eq("household_id", householdId).eq("is_agent", true).is("revoked_at", null);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q.select("id");
  if (error) die(`Revoke failed: ${error.message}`);
  console.log(`Revoked ${data?.length ?? 0} named agent token(s).`);
}

switch (command) {
  case "issue": await issue(); break;
  case "rotate": { const id = await issue(); if (id) await revokeAll(id); break; }
  case "revoke": await revokeAll(); break;
  case "list": {
    let q = db().from("household_agent_tokens").select("id, household_id, created_at, revoked_at").eq("is_agent", true);
    if (householdId) q = q.eq("household_id", householdId);
    const { data, error } = await q;
    if (error) die(error.message);
    for (const r of data ?? []) console.log(`${r.id} household=${r.household_id} ${r.revoked_at ? "revoked " + r.revoked_at : "active"}`);
    break;
  }
  default: die("Usage: issue|rotate|revoke|list (see file header)");
}
