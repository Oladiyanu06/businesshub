-- BUSINESSHUB — Phase 1 authorization helpers
-- All helpers are SECURITY DEFINER so they can read tenant tables without
-- recursing through RLS. They are STABLE and read the caller identity from
-- auth.uid(), which cannot be spoofed by the client.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.employees e
  join public.businesses b on b.id = e.business_id
  where e.user_id = auth.uid()
    and e.status = 'active'
    and b.status = 'active'
  limit 1;
$$;

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.business_id
  from public.employees e
  join public.businesses b on b.id = e.business_id
  where e.user_id = auth.uid()
    and e.status = 'active'
    and b.status = 'active'
  limit 1;
$$;

create or replace function public.actor_has_permission(p_business_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees e
    join public.businesses b on b.id = e.business_id
    join public.employee_roles er
      on er.employee_id = e.id and er.business_id = e.business_id
    join public.roles r
      on r.id = er.role_id and r.business_id = e.business_id
    join public.role_permissions rp
      on rp.role_id = r.id and rp.business_id = r.business_id
    where e.user_id = auth.uid()
      and e.business_id = p_business_id
      and e.status = 'active'
      and b.status = 'active'
      and rp.permission_key = p_permission
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees e
    join public.businesses b on b.id = e.business_id
    join public.employee_roles er
      on er.employee_id = e.id and er.business_id = e.business_id
    join public.roles r
      on r.id = er.role_id and r.business_id = e.business_id
    join public.role_permissions rp
      on rp.role_id = r.id and rp.business_id = r.business_id
    where e.user_id = auth.uid()
      and e.status = 'active'
      and b.status = 'active'
      and rp.permission_key = p_permission
  );
$$;

-- Single round-trip bootstrap payload used by the web app and (from Phase 3)
-- by the offline provisioning endpoint.
create or replace function public.get_my_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'is_platform_admin', public.is_platform_admin(),
    'platform_admin', (
      select jsonb_build_object('full_name', pa.full_name, 'email', pa.email)
      from public.platform_admins pa
      where pa.user_id = auth.uid()
      limit 1
    ),
    'employee', (
      select jsonb_build_object(
        'id', e.id,
        'business_id', e.business_id,
        'employee_number', e.employee_number,
        'full_name', e.full_name,
        'email', e.email,
        'phone', e.phone,
        'branch_id', e.branch_id,
        'designation', e.designation,
        'status', e.status,
        'must_change_password', e.must_change_password,
        'last_login_at', e.last_login_at
      )
      from public.employees e
      where e.user_id = auth.uid()
      limit 1
    ),
    'business', (
      select jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'currency', b.currency,
        'timezone', b.timezone,
        'status', b.status,
        'logo_url', b.logo_url,
        'offline_session_hours', b.offline_session_hours,
        'expense_approval_threshold', b.expense_approval_threshold
      )
      from public.businesses b
      join public.employees e on e.business_id = b.id
      where e.user_id = auth.uid()
      limit 1
    ),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'key', r.key, 'name', r.name) order by r.name)
      from public.employee_roles er
      join public.roles r on r.id = er.role_id
      join public.employees e on e.id = er.employee_id
      where e.user_id = auth.uid()
        and e.status = 'active'
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(distinct rp.permission_key)
      from public.employees e
      join public.businesses b on b.id = e.business_id
      join public.employee_roles er
        on er.employee_id = e.id and er.business_id = e.business_id
      join public.roles r
        on r.id = er.role_id and r.business_id = e.business_id
      join public.role_permissions rp
        on rp.role_id = r.id and rp.business_id = r.business_id
      where e.user_id = auth.uid()
        and e.status = 'active'
        and b.status = 'active'
    ), '[]'::jsonb)
  );
$$;

-- Heartbeat for an authorised device (Phase 3 uses this before syncing).
create or replace function public.touch_device(p_device_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.devices d
     set last_seen_at = now()
   where d.id = p_device_id
     and d.business_id = public.current_business_id()
     and d.employee_id = public.current_employee_id()
     and d.status = 'active';
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.current_employee_id() from public;
revoke all on function public.current_business_id() from public;
revoke all on function public.actor_has_permission(uuid, text) from public;
revoke all on function public.has_permission(text) from public;
revoke all on function public.get_my_context() from public;
revoke all on function public.touch_device(uuid) from public;

grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.current_employee_id() to authenticated, service_role;
grant execute on function public.current_business_id() to authenticated, service_role;
grant execute on function public.actor_has_permission(uuid, text) to authenticated, service_role;
grant execute on function public.has_permission(text) to authenticated, service_role;
grant execute on function public.get_my_context() to authenticated, service_role;
grant execute on function public.touch_device(uuid) to authenticated, service_role;
