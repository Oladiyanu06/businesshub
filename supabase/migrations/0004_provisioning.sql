-- BUSINESSHUB — Phase 1 guards, audit triggers and provisioning
-- Provisioning is transactional at the database level. Supabase Auth users are
-- created server-side first; if provisioning fails the server compensates by
-- deleting the auth user.

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_entity_id   text;
  v_old         jsonb;
  v_new         jsonb;
  v_actor       uuid := auth.uid();
  v_employee    uuid := public.current_employee_id();
begin
  -- Only tenant-scoped employee actions are captured automatically.
  -- Platform and service operations are recorded explicitly by the server so
  -- that platform audit entries never expose tenant transaction contents.
  if v_employee is null then
    return coalesce(new, old);
  end if;

  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;

  if tg_table_name = 'businesses' then
    v_business_id := coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  else
    v_business_id := coalesce((v_new->>'business_id')::uuid, (v_old->>'business_id')::uuid);
  end if;

  v_entity_id := coalesce(v_new->>'id', v_old->>'id');

  insert into public.audit_logs (
    business_id, actor_user_id, actor_employee_id, action,
    entity_type, entity_id, metadata
  ) values (
    v_business_id, v_actor, v_employee, lower(tg_op),
    tg_table_name, v_entity_id,
    jsonb_build_object('old', v_old, 'new', v_new)
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_businesses      after insert or update on public.businesses
  for each row execute function public.audit_row_change();
create trigger audit_branches        after insert or update or delete on public.branches
  for each row execute function public.audit_row_change();
create trigger audit_employees       after insert or update on public.employees
  for each row execute function public.audit_row_change();
create trigger audit_roles           after insert or update or delete on public.roles
  for each row execute function public.audit_row_change();
create trigger audit_role_permissions after insert or delete on public.role_permissions
  for each row execute function public.audit_row_change();
create trigger audit_employee_roles  after insert or delete on public.employee_roles
  for each row execute function public.audit_row_change();
create trigger audit_devices         after insert or update or delete on public.devices
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Integrity guards
-- ---------------------------------------------------------------------------
create or replace function public.guard_business_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Trusted server/service operations have no end-user identity.
  if auth.uid() is not null and not public.is_platform_admin() then
    if new.status is distinct from old.status
       or new.license_reference is distinct from old.license_reference
       or new.licensed_until is distinct from old.licensed_until
       or new.license_notes is distinct from old.license_notes then
      raise exception 'Only the platform administrator can change activation or licensing.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_guard_update before update on public.businesses
  for each row execute function public.guard_business_update();

create or replace function public.guard_employee_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.user_id is distinct from old.user_id then
    raise exception 'An employee cannot be moved to another business or account.'
      using errcode = '42501';
  end if;

  if new.id = public.current_employee_id() and new.status is distinct from old.status then
    raise exception 'You cannot change your own employment status.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger employees_guard_update before update on public.employees
  for each row execute function public.guard_employee_update();

create or replace function public.guard_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'System roles cannot be deleted.' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.is_system and new.key is distinct from old.key then
    raise exception 'A system role key cannot be changed.' using errcode = '42501';
  end if;

  if old.is_system and new.business_id is distinct from old.business_id then
    raise exception 'A role cannot be moved between businesses.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger roles_guard before update or delete on public.roles
  for each row execute function public.guard_role_change();

create or replace function public.guard_role_permission_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_key text;
begin
  select r.key into v_role_key from public.roles r where r.id = old.role_id;

  if v_role_key = 'business_admin' then
    raise exception 'The Business Administrator role always retains full permissions.'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

create trigger role_permissions_guard_delete before delete on public.role_permissions
  for each row execute function public.guard_role_permission_delete();

create or replace function public.guard_employee_role_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_key text;
  v_remaining integer;
begin
  select r.key into v_role_key from public.roles r where r.id = old.role_id;

  if v_role_key = 'business_admin' then
    select count(*) into v_remaining
    from public.employee_roles er
    join public.roles r on r.id = er.role_id
    join public.employees e on e.id = er.employee_id
    where er.business_id = old.business_id
      and r.key = 'business_admin'
      and e.status = 'active'
      and er.employee_id <> old.employee_id;

    if v_remaining = 0 then
      raise exception 'The business must retain at least one active Business Administrator.'
        using errcode = '42501';
    end if;
  end if;

  return old;
end;
$$;

create trigger employee_roles_guard_delete before delete on public.employee_roles
  for each row execute function public.guard_employee_role_delete();

create or replace function public.revoke_employee_devices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' and old.status = 'active' then
    update public.devices
       set status = 'revoked',
           revoked_at = now(),
           revoked_by = new.id
     where employee_id = new.id
       and status = 'active';
  end if;
  return new;
end;
$$;

create trigger employees_revoke_devices after update of status on public.employees
  for each row execute function public.revoke_employee_devices();

-- ---------------------------------------------------------------------------
-- Password-change completion (only the authenticated employee can clear it)
-- ---------------------------------------------------------------------------
create or replace function public.mark_password_changed()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.employees
     set must_change_password = false,
         last_login_at = now()
   where user_id = auth.uid();
$$;

revoke all on function public.mark_password_changed() from public;
grant execute on function public.mark_password_changed() to authenticated;

-- ---------------------------------------------------------------------------
-- Provision a complete business environment (platform administrator only)
-- ---------------------------------------------------------------------------
create or replace function public.provision_business(
  p_name            text,
  p_slug            text,
  p_currency        text,
  p_country         text,
  p_timezone        text,
  p_branch_name     text,
  p_admin_user_id   uuid,
  p_admin_full_name text,
  p_admin_email     text,
  p_admin_phone     text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id  uuid;
  v_branch_id    uuid;
  v_employee_id  uuid;
  v_admin_role   uuid;
  v_slug         text := lower(trim(p_slug));
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform administrator can register a business.'
      using errcode = '42501';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid business slug.' using errcode = '22023';
  end if;

  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code.' using errcode = '22023';
  end if;

  if exists (select 1 from public.businesses b where b.slug = v_slug) then
    raise exception 'That business slug is already in use.' using errcode = '23505';
  end if;

  if exists (select 1 from public.employees e where e.user_id = p_admin_user_id) then
    raise exception 'This user account already belongs to a business.' using errcode = '23505';
  end if;

  insert into public.businesses (
    name, slug, email, phone, country, currency, timezone, status
  ) values (
    trim(p_name), v_slug, lower(trim(p_admin_email)), p_admin_phone,
    coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    p_currency,
    coalesce(nullif(trim(p_timezone), ''), 'Africa/Lagos'),
    'active'
  )
  returning id into v_business_id;

  insert into public.branches (business_id, name, code, is_default, status)
  values (v_business_id, coalesce(nullif(trim(p_branch_name), ''), 'Head Office'), 'MAIN', true, 'active')
  returning id into v_branch_id;

  insert into public.roles (business_id, key, name, description, is_system)
  select v_business_id, rt.key, rt.name, rt.description, true
  from public.role_templates rt
  where rt.is_assignable;

  insert into public.role_permissions (business_id, role_id, permission_key)
  select v_business_id, r.id, rtp.permission_key
  from public.roles r
  join public.role_template_permissions rtp on rtp.template_key = r.key
  where r.business_id = v_business_id;

  select r.id into v_admin_role
  from public.roles r
  where r.business_id = v_business_id and r.key = 'business_admin';

  insert into public.employees (
    business_id, user_id, employee_number, full_name, email, phone,
    branch_id, designation, status, must_change_password
  ) values (
    v_business_id, p_admin_user_id, 'ADM-0001', trim(p_admin_full_name),
    lower(trim(p_admin_email)), p_admin_phone, v_branch_id,
    'Business Administrator', 'active', true
  )
  returning id into v_employee_id;

  insert into public.employee_roles (business_id, employee_id, role_id, assigned_by)
  values (v_business_id, v_employee_id, v_admin_role, v_employee_id);

  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    null, auth.uid(), 'platform.business_provisioned', 'business', v_business_id::text,
    jsonb_build_object(
      'business_name', trim(p_name),
      'slug', v_slug,
      'admin_employee_id', v_employee_id,
      'branch_id', v_branch_id
    )
  );

  return jsonb_build_object(
    'business_id', v_business_id,
    'branch_id', v_branch_id,
    'employee_id', v_employee_id,
    'admin_role_id', v_admin_role
  );
end;
$$;

revoke all on function public.provision_business(text, text, text, text, text, text, uuid, text, text, text) from public;
grant execute on function public.provision_business(text, text, text, text, text, text, uuid, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Provision an employee (business administrator / employee.manage only)
-- ---------------------------------------------------------------------------
create or replace function public.provision_employee(
  p_business_id      uuid,
  p_user_id          uuid,
  p_full_name        text,
  p_email            text,
  p_phone            text,
  p_employee_number  text,
  p_branch_id        uuid,
  p_designation      text,
  p_role_ids         uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_actor       uuid := public.current_employee_id();
  v_number      text;
begin
  if not public.actor_has_permission(p_business_id, 'employee.manage') then
    raise exception 'Not authorised to register employees.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.businesses b where b.id = p_business_id and b.status = 'active'
  ) then
    raise exception 'The business environment is not active.' using errcode = '42501';
  end if;

  if p_branch_id is not null and not exists (
    select 1 from public.branches br
    where br.id = p_branch_id and br.business_id = p_business_id
  ) then
    raise exception 'Branch does not belong to this business.' using errcode = '22023';
  end if;

  if exists (select 1 from public.employees e where e.user_id = p_user_id) then
    raise exception 'This user account is already linked to an employee.' using errcode = '23505';
  end if;

  v_number := nullif(trim(p_employee_number), '');
  if v_number is null then
    v_number := 'EMP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;

  insert into public.employees (
    business_id, user_id, employee_number, full_name, email, phone,
    branch_id, designation, status, must_change_password
  ) values (
    p_business_id, p_user_id, v_number, trim(p_full_name),
    lower(trim(p_email)), nullif(trim(p_phone), ''), p_branch_id,
    nullif(trim(p_designation), ''), 'active', true
  )
  returning id into v_employee_id;

  insert into public.employee_roles (business_id, employee_id, role_id, assigned_by)
  select p_business_id, v_employee_id, r.id, v_actor
  from public.roles r
  where r.business_id = p_business_id
    and r.id = any(coalesce(p_role_ids, '{}'::uuid[]));

  return v_employee_id;
end;
$$;

revoke all on function public.provision_employee(uuid, uuid, text, text, text, text, uuid, text, uuid[]) from public;
grant execute on function public.provision_employee(uuid, uuid, text, text, text, text, uuid, text, uuid[]) to authenticated, service_role;
