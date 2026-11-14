#!/usr/bin/env node
/*
 * BUSINESSHUB demo seed — DEVELOPMENT ONLY.
 *
 * Creates one demo business with branches, employees and roles so the workspace
 * can be explored. Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD   (an existing platform admin)
 *   DEMO_ADMIN_EMAIL (optional), DEMO_ADMIN_PASSWORD (optional)
 *
 * Usage: npm.cmd run seed
 *
 * This script is idempotent for the business slug: if it already exists it exits
 * without changing anything. Never run it against production.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(".env.local");
loadEnv(".env");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. See .env.example and the README.`);
    process.exit(1);
  }
  return value;
}

const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const PLATFORM_EMAIL = requireEnv("PLATFORM_ADMIN_EMAIL");
const PLATFORM_PASSWORD = requireEnv("PLATFORM_ADMIN_PASSWORD");

const DEMO_SLUG = process.env.DEMO_SLUG ?? "demo-retail";
const DEMO_NAME = process.env.DEMO_NAME ?? "Demo Retail Ltd";
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "admin@demo-retail.test";
const DEMO_ADMIN_PASSWORD =
  process.env.DEMO_ADMIN_PASSWORD ?? `Demo-${randomBytes(6).toString("base64url")}!9`;

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed in production.");
    process.exit(1);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD,
  });
  if (signInError) {
    console.error("Platform sign-in failed:", signInError.message);
    process.exit(1);
  }

  const { data: existing } = await userClient
    .from("businesses")
    .select("id")
    .eq("slug", DEMO_SLUG)
    .maybeSingle();

  if (existing) {
    console.log(`Business "${DEMO_SLUG}" already exists (${existing.id}). Nothing to do.`);
    return;
  }

  const admin = adminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Administrator", must_change_password: true },
  });

  if (createError || !created.user) {
    console.error("Could not create demo administrator:", createError?.message);
    process.exit(1);
  }

  const { data: provisioned, error: provisionError } = await userClient.rpc(
    "provision_business",
    {
      p_name: DEMO_NAME,
      p_slug: DEMO_SLUG,
      p_currency: "NGN",
      p_country: "Nigeria",
      p_timezone: "Africa/Lagos",
      p_branch_name: "Head Office",
      p_admin_user_id: created.user.id,
      p_admin_full_name: "Demo Administrator",
      p_admin_email: DEMO_ADMIN_EMAIL,
      p_admin_phone: "+234 800 000 0000",
    },
  );

  if (provisionError || !provisioned) {
    console.error("Provisioning failed:", provisionError?.message);
    await admin.auth.admin.deleteUser(created.user.id);
    process.exit(1);
  }

  const businessId = provisioned.business_id;
  console.log(`Provisioned ${DEMO_NAME} (${businessId}).`);

  // Sign in as the demo administrator to exercise the tenant RPCs.
  const tenant = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { error: tenantSignIn } = await tenant.auth.signInWithPassword({
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
  });
  if (tenantSignIn) {
    console.error("Demo administrator sign-in failed:", tenantSignIn.message);
    process.exit(1);
  }

  // Additional branches.
  const branches = [
    { name: "Ikeja Branch", code: "IKEJA", address: "12 Allen Avenue, Ikeja" },
    { name: "Lekki Branch", code: "LEKKI", address: "5 Admiralty Way, Lekki" },
  ];
  const { error: branchError } = await tenant
    .from("branches")
    .insert(branches.map((branch) => ({ ...branch, business_id: businessId })))
    .select("id, name, code");

  if (branchError) console.warn("Branch seed warning:", branchError.message);

  const { data: roleRows } = await tenant
    .from("roles")
    .select("id, key")
    .eq("business_id", businessId);
  const roleMap = new Map((roleRows ?? []).map((role) => [role.key, role.id]));

  const people = [
    {
      fullName: "Chidi Branch Manager",
      email: "manager@demo-retail.test",
      designation: "Branch Manager",
      branchCode: "IKEJA",
      roles: ["branch_manager"],
    },
    {
      fullName: "Amaka Cashier",
      email: "cashier@demo-retail.test",
      designation: "Cashier",
      branchCode: "IKEJA",
      roles: ["cashier"],
    },
    {
      fullName: "Tunde Inventory",
      email: "inventory@demo-retail.test",
      designation: "Inventory Officer",
      branchCode: "LEKKI",
      roles: ["inventory_officer"],
    },
    {
      fullName: "Ngozi Accounts",
      email: "accounts@demo-retail.test",
      designation: "Accountant",
      branchCode: "HEAD",
      roles: ["accountant"],
    },
  ];

  const branchByCode = new Map();
  const { data: allBranches } = await tenant
    .from("branches")
    .select("id, code")
    .eq("business_id", businessId);
  for (const branch of allBranches ?? []) branchByCode.set(branch.code, branch.id);

  const credentials = [];
  for (const person of people) {
    // Demo passwords are generated per employee and printed once.
    const password = `Demo-${randomBytes(6).toString("base64url")}!9`;
    const { data: user, error: userError } = await admin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: person.fullName, must_change_password: true },
    });

    if (userError || !user.user) {
      console.warn(`Skipped ${person.email}: ${userError?.message}`);
      continue;
    }

    const roleIds = person.roles.map((key) => roleMap.get(key)).filter(Boolean);

    const { error: employeeError } = await tenant.rpc("provision_employee", {
      p_business_id: businessId,
      p_user_id: user.user.id,
      p_full_name: person.fullName,
      p_email: person.email,
      p_phone: null,
      p_employee_number: null,
      p_branch_id: branchByCode.get(person.branchCode) ?? null,
      p_designation: person.designation,
      p_role_ids: roleIds,
    });

    if (employeeError) {
      console.warn(`Employee ${person.email} failed: ${employeeError.message}`);
      await admin.auth.admin.deleteUser(user.user.id);
      continue;
    }

    credentials.push({ ...person, password });
  }

  console.log("\n=== Demo credentials (development only) ===");
  console.log(`Business:      ${DEMO_NAME} (${DEMO_SLUG})`);
  console.log(`Administrator: ${DEMO_ADMIN_EMAIL}`);
  console.log(`Password:      ${DEMO_ADMIN_PASSWORD}`);
  for (const person of credentials) {
    console.log(`\n${person.designation}: ${person.email}`);
    console.log(`Password: ${person.password}`);
  }
  console.log("\nAll accounts must change their password at first sign-in.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
