import Link from "next/link";
import { ScrollText, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, titleCase } from "@/lib/utils";

const PAGE_SIZE = 30;

type AuditRow = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_employee_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ENTITY_TYPES = [
  "businesses",
  "branches",
  "employees",
  "roles",
  "role_permissions",
  "employee_roles",
  "devices",
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>;
}) {
  await requirePermission("audit.view");
  const params = await searchParams;
  const supabase = await createClient();

  const entity = ENTITY_TYPES.includes(params.entity ?? "") ? (params.entity as string) : "";
  const action = ["insert", "update", "delete"].includes(params.action ?? "")
    ? (params.action as string)
    : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let query = supabase
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, actor_employee_id, metadata, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (entity) query = query.eq("entity_type", entity);
  if (action) query = query.eq("action", action);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const entries = (data ?? []) as AuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const actorIds = Array.from(
    new Set(entries.map((row) => row.actor_employee_id).filter(Boolean)),
  ) as string[];

  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", actorIds);
    for (const actor of actors ?? []) actorNames.set(actor.id, actor.full_name);
  }

  const makeHref = (target: number) => {
    const search = new URLSearchParams();
    if (entity) search.set("entity", entity);
    if (action) search.set("action", action);
    if (target > 1) search.set("page", String(target));
    const value = search.toString();
    return value ? `/app/audit?${value}` : "/app/audit";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        description="Append-only record of important changes. Entries cannot be edited or deleted from the application."
      />

      <Card>
        <CardBody className="border-b border-slate-100 py-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <label htmlFor="entity" className="mb-1 block text-xs font-medium text-slate-600">
                Record type
              </label>
              <Select id="entity" name="entity" defaultValue={entity}>
                <option value="">All records</option>
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {titleCase(type)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-40">
              <label htmlFor="action" className="mb-1 block text-xs font-medium text-slate-600">
                Action
              </label>
              <Select id="action" name="action" defaultValue={action}>
                <option value="">All actions</option>
                <option value="insert">Created</option>
                <option value="update">Updated</option>
                <option value="delete">Deleted</option>
              </Select>
            </div>

            <button type="submit" className={buttonStyles({ variant: "outline", size: "md" })}>
              <Search className="h-4 w-4" aria-hidden /> Filter
            </button>
            {entity || action ? (
              <Link href="/app/audit" className={buttonStyles({ variant: "ghost", size: "md" })}>
                Clear
              </Link>
            ) : null}
          </form>
        </CardBody>

        <CardBody className="p-0">
          {entries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<ScrollText className="h-6 w-6" aria-hidden />}
                title="No audit entries"
                description="Changes to employees, roles, branches and devices are recorded here automatically."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <ScrollText className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {titleCase(entry.entity_type)}
                      </p>
                      <Badge
                        tone={
                          entry.action === "insert"
                            ? "success"
                            : entry.action === "delete"
                              ? "danger"
                              : "info"
                        }
                      >
                        {entry.action === "insert"
                          ? "Created"
                          : entry.action === "update"
                            ? "Updated"
                            : "Deleted"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {entry.actor_employee_id
                        ? (actorNames.get(entry.actor_employee_id) ?? "Employee")
                        : "System"}
                      {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                    </p>
                    <MetadataPreview metadata={entry.metadata} />
                  </div>
                  <time
                    className="shrink-0 text-[11px] text-slate-400"
                    dateTime={entry.created_at}
                  >
                    {formatDateTime(entry.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardBody>

        {totalPages > 1 ? (
          <CardBody className="flex items-center justify-between border-t border-slate-100 py-3 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} · {total} entries
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={makeHref(page - 1)} className={buttonStyles({ variant: "outline", size: "sm" })}>
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link href={makeHref(page + 1)} className={buttonStyles({ variant: "outline", size: "sm" })}>
                  Next
                </Link>
              ) : null}
            </div>
          </CardBody>
        ) : null}
      </Card>

      <p className="text-xs leading-relaxed text-slate-500">
        Values shown are a summary. Full before/after values are retained in the audit record
        for investigations and are never exposed to platform administrators.
      </p>
    </div>
  );
}

function MetadataPreview({ metadata }: { metadata: Record<string, unknown> }) {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  const changed = new Set<string>();
  const oldValue = metadata.old as Record<string, unknown> | undefined;
  const newValue = metadata.new as Record<string, unknown> | undefined;

  if (oldValue && newValue) {
    for (const key of new Set([...Object.keys(oldValue), ...Object.keys(newValue)])) {
      if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        changed.add(key);
      }
    }
  }

  const fields = Array.from(changed).filter((field) =>
    [
      "full_name",
      "email",
      "phone",
      "designation",
      "status",
      "name",
      "code",
      "is_default",
      "description",
      "key",
      "must_change_password",
    ].includes(field),
  );

  if (fields.length === 0) return null;

  return (
    <p className="mt-1 text-[11px] text-slate-500">
      Changed: <span className="font-medium text-slate-600">{fields.join(", ")}</span>
    </p>
  );
}
