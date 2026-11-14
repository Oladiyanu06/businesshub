#!/usr/bin/env node
/*
 * BUSINESSHUB — apply SQL migrations over a direct PostgreSQL connection.
 *
 * Use this when a web SQL editor truncates or only executes a selection. It reads
 * the migration files from disk and sends each one in full, wrapping all files in
 * a single transaction so a failure leaves the database untouched.
 *
 * Usage:
 *   node scripts/apply-migrations.mjs "postgresql://USER:PASSWORD@HOST:5432/postgres"
 *   set DATABASE_URL=postgresql://... && node scripts/apply-migrations.mjs
 *
 * Options:
 *   --dry-run        List the files that would run; do not connect.
 *   --only=0001,0003 Apply only these prefixes (comma separated).
 *
 * Get the connection string from Supabase Dashboard → Connect → "Session pooler"
 * (port 5432). Use the database password, not the service role key.
 *
 * SECURITY: never commit the connection string. Prefer the DATABASE_URL
 * environment variable so the password does not appear in shell history.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase", "migrations");
const args = process.argv.slice(2);

const dryRun = args.includes("--dry-run");
const onlyArg = args.find((arg) => arg.startsWith("--only="));
const only = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )
  : null;
const urlArg = args.find((arg) => !arg.startsWith("--"));

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function maskUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "(unparseable connection string)";
  }
}

function lineColumn(sql, position) {
  if (!position) return null;
  const upto = sql.slice(0, Number(position) - 1);
  const lines = upto.split(/\r?\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

async function loadMigrations() {
  let entries;
  try {
    entries = await readdir(MIGRATIONS_DIR);
  } catch {
    fail(`Migration directory not found: ${MIGRATIONS_DIR}`);
  }

  const files = entries
    .filter((name) => /^\d{4}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) fail(`No numbered .sql files found in ${MIGRATIONS_DIR}`);

  const selected = only
    ? files.filter((name) => only.has(name.slice(0, 4)))
    : files;

  if (selected.length === 0) {
    fail(`No migrations matched --only=${[...only].join(",")}`);
  }

  const migrations = [];
  for (const name of selected) {
    const file = path.join(MIGRATIONS_DIR, name);
    const sql = await readFile(file, "utf8");
    migrations.push({ name, file, sql });
  }
  return migrations;
}

async function main() {
  const migrations = await loadMigrations();

  console.log("BUSINESSHUB migration runner");
  console.log(`Directory: ${MIGRATIONS_DIR}`);
  console.log(`Files (${migrations.length}), in order:`);
  for (const migration of migrations) {
    console.log(`  ${migration.name}  (${migration.sql.length.toLocaleString()} chars)`);
  }

  if (dryRun) {
    console.log("\n--dry-run: no database connection was made and no SQL was executed.");
    return;
  }

  const url = urlArg ?? process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!url) {
    fail(
      "No connection string provided. Pass it as the first argument or set DATABASE_URL.\n" +
        'Example: node scripts/apply-migrations.mjs "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"',
    );
  }

  console.log(`\nConnecting to: ${maskUrl(url)}`);
  const client = new Client({
    connectionString: url,
    // Supabase presents a certificate that Node does not ship a CA for. The
    // connection is still encrypted; this only skips CA verification.
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (error) {
    fail(`Could not connect: ${error.message}`);
  }

  try {
    const identity = await client.query(
      "select current_database() as database, current_user as username, version() as version",
    );
    const { database, username, version } = identity.rows[0];
    console.log(`Connected: database=${database} user=${username}`);
    console.log(`Server: ${String(version).split(" ").slice(0, 2).join(" ")}`);

    const existing = await client.query(
      "select table_name from information_schema.tables " +
        "where table_schema = 'public' and table_type = 'BASE TABLE' " +
        "order by table_name",
    );
    if (existing.rows.length > 0) {
      console.warn(
        `\nWARNING: ${existing.rows.length} table(s) already exist in the public schema:`,
      );
      console.warn(`  ${existing.rows.map((row) => row.table_name).join(", ")}`);
      console.warn(
        "0001_schema.sql expects a fresh project. If these are leftovers from a\n" +
          "partial run, the transaction will roll back on the first 'already exists' error.\n",
      );
    } else {
      console.log("Public schema is empty — safe to apply the full schema.");
    }

    console.log("\nBEGIN — applying all files in one transaction…");
    await client.query("begin");

    for (const migration of migrations) {
      const started = Date.now();
      try {
        await client.query(migration.sql);
      } catch (error) {
        await client.query("rollback").catch(() => {});
        const where = lineColumn(migration.sql, error.position);
        console.error(`\nFAILED: ${migration.name}`);
        if (where) console.error(`  at line ${where.line}, column ${where.column}`);
        console.error(`  code: ${error.code ?? "n/a"}`);
        console.error(`  message: ${error.message}`);
        if (error.detail) console.error(`  detail: ${error.detail}`);
        if (error.hint) console.error(`  hint: ${error.hint}`);
        console.error("\nThe transaction was rolled back. No changes were committed.\n");
        process.exitCode = 1;
        return;
      }
      console.log(`  OK  ${migration.name}  (${Date.now() - started} ms)`);
    }

    await client.query("commit");
    console.log("COMMIT — all migrations applied successfully.\n");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
