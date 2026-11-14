-- BUSINESSHUB — Phase 1 row-level security
-- Principle: every tenant table is reachable only when the row's business_id
-- matches current_business_id(); sensitive verbs additionally require a
-- permission. Platform administrators get NO blanket policy on tenant data.

alter table public.permissions            enable row level security;
alter table public.role_templates         enable row level security;
alter table public.role_template_permissions enable row level security;
alter table public.platform_admins        enable row level security;
alter table public.businesses             enable row level security;
alter table public.branches               enable row level security;
alter table public.employees              enable row level security;
alter table public.roles                  enable row level security;
alter table public.role_permissions       enable row level security;
alter table public.employee_roles         enable row level security;
alter table public.devices                enable row level security;
alter table public.login_events           enable row level security;
alter table public.audit_logs             enable row level security;

-- ---------------------------------------------------------------------------
-- Global catalogue (read-only to signed-in users)
-- ---------------------------------------------------------------------------
create policy permissions_read on public.permissions
  for select to authenticated using (true);

create policy role_templates_read on public.role_templates
  for select to authenticated using (true);

create policy role_template_permissions_read on public.role_template_permissions
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------------
create policy platform_admins_read_self on public.platform_admins
  for select to authenticated
  using (user_id = auth.uid());

-- Platform operators may list and configure businesses, but never read tenant
-- transaction data unless a tenant grants a recorded, time-boxed exception.
create policy businesses_platform_read on public.businesses
  for select to authenticated
  using (public.is_platform_admin());

create policy businesses_tenant_read on public.businesses
  for select to authenticated
  using (id = public.current_business_id());

create policy businesses_platform_insert on public.businesses
  for insert to authenticated
  with check (public.is_platform_admin());

create policy businesses_platform_update on public.businesses
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy businesses_tenant_update on public.businesses
  for update to authenticated
  using (
    id = public.current_business_id()
    and public.has_permission('business.settings')
  )
  with check (
    id = public.current_business_id()
    and public.has_permission('business.settings')
  );

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------
create policy branches_read on public.branches
  for select to authenticated
  using (
    business_id = public.current_business_id()
    and (
      public.has_permission('branch.view')
      or id = (select e.branch_id from public.employees e where e.id = public.current_employee_id())
    )
  );

create policy branches_insert on public.branches
  for insert to authenticated
  with check (
    business_id = public.current_business_id()
    and public.has_permission('branch.manage')
  );

create policy branches_update on public.branches
  for update to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('branch.manage')
  )
  with check (
    business_id = public.current_business_id()
    and public.has_permission('branch.manage')
  );

create policy branches_delete on public.branches
  for delete to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('branch.manage')
  );

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
create policy employees_read on public.employees
  for select to authenticated
  using (
    business_id = public.current_business_id()
    and (
      user_id = auth.uid()
      or public.has_permission('employee.view')
    )
  );

create policy employees_insert on public.employees
  for insert to authenticated
  with check (
    business_id = public.current_business_id()
    and public.has_permission('employee.manage')
  );

create policy employees_update on public.employees
  for update to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('employee.manage')
  )
  with check (
    business_id = public.current_business_id()
    and public.has_permission('employee.manage')
  );

-- Employees are suspended or terminated rather than deleted, preserving the
-- audit trail and every transaction they were responsible for.

-- ---------------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------------
create policy roles_read on public.roles
  for select to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('role.view')
  );

create policy roles_insert on public.roles
  for insert to authenticated
  with check (
    business_id = public.current_business_id()
    and public.has_permission('role.manage')
  );

create policy roles_update on public.roles
  for update to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('role.manage')
  )
  with check (
    business_id = public.current_business_id()
    and public.has_permission('role.manage')
  );

create policy roles_delete on public.roles
  for delete to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('role.manage')
  );

create policy role_permissions_read on public.role_permissions
  for select to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('role.view')
  );

create policy role_permissions_insert on public.role_permissions
  for insert to authenticated
  with check (
    business_id = public.current_business_id()
    and public.has_permission('role.manage')
  );

create policy role_permissions_delete on public.role_permissions
  for delete to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('role.manage')
  );

create policy employee_roles_read on public.employee_roles
  for select to authenticated
  using (
    business_id = public.current_business_id()
    and (
      public.has_permission('employee.view')
      or employee_id = public.current_employee_id()
    )
  );

create policy employee_roles_insert on public.employee_roles
  for insert to authenticated
  with check (
    business_id = public.current_business_id()
    and public.has_permission('employee.manage')
  );

create policy employee_roles_delete on public.employee_roles
  for delete to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('employee.manage')
  );

-- ---------------------------------------------------------------------------
-- Devices
-- ---------------------------------------------------------------------------
create policy devices_read on public.devices
  for select to authenticated
  using (
    business_id = public.current_business_id()
    and (
      public.has_permission('device.view')
      or employee_id = public.current_employee_id()
    )
  );

create policy devices_register_own on public.devices
  for insert to authenticated
  with check (
    business_id = public.current_business_id()
    and employee_id = public.current_employee_id()
    and status = 'active'
  );

create policy devices_manage on public.devices
  for update to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('device.manage')
  )
  with check (
    business_id = public.current_business_id()
    and public.has_permission('device.manage')
  );

-- ---------------------------------------------------------------------------
-- Login events
-- ---------------------------------------------------------------------------
create policy login_events_read on public.login_events
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      business_id = public.current_business_id()
      and public.has_permission('employee.view')
    )
  );

create policy login_events_insert on public.login_events
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      business_id = public.current_business_id()
      or (business_id is null and public.is_platform_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
create policy audit_logs_tenant_read on public.audit_logs
  for select to authenticated
  using (
    business_id = public.current_business_id()
    and public.has_permission('audit.view')
  );

-- Platform operators see platform-level audit entries only (business_id null).
create policy audit_logs_platform_read on public.audit_logs
  for select to authenticated
  using (
    public.is_platform_admin()
    and business_id is null
  );

-- ---------------------------------------------------------------------------
-- Privilege hardening
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.audit_logs from anon, authenticated;
revoke update, delete on public.login_events from anon, authenticated;
revoke insert, update, delete on public.platform_admins from anon, authenticated;
revoke insert, update, delete on public.permissions from anon, authenticated;
revoke insert, update, delete on public.role_templates from anon, authenticated;
revoke insert, update, delete on public.role_template_permissions from anon, authenticated;
