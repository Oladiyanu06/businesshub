-- BUSINESSHUB — Phase 1 schema
-- Multi-tenant business management platform (shared database, row-level isolation).
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor
-- in numbered order.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Global reference data
-- ---------------------------------------------------------------------------
create table public.permissions (
  key         text primary key,
  module      text not null,
  action      text not null,
  description text not null
);

comment on table public.permissions is
  'Immutable catalogue of application permissions. Keys are referenced by role permissions and server-side guards.';

create table public.role_templates (
  key           text primary key,
  name          text not null,
  description   text not null,
  is_assignable boolean not null default true
);

create table public.role_template_permissions (
  template_key   text not null references public.role_templates(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (template_key, permission_key)
);

-- ---------------------------------------------------------------------------
-- Platform level
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

comment on table public.platform_admins is
  'Owners/operators of BUSINESSHUB. Deliberately has no blanket access to tenant transaction tables.';

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
create table public.businesses (
  id                         uuid primary key default gen_random_uuid(),
  name                       text not null check (char_length(trim(name)) between 2 and 120),
  slug                       text not null unique
                               check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legal_name                 text,
  email                      text,
  phone                      text,
  address                    text,
  city                       text,
  state                      text,
  country                    text not null default 'Nigeria',
  currency                   char(3) not null default 'NGN',
  timezone                   text not null default 'Africa/Lagos',
  logo_url                   text,
  status                     text not null default 'active'
                               check (status in ('active', 'suspended', 'archived')),
  -- Commercial licensing is recorded, never billed by this application.
  license_reference          text,
  licensed_until             date,
  license_notes              text,
  expense_approval_threshold numeric(14,2) not null default 0 check (expense_approval_threshold >= 0),
  offline_session_hours      integer not null default 72 check (offline_session_hours between 1 and 720),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  code        text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{0,15}$'),
  address     text,
  phone       text,
  is_default  boolean not null default false,
  status      text not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, code),
  unique (business_id, id)
);

create unique index branches_one_default_per_business
  on public.branches (business_id) where is_default;

create table public.employees (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references public.businesses(id) on delete cascade,
  user_id              uuid not null unique references auth.users(id) on delete cascade,
  employee_number      text not null,
  full_name            text not null check (char_length(trim(full_name)) between 2 and 120),
  email                text not null,
  phone                text,
  branch_id            uuid,
  designation          text,
  status               text not null default 'active'
                         check (status in ('active', 'suspended', 'terminated')),
  must_change_password boolean not null default true,
  hired_on             date,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (business_id, employee_number),
  unique (business_id, id),
  foreign key (business_id, branch_id) references public.branches(business_id, id)
);

create unique index employees_business_email_key on public.employees (business_id, lower(email));
create index employees_business_idx on public.employees (business_id);
create index employees_branch_idx on public.employees (business_id, branch_id);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  key         text not null check (key ~ '^[a-z][a-z0-9_]{1,49}$'),
  name        text not null check (char_length(trim(name)) between 2 and 60),
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, key),
  unique (business_id, id)
);

create table public.role_permissions (
  business_id    uuid not null references public.businesses(id) on delete cascade,
  role_id        uuid not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key),
  foreign key (business_id, role_id) references public.roles(business_id, id) on delete cascade
);

create index role_permissions_business_idx on public.role_permissions (business_id);

create table public.employee_roles (
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null,
  role_id     uuid not null,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.employees(id),
  primary key (employee_id, role_id),
  foreign key (business_id, employee_id) references public.employees(business_id, id) on delete cascade,
  foreign key (business_id, role_id) references public.roles(business_id, id) on delete cascade
);

create index employee_roles_business_idx on public.employee_roles (business_id);
create index employee_roles_role_idx on public.employee_roles (role_id);

-- ---------------------------------------------------------------------------
-- Devices (offline-mode foundation)
-- ---------------------------------------------------------------------------
create table public.devices (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  employee_id         uuid not null,
  device_name         text not null check (char_length(trim(device_name)) between 1 and 80),
  device_fingerprint  text not null check (char_length(device_fingerprint) between 32 and 128),
  platform            text,
  app_version         text,
  status              text not null default 'active' check (status in ('active', 'revoked')),
  offline_expiry_hours integer not null default 72 check (offline_expiry_hours between 1 and 720),
  registered_at       timestamptz not null default now(),
  last_seen_at        timestamptz,
  revoked_at          timestamptz,
  revoked_by          uuid references public.employees(id),
  unique (business_id, device_fingerprint),
  foreign key (business_id, employee_id) references public.employees(business_id, id) on delete cascade
);

create index devices_business_idx on public.devices (business_id);
create index devices_employee_idx on public.devices (business_id, employee_id);

