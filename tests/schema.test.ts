import { describe, expect, it } from "vitest";

import { rawSessionContextSchema } from "@/lib/auth/schema";

const employee = {
  id: "11111111-1111-4111-8111-111111111111",
  business_id: "22222222-2222-4222-8222-222222222222",
  employee_number: "ADM-00001",
  full_name: "Ada Okafor",
  email: "ada@example.com",
  phone: null,
  branch_id: "33333333-3333-4333-8333-333333333333",
  designation: "Administrator",
  status: "active",
  must_change_password: false,
  last_login_at: "2026-01-15T10:00:00Z",
};

const business = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Adeyemi Stores",
  slug: "adeyemi-stores",
  currency: "NGN",
  timezone: "Africa/Lagos",
  status: "active",
  logo_url: null,
  offline_session_hours: 72,
  expense_approval_threshold: 50_000,
};

describe("session context schema", () => {
  it("accepts a valid employee context", () => {
    const parsed = rawSessionContextSchema.safeParse({
      user_id: "44444444-4444-4444-8444-444444444444",
      is_platform_admin: false,
      employee,
      business,
      roles: [{ id: "55555555-5555-4555-8555-555555555555", key: "business_admin", name: "Business Administrator" }],
      permissions: ["employee.view", "employee.manage"],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a platform administrator with no employee", () => {
    const parsed = rawSessionContextSchema.safeParse({
      user_id: "44444444-4444-4444-8444-444444444444",
      is_platform_admin: true,
      platform_admin: { full_name: "Owner", email: "owner@businesshub.test" },
      employee: null,
      business: null,
      roles: [],
      permissions: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-UUID user id", () => {
    const parsed = rawSessionContextSchema.safeParse({
      user_id: "not-a-uuid",
      is_platform_admin: false,
      employee: null,
      business: null,
      roles: [],
      permissions: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown employee status", () => {
    const parsed = rawSessionContextSchema.safeParse({
      user_id: "44444444-4444-4444-8444-444444444444",
      is_platform_admin: false,
      employee: { ...employee, status: "deleted" },
      business,
      roles: [],
      permissions: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects permissions that are not strings", () => {
    const parsed = rawSessionContextSchema.safeParse({
      user_id: "44444444-4444-4444-8444-444444444444",
      is_platform_admin: false,
      employee,
      business,
      roles: [],
      permissions: [1, 2, 3],
    });
    expect(parsed.success).toBe(false);
  });
});
