import { MonitorSmartphone, ShieldAlert } from "lucide-react";

import { revokeDevice } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelative, initials } from "@/lib/utils";
import { RegisterDeviceForm } from "./register-device-form";

type DeviceRow = {
  id: string;
  employee_id: string;
  device_name: string;
  device_fingerprint: string;
  platform: string | null;
  app_version: string | null;
  status: "active" | "revoked";
  offline_expiry_hours: number;
  registered_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};

export default async function DevicesPage() {
  const session = await requirePermission("device.view");
  const supabase = await createClient();
  const manage = can(session.permissions, "device.manage");

  const { data } = await supabase
    .from("devices")
    .select(
      "id, employee_id, device_name, device_fingerprint, platform, app_version, status, offline_expiry_hours, registered_at, last_seen_at, revoked_at",
    )
    .eq("business_id", session.business.id)
    .order("registered_at", { ascending: false });

  const devices = (data ?? []) as DeviceRow[];
  const employeeIds = Array.from(new Set(devices.map((device) => device.employee_id)));

  type EmployeeLite = { id: string; full_name: string; email: string };
  let employees: EmployeeLite[] = [];
  if (employeeIds.length > 0) {
    const { data: employeeRows } = await supabase
      .from("employees")
      .select("id, full_name, email")
      .eq("business_id", session.business.id)
      .in("id", employeeIds);
    employees = (employeeRows ?? []) as EmployeeLite[];
  }

  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const activeDevices = devices.filter((device) => device.status === "active").length;

  const ownDevices = devices.filter((device) => device.employee_id === session.employee.id);
  const ownActive = ownDevices.find((device) => device.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People & access"
        title="Offline devices"
        description={`${activeDevices} authorised ${activeDevices === 1 ? "device" : "devices"}. Only registered devices can operate offline once the POS ships in Phase 3.`}
      />

      <Alert variant="info" title="Foundation only">
        Device registration, revocation and expiry policy are active now. Offline credential
        provisioning, local storage and background sync are delivered in Phase 3.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Registered devices" description="Newest first" />
          <CardBody className="p-0">
            {devices.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<MonitorSmartphone className="h-6 w-6" aria-hidden />}
                  title="No devices registered"
                  description="Register the device you are using now to start building the offline device registry."
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {devices.map((device) => {
                  const owner = employeeMap.get(device.employee_id);
                  return (
                    <li key={device.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {device.device_name}
                            </p>
                            <StatusBadge status={device.status} />
                            {device.platform ? (
                              <Badge tone="neutral">{device.platform}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] text-slate-500">
                            {owner ? `${owner.full_name} · ${owner.email}` : "Unknown employee"}
                          </p>
                          <p className="mt-0.5 break-all font-mono text-[10px] text-slate-400">
                            {device.device_fingerprint}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Registered {formatDate(device.registered_at)} · Last seen{" "}
                            {formatRelative(device.last_seen_at)} · Offline window{" "}
                            {device.offline_expiry_hours}h
                          </p>
                          {device.revoked_at ? (
                            <p className="mt-0.5 text-[11px] text-red-600">
                              Revoked {formatDate(device.revoked_at)}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {owner ? (
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                              {initials(owner.full_name)}
                            </span>
                          ) : null}
                          {manage && device.status === "active" ? (
                            <form action={revokeDevice}>
                              <input type="hidden" name="deviceId" value={device.id} />
                              <input type="hidden" name="employeeId" value={device.employee_id} />
                              <SubmitButton variant="outline" size="sm" pendingLabel="Revoking…">
                                Revoke
                              </SubmitButton>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="This device"
              description={
                ownActive ? "Already authorised for offline use" : "Not yet authorised"
              }
            />
            <CardBody>
              {ownActive ? (
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2 font-medium text-slate-800">
                    <MonitorSmartphone className="h-4 w-4 text-emerald-600" aria-hidden />
                    {ownActive.device_name}
                  </p>
                  <p className="text-[12px]">
                    Registered {formatDate(ownActive.registered_at)}. It may operate offline
                    for up to {ownActive.offline_expiry_hours} hours after its last contact
                    once the offline module is enabled.
                  </p>
                </div>
              ) : (
                <RegisterDeviceForm defaultName={`${session.employee.fullName.split(" ")[0]}'s device`} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Revocation policy" />
            <CardBody className="space-y-2.5 text-[13px] text-slate-600">
              <p className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                Revoking a device blocks it once it reconnects and, in Phase 3, wipes its
                cached records on next launch.
              </p>
              <p className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                Suspending or terminating an employee automatically revokes every device they
                registered.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