-- ---------------------------------------------------------------------------
-- Activity & audit
-- ---------------------------------------------------------------------------
create table public.login_events (
  id          bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  email       text not null,
  event       text not null check (event in ('login', 'logout', 'failed_login', 'offline_login')),
  ip          inet,
  user_agent  text,
  device_id   uuid references public.devices(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index login_events_business_idx on public.login_events (business_id, created_at desc);
create index login_events_user_idx on public.login_events (user_id, created_at desc);

create table public.audit_logs (
  id               bigint generated always as identity primary key,
  business_id      uuid references public.businesses(id) on delete set null,
  actor_user_id    uuid,
  actor_employee_id uuid,
  action           text not null,
  entity_type      text not null,
  entity_id        text,
  metadata         jsonb not null default '{}'::jsonb,
  ip               inet,
  user_agent       text,
  created_at       timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit trail. Clients have no UPDATE or DELETE privilege on this table.';

create index audit_logs_business_idx on public.audit_logs (business_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Permission catalogue
-- ---------------------------------------------------------------------------
insert into public.permissions (key, module, action, description) values
  ('business.view',        'Business',   'view',      'View the business profile'),
  ('business.settings',    'Business',   'settings',  'Change business profile and operational settings'),
  ('branch.view',          'Branches',   'view',      'View branches'),
  ('branch.manage',        'Branches',   'manage',    'Create and edit branches'),
  ('employee.view',        'Employees',  'view',      'View employee records and activity'),
  ('employee.manage',      'Employees',  'manage',    'Register, edit, suspend and assign roles to employees'),
  ('role.view',            'Roles',      'view',      'View roles and permissions'),
  ('role.manage',          'Roles',      'manage',    'Create roles and change role permissions'),
  ('device.view',          'Devices',    'view',      'View registered offline devices'),
  ('device.manage',        'Devices',    'manage',    'Register and revoke offline devices'),
  ('audit.view',           'Audit',      'view',      'View the business audit trail'),
  ('product.view',         'Products',   'view',      'View products and prices'),
  ('product.manage',       'Products',   'manage',    'Create and edit products'),
  ('inventory.view',       'Inventory',  'view',      'View stock levels and movements'),
  ('inventory.adjust',     'Inventory',  'adjust',    'Post stock adjustments'),
  ('inventory.receive',    'Inventory',  'receive',   'Receive incoming stock'),
  ('inventory.stocktake',  'Inventory',  'stocktake', 'Perform physical stocktaking'),
  ('transfer.view',        'Transfers',  'view',      'View stock transfers'),
  ('transfer.request',     'Transfers',  'request',   'Request stock from another branch'),
  ('transfer.approve',     'Transfers',  'approve',   'Approve or reject stock transfers'),
  ('transfer.receive',     'Transfers',  'receive',   'Confirm receipt of transferred stock'),
  ('sale.create',          'Sales',      'create',    'Process sales'),
  ('sale.view',            'Sales',      'view',      'View sales and receipts'),
  ('sale.discount',        'Sales',      'discount',  'Apply discounts'),
  ('sale.void',            'Sales',      'void',      'Reverse a completed sale'),
  ('sale.refund',          'Sales',      'refund',    'Process refunds and returns'),
  ('customer.view',        'Customers',  'view',      'View customer records and purchase history'),
  ('customer.manage',      'Customers',  'manage',    'Create and correct customer records'),
  ('supplier.view',        'Suppliers',  'view',      'View suppliers'),
  ('supplier.manage',      'Suppliers',  'manage',    'Create and edit suppliers'),
  ('expense.view',         'Finance',    'view',      'View expenses'),
  ('expense.manage',       'Finance',    'manage',    'Record expenses'),
  ('expense.approve',      'Finance',    'approve',   'Approve expenses above the configured threshold'),
  ('finance.view',         'Finance',    'view',      'View financial summaries'),
  ('finance.reconcile',    'Finance',    'reconcile', 'Perform cash reconciliation'),
  ('report.view',          'Reports',    'view',      'View daily and consolidated reports'),
  ('report.export',        'Reports',    'export',    'Export or email reports'),
  ('analytics.view',       'Analytics',  'view',      'View business analytics'),
  ('wholesale.view',       'Wholesale',  'view',      'View wholesaler collections and returns'),
  ('wholesale.manage',     'Wholesale',  'manage',    'Record collections and returns'),
  ('feedback.submit',      'Feedback',   'submit',    'Submit suggestions and complaints'),
  ('feedback.review',      'Feedback',   'review',    'Review and respond to employee feedback'),
  ('attendance.clock',     'Attendance', 'clock',     'Clock in and out'),
  ('attendance.view',      'Attendance', 'view',      'View attendance records'),
  ('attendance.manage',    'Attendance', 'manage',    'Correct attendance records');

-- ---------------------------------------------------------------------------
-- Role templates (copied into each business at provisioning time)
-- ---------------------------------------------------------------------------
insert into public.role_templates (key, name, description, is_assignable) values
  ('business_admin',   'Business Administrator', 'Full control of the business environment.', true),
  ('branch_manager',   'Branch Manager',         'Runs a branch: people, stock, sales and reports.', true),
  ('cashier',          'Cashier',                'Processes sales, receipts and customer records.', true),
  ('inventory_officer','Inventory Officer',      'Manages stock, transfers and stocktaking.', true),
  ('accountant',       'Accountant',             'Handles expenses, reconciliation and financial reports.', true),
  ('sales_representative','Sales Representative','Handles sales and customer relationships.', true);

insert into public.role_template_permissions (template_key, permission_key)
select 'business_admin', key from public.permissions;

insert into public.role_template_permissions (template_key, permission_key) values
  ('branch_manager','business.view'), ('branch_manager','branch.view'), ('branch_manager','employee.view'),
  ('branch_manager','role.view'), ('branch_manager','device.view'), ('branch_manager','product.view'),
  ('branch_manager','inventory.view'), ('branch_manager','inventory.adjust'), ('branch_manager','inventory.receive'),
  ('branch_manager','inventory.stocktake'), ('branch_manager','transfer.view'), ('branch_manager','transfer.request'),
  ('branch_manager','transfer.approve'), ('branch_manager','transfer.receive'), ('branch_manager','sale.create'),
  ('branch_manager','sale.view'), ('branch_manager','sale.discount'), ('branch_manager','sale.void'),
  ('branch_manager','sale.refund'), ('branch_manager','customer.view'), ('branch_manager','customer.manage'),
  ('branch_manager','supplier.view'), ('branch_manager','expense.view'), ('branch_manager','expense.manage'),
  ('branch_manager','finance.view'), ('branch_manager','report.view'), ('branch_manager','report.export'),
  ('branch_manager','analytics.view'), ('branch_manager','wholesale.view'), ('branch_manager','wholesale.manage'),
  ('branch_manager','feedback.submit'), ('branch_manager','feedback.review'), ('branch_manager','attendance.clock'),
  ('branch_manager','attendance.view'), ('branch_manager','attendance.manage'),
  ('cashier','business.view'), ('cashier','branch.view'), ('cashier','product.view'), ('cashier','inventory.view'),
  ('cashier','sale.create'), ('cashier','sale.view'), ('cashier','customer.view'), ('cashier','customer.manage'),
  ('cashier','report.view'), ('cashier','feedback.submit'), ('cashier','attendance.clock'),
  ('inventory_officer','business.view'), ('inventory_officer','branch.view'), ('inventory_officer','product.view'),
  ('inventory_officer','product.manage'), ('inventory_officer','inventory.view'), ('inventory_officer','inventory.adjust'),
  ('inventory_officer','inventory.receive'), ('inventory_officer','inventory.stocktake'),
  ('inventory_officer','transfer.view'), ('inventory_officer','transfer.request'),
  ('inventory_officer','transfer.approve'), ('inventory_officer','transfer.receive'),
  ('inventory_officer','supplier.view'), ('inventory_officer','supplier.manage'), ('inventory_officer','report.view'),
  ('inventory_officer','feedback.submit'), ('inventory_officer','attendance.clock'),
  ('accountant','business.view'), ('accountant','branch.view'), ('accountant','product.view'),
  ('accountant','inventory.view'), ('accountant','customer.view'), ('accountant','supplier.view'),
  ('accountant','expense.view'), ('accountant','expense.manage'), ('accountant','expense.approve'),
  ('accountant','finance.view'), ('accountant','finance.reconcile'), ('accountant','report.view'),
  ('accountant','report.export'), ('accountant','analytics.view'), ('accountant','audit.view'),
  ('accountant','feedback.submit'), ('accountant','attendance.clock'),
  ('sales_representative','business.view'), ('sales_representative','branch.view'),
  ('sales_representative','product.view'), ('sales_representative','inventory.view'),
  ('sales_representative','sale.create'), ('sales_representative','sale.view'), ('sales_representative','sale.discount'),
  ('sales_representative','customer.view'), ('sales_representative','customer.manage'),
  ('sales_representative','wholesale.view'), ('sales_representative','wholesale.manage'),
  ('sales_representative','report.view'), ('sales_representative','analytics.view'),
  ('sales_representative','feedback.submit'), ('sales_representative','attendance.clock');

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger branches_set_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees
  for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
