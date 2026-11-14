"use client";

import { useMemo, useState } from "react";

import { groupPermissions, type PermissionDefinition } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/**
 * Permission editor. Groups the catalogue by module, supports "select all" per
 * module, and keeps the submitted values in hidden checkboxes so the Server
 * Action receives exactly the selected keys.
 */
export function PermissionMatrix({
  catalog,
  initial,
  disabled = false,
  lockAll = false,
}: {
  catalog: readonly PermissionDefinition[];
  initial: readonly string[];
  disabled?: boolean;
  lockAll?: boolean;
}) {
  const groups = useMemo(() => groupPermissions(catalog), [catalog]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(lockAll ? catalog.map((permission) => permission.key) : initial),
  );

  function toggle(key: string) {
    if (disabled || lockAll) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleModule(keys: string[], on: boolean) {
    if (disabled || lockAll) return;
    setSelected((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {Array.from(selected).map((key) => (
        <input key={key} type="hidden" name="permissions" value={key} />
      ))}

      {lockAll ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800">
          The Business Administrator role always retains every permission. This matrix is
          shown for reference and cannot be changed.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((group) => {
          const keys = group.permissions.map((permission) => permission.key);
          const activeCount = keys.filter((key) => selected.has(key)).length;
          const allOn = activeCount === keys.length;

          return (
            <div
              key={group.module}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">{group.module}</p>
                  <p className="text-[11px] text-slate-500">
                    {activeCount} of {keys.length} selected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleModule(keys, !allOn)}
                  disabled={disabled || lockAll}
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                    disabled || lockAll
                      ? "cursor-not-allowed border-slate-200 text-slate-400"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {allOn ? "Clear" : "Select all"}
                </button>
              </div>

              <ul className="divide-y divide-slate-50">
                {group.permissions.map((permission) => {
                  const checked = selected.has(permission.key);
                  return (
                    <li key={permission.key}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 px-4 py-2.5",
                          disabled || lockAll ? "cursor-default" : "hover:bg-slate-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(permission.key)}
                          disabled={disabled || lockAll}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-medium text-slate-800">
                            {permission.description}
                          </span>
                          <span className="block font-mono text-[10px] text-slate-400">
                            {permission.key}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
