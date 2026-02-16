// Run Supabase migration via direct Postgres connection (Supavisor pooler)
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.join(__dirname, "..", "supabase", "migration.sql");
const fullSQL = fs.readFileSync(sqlFile, "utf-8");

// Supabase project: uqumzjmyejlhoyliyesu
// Direct connection via Supavisor (session mode)
const PROJECT_REF = "uqumzjmyejlhoyliyesu";

// Try different connection options
const CONNECTION_CONFIGS = [
  {
    name: "Supavisor Session Mode (port 5432)",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${process.env.DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "Direct Connection",
    connectionString: `postgresql://postgres:${process.env.DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "Supavisor Transaction Mode (port 6543)",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${process.env.DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  },
];

async function tryConnection(config) {
  const client = new pg.Client({
    connectionString: config.connectionString,
    ssl: config.ssl,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log(`Trying: ${config.name}...`);
    await client.connect();
    const res = await client.query("SELECT 1 as test");
    console.log(`  ✅ Connected! Test: ${JSON.stringify(res.rows[0])}`);
    return client;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    try { await client.end(); } catch {}
    return null;
  }
}

async function main() {
  if (!process.env.DB_PASSWORD) {
    console.log("❌ DB_PASSWORD environment variable not set.");
    console.log("Usage: DB_PASSWORD=your_password node scripts/run-migration.mjs");
    console.log("\nFind your database password in Supabase Dashboard:");
    console.log("https://supabase.com/dashboard/project/uqumzjmyejlhoyliyesu/settings/database");
    console.log("Under 'Connection string' > 'URI', the password is between : and @");
    process.exit(1);
  }

  let client = null;
  for (const config of CONNECTION_CONFIGS) {
    client = await tryConnection(config);
    if (client) break;
  }

  if (!client) {
    console.log("\n❌ Could not connect to database with any method.");
    process.exit(1);
  }

  console.log("\n🚀 Running migration...\n");

  try {
    await client.query(fullSQL);
    console.log("✅ Migration completed successfully!");

    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log("\n📋 Tables in public schema:");
    for (const row of tables.rows) {
      console.log(`  - ${row.table_name}`);
    }
  } catch (err) {
    console.log(`❌ Migration error: ${err.message}`);
    if (err.message.includes("already exists")) {
      console.log("Some tables already exist. Trying to check current state...");
      const tables = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      console.log("\n📋 Existing tables:");
      for (const row of tables.rows) {
        console.log(`  - ${row.table_name}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch(console.error);
