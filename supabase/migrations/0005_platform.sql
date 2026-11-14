-- BUSINESSHUB — Phase 1 platform administration functions
-- Platform operators can see business-level account information but not sales,
-- customers, inventory, expenses or any other private tenant transaction.

create or replace function public.platform_business_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(row_data order by row_data->>'created_at' desc)
    from (
      select jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'status', b.status,
        'currency', b.currency,
        'country', b.country,
        'license_reference', b.license_reference,
        'licensed_until', b.licensed_until,
        'created_at', b.created_at,
        'employee_count', (
          select count(*) from public.employees e
          where e.business_id = b.id and e.status = 'active'
        ),
        'branch_count', (
          select count(*) from public.branches br
          where br.business_id = b.id and br.status = 'active'
        ),
        'admin_name', (
          select e.full_name
          from public.employees e
          join public.employee_roles er on er.employee_id = e.id
          join public.roles r on r.id = er.role_id
          where e.business_id = b.id and r.key = 'business_admin' and e.status = 'active'
          order by e.created_at
          limit 1
        ),
        'admin_email', (
          select e.email
          from public.employees e
          join public.employee_roles er on er.employee_id = e.id
          join public.roles r on r.id = er.role_id
          where e.business_id = b.id and r.key = 'business_admin' and e.status = 'active'
          order by e.created_at
          limit 1
        )
      ) as row_data
      from public.businesses b
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.platform_business_detail(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug,
      'legal_name', b.legal_name,
      'email', b.email,
      'phone', b.phone,
      'address', b.address,
      'city', b.city,
      'state', b.state,
      'country', b.country,
      'currency', b.currency,
      'timezone', b.timezone,
      'status', b.status,
      'license_reference', b.license_reference,
      'licensed_until', b.licensed_until,
      'license_notes', b.license_notes,
      'created_at', b.created_at,
      'employee_count', (
        select count(*) from public.employees e
        where e.business_id = b.id and e.status = 'active'
      ),
      'branch_count', (
        select count(*) from public.branches br
        where br.business_id = b.id and br.status = 'active'
      ),
      'administrators', coalesce((
        select jsonb_agg(jsonb_build_object(
          'employee_id', e.id,
          'full_name', e.full_name,
          'email', e.email,
          'phone', e.phone,
          'status', e.status
        ) order by e.created_at)
        from public.employees e
        join public.employee_roles er on er.employee_id = e.id
        join public.roles r on r.id = er.role_id
        where e.business_id = b.id and r.key = 'business_admin'
      ), '[]'::jsonb)
    )
    from public.businesses b
    where b.id = p_business_id
  );
end;
$$;

create or replace function public.log_platform_action(
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_metadata    jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    null, auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.platform_business_directory() from public;
revoke all on function public.platform_business_detail(uuid) from public;
revoke all on function public.log_platform_action(text, text, text, jsonb) from public;

grant execute on function public.platform_business_directory() to authenticated;
grant execute on function public.platform_business_detail(uuid) to authenticated;
grant execute on function public.log_platform_action(text, text, text, jsonb) to authenticated;
