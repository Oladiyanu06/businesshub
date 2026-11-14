export type PermissionDefinition = {
  key: string;
  module: string;
  action: string;
  description: string;
};

/**
 * Client/server mirror of the permission catalogue seeded into
 * public.permissions (supabase/migrations/0001_schema.sql).
 * tests/permissions.test.ts guards uniqueness and shape.
 */
export const PERMISSION_CATALOG = [
  { key: "business.view", module: "Business", action: "view", description: "View the business profile" },
  { key: "business.settings", module: "Business", action: "settings", description: "Change business profile and operational settings" },
  { key: "branch.view", module: "Branches", action: "view", description: "View branches" },
  { key: "branch.manage", module: "Branches", action: "manage", description: "Create and edit branches" },
  { key: "employee.view", module: "Employees", action: "view", description: "View employee records and activity" },
  { key: "employee.manage", module: "Employees", action: "manage", description: "Register, edit, suspend and assign roles to employees" },
  { key: "role.view", module: "Roles", action: "view", description: "View roles and permissions" },
  { key: "role.manage", module: "Roles", action: "manage", description: "Create roles and change role permissions" },
  { key: "device.view", module: "Devices", action: "view", description: "View registered offline devices" },
  { key: "device.manage", module: "Devices", action: "manage", description: "Register and revoke offline devices" },
  { key: "audit.view", module: "Audit", action: "view", description: "View the business audit trail" },
  { key: "product.view", module: "Products", action: "view", description: "View products and prices" },
  { key: "product.manage", module: "Products", action: "manage", description: "Create and edit products" },
  { key: "inventory.view", module: "Inventory", action: "view", description: "View stock levels and movements" },
  { key: "inventory.adjust", module: "Inventory", action: "adjust", description: "Post stock adjustments" },
  { key: "inventory.receive", module: "Inventory", action: "receive", description: "Receive incoming stock" },
  { key: "inventory.stocktake", module: "Inventory", action: "stocktake", description: "Perform physical stocktaking" },
  { key: "transfer.view", module: "Transfers", action: "view", description: "View stock transfers" },
  { key: "transfer.request", module: "Transfers", action: "request", description: "Request stock from another branch" },
  { key: "transfer.approve", module: "Transfers", action: "approve", description: "Approve or reject stock transfers" },
  { key: "transfer.receive", module: "Transfers", action: "receive", description: "Confirm receipt of transferred stock" },
  { key: "sale.create", module: "Sales", action: "create", description: "Process sales" },
  { key: "sale.view", module: "Sales", action: "view", description: "View sales and receipts" },
  { key: "sale.discount", module: "Sales", action: "discount", description: "Apply discounts" },
  { key: "sale.void", module: "Sales", action: "void", description: "Reverse a completed sale" },
  { key: "sale.refund", module: "Sales", action: "refund", description: "Process refunds and returns" },
  { key: "customer.view", module: "Customers", action: "view", description: "View customer records and purchase history" },
  { key: "customer.manage", module: "Customers", action: "manage", description: "Create and correct customer records" },
  { key: "supplier.view", module: "Suppliers", action: "view", description: "View suppliers" },
  { key: "supplier.manage", module: "Suppliers", action: "manage", description: "Create and edit suppliers" },
  { key: "expense.view", module: "Finance", action: "view", description: "View expenses" },
  { key: "expense.manage", module: "Finance", action: "manage", description: "Record expenses" },
  { key: "expense.approve", module: "Finance", action: "approve", description: "Approve expenses above the configured threshold" },
  { key: "finance.view", module: "Finance", action: "view", description: "View financial summaries" },
  { key: "finance.reconcile", module: "Finance", action: "reconcile", description: "Perform cash reconciliation" },
  { key: "report.view", module: "Reports", action: "view", description: "View daily and consolidated reports" },
  { key: "report.export", module: "Reports", action: "export", description: "Export or email reports" },
  { key: "analytics.view", module: "Analytics", action: "view", description: "View business analytics" },
  { key: "wholesale.view", module: "Wholesale", action: "view", description: "View wholesaler collections and returns" },
  { key: "wholesale.manage", module: "Wholesale", action: "manage", description: "Record collections and returns" },
  { key: "feedback.submit", module: "Feedback", action: "submit", description: "Submit suggestions and complaints" },
  { key: "feedback.review", module: "Feedback", action: "review", description: "Review and respond to employee feedback" },
  { key: "attendance.clock", module: "Attendance", action: "clock", description: "Clock in and out" },
  { key: "attendance.view", module: "Attendance", action: "view", description: "View attendance records" },
  { key: "attendance.manage", module: "Attendance", action: "manage", description: "Correct attendance records" },
] as const satisfies readonly PermissionDefinition[];

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSION_CATALOG.map(
  (permission) => permission.key,
);

const permissionSet = new Set<string>(PERMISSION_KEYS);

export function isPermissionKey(value: string): value is PermissionKey {
  return permissionSet.has(value);
}

export function can(
  permissions: readonly string[] | null | undefined,
  key: PermissionKey,
): boolean {
  return permissions?.includes(key) ?? false;
}

export type PermissionGroup = {
  module: string;
  permissions: PermissionDefinition[];
};

export function groupPermissions(
  catalog: readonly PermissionDefinition[] = PERMISSION_CATALOG,
): PermissionGroup[] {
  const groups = new Map<string, PermissionDefinition[]>();
  for (const permission of catalog) {
    const list = groups.get(permission.module) ?? [];
    list.push(permission);
    groups.set(permission.module, list);
  }
  return Array.from(groups, ([module, permissions]) => ({ module, permissions }));
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  business_admin: "Full control of the business environment.",
  branch_manager: "Runs a branch: people, stock, sales and reports.",
  cashier: "Processes sales, receipts and customer records.",
  inventory_officer: "Manages stock, transfers and stocktaking.",
  accountant: "Handles expenses, reconciliation and financial reports.",
  sales_representative: "Handles sales and customer relationships.",
};
