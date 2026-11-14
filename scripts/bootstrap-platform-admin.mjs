#!/usr/bin/env node
/*
 * BUSINESSHUB — bootstrap the first platform administrator.
 *
 * Creates (or reuses) a Supabase Auth user and inserts the matching row into
 * public.platform_admins. Run this once, after the migrations have been applied.
 *
 * Usage:
 *   node --env-file=.env.local scripts/bootstrap-platform-admin.mjs "owner@example.com" "Platform Owner"
 *   node --env-file=.env.local scripts/bootstrap-platform-admin.mjs "owner@example.com" "Platform Owner" --password="..."
 *
 * If --password is omitted, a strong password is generated and printed once.
 * If the email already exists in Auth, that account is reused and no password is
 * shown. Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { randomInt } from "node:crypto";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith("--"));
const passwordArg = args.find((arg) => arg.startsWith("--password="));

const email = positional[0]?.trim().toLowerCase();
const fullName = positional[1]?.trim() || "Platform Owner";
const providedPassword = passwordArg ? passwordArg.slice("--password=".length) : null;

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('Provide a valid email: node --env-file=.env.local scripts/bootstrap-platform-admin.mjs "owner@example.com" "Platform Owner"');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (use --env-file=.env.local).");
}

function generatePassword(length = 20) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

console.log(`Project: ${url}`);
console.log(`Email:   ${email}`);

// Reuse an existing Auth account if one already has this email.
let user = null;
let reused = false;
let password = providedPassword ?? generatePassword();

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, platform_admin: true },
});

if (createError) {
  const alreadyExists = /already|registered|exists/i.test(createError.message);
  if (!alreadyExists) fail(`Could not create the Auth user: ${createError.message}`);

  let page = 1;
  while (!user) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Could not list Auth users: ${error.message}`);
    user = data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;
    if (data.users.length < 200) break;
    page += 1;
  }
  if (!user) fail("Auth reports the email as taken but the account could not be found.");
  reused = true;
} else {
  user = created.user;
}

if (!user) fail("Auth user creation returned no user.");

const { error: insertError } = await admin.from("platform_admins").upsert(
  {
    user_id: user.id,
    full_name: fullName,
    email,
  },
  { onConflict: "user_id" },
);

if (insertError) fail(`Could not insert platform_admins row: ${insertError.message}`);

console.log("\nPlatform administrator ready.");
console.log(`  User ID: ${user.id}`);
console.log(`  Name:    ${fullName}`);
console.log(`  Email:   ${email}`);
if (reused) {
  console.log("  Account: existing Auth user reused; its current password is unchanged.");
} else {
  console.log(`  Password: ${password}`);
  console.log("  Store this now — it is not recoverable. Change it after signing in.");
}
console.log("\nSign in at http://localhost:3000/login\n");
