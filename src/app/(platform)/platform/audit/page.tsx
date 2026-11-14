import { KeyRound, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, titleCase } from "@/lib/utils";

type PlatformAudit = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default async function PlatformAuditPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const entries = (data ?? []) as PlatformAudit[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Platform audit"
        description="Platform-level actions only. Tenant transaction records are outside this view by design."
      />

      <Card>
        <CardBody className="p-0">
          {entries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<ScrollText className="h-6 w-6" aria-hidden />}
                title="No platform actions recorded"
                description="Provisioning businesses, changing activation status and licence updates will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <KeyRound className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {titleCase(entry.action.replace(/^platform\./, ""))}
                      </p>
                      <Badge tone="neutral">{titleCase(entry.entity_type)}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {entry.entity_id ?? "—"}
                      {entry.metadata && Object.keys(entry.metadata).length > 0
                        ? ` · ${JSON.stringify(entry.metadata)}`
                        : ""}
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] text-slate-400" dateTime={entry.created_at}>
                    {formatDateTime(entry.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
