import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

type LoginEvent = {
  id: number;
  event: string;
  email: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export default async function PlatformActivityPage() {
  const session = await requirePlatformAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("login_events")
    .select("id, event, email, ip, user_agent, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const events = (data ?? []) as LoginEvent[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="My sign-in activity"
        description="Authentication events recorded for this platform account."
      />

      <Card>
        <CardBody className="p-0">
          {events.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Activity className="h-6 w-6" aria-hidden />}
                title="No sign-in events yet"
                description="Future sign-ins to this platform account will be listed here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={event.event === "login" ? "success" : "warning"}>
                        {event.event}
                      </Badge>
                      <span className="text-sm text-slate-800">{event.email}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {event.ip ? `IP ${event.ip} · ` : ""}
                      {event.user_agent ?? "Unknown device"}
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] text-slate-400" dateTime={event.created_at}>
                    {formatDateTime(event.created_at)}
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
