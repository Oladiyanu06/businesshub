import { describe, expect, it } from "vitest";

import {
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  can,
  groupPermissions,
  isPermissionKey,
} from "@/lib/permissions";

describe("permission catalogue", () => {
  it("contains 45 unique permission keys", () => {
    expect(PERMISSION_KEYS).toHaveLength(45);
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
  });

  it("uses the module.action format", () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.key).toMatch(/^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/);
      expect(permission.module.trim().length).toBeGreaterThan(0);
      expect(permission.action.trim().length).toBeGreaterThan(0);
      expect(permission.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("groups every permission exactly once", () => {
    const groups = groupPermissions();
    const flattened = groups.flatMap((group) => group.permissions);
    expect(flattened).toHaveLength(PERMISSION_CATALOG.length);
    expect(new Set(flattened.map((permission) => permission.key)).size).toBe(
      PERMISSION_CATALOG.length,
    );
  });

  it("recognises only real permission keys", () => {
    expect(isPermissionKey("employee.manage")).toBe(true);
    expect(isPermissionKey("employee.destroy")).toBe(false);
    expect(isPermissionKey("")).toBe(false);
  });

  it("checks permissions without crashing on null", () => {
    expect(can(["employee.view"], "employee.view")).toBe(true);
    expect(can(["employee.view"], "employee.manage")).toBe(false);
    expect(can(null, "employee.view")).toBe(false);
    expect(can(undefined, "employee.view")).toBe(false);
  });

  it("includes every module required by the Phase 1 UI", () => {
    for (const key of [
      "business.view",
      "business.settings",
      "branch.view",
      "branch.manage",
      "employee.view",
      "employee.manage",
      "role.view",
      "role.manage",
      "device.view",
      "device.manage",
      "audit.view",
    ]) {
      expect(PERMISSION_KEYS).toContain(key);
    }
  });
});
