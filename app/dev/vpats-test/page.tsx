"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { vpatsApi } from "@/lib/api/vpats";
import type { UUID } from "@/types/common";
import type { ConformanceValue } from "@/types/vpat";

export default function VpatsTestPage() {
  const params = useSearchParams();

  const projectId = params.get("projectId") as UUID | null;
  const vpatId = params.get("vpatId") as UUID | null;
  const versionId = params.get("versionId") as UUID | null;
  const criterionId = params.get("criterionId") as UUID | null;

  const [logs, setLogs] = useState<string[]>([]);

  const log = useMemo(
    () =>
      (label: string, value: unknown) => {
        // eslint-disable-next-line no-console
        console.log(`[vpats-test] ${label}:`, value);
        setLogs((prev) => [
          ...prev,
          `${new Date().toISOString()} ${label}: ${JSON.stringify(value, null, 2)}`,
        ]);
      },
    [],
  );

  useEffect(() => {
    async function run() {
      if (projectId) {
        const listRes = await vpatsApi.listByProject(projectId);
        log("listByProject", listRes);
      }

      if (vpatId) {
        const getRes = await vpatsApi.getVpat(vpatId);
        log("getVpat", getRes);

        const rowsRes = await vpatsApi.getRows(vpatId);
        log("getRows", rowsRes);

        const versionsRes = await vpatsApi.listVersions(vpatId);
        log("listVersions", versionsRes);

        // Optional: Save a row if criterionId present (non-destructive example: set Not Evaluated with empty remarks)
        if (criterionId) {
          const saveRes = await vpatsApi.saveRow(vpatId, criterionId, {
            conformance: "Not Evaluated" as ConformanceValue,
            remarks: "",
          });
          log("saveRow", saveRes);
        }
      }

      if (versionId) {
        const versionRes = await vpatsApi.getVersion(versionId);
        log("getVersion", versionRes);
      }
    }

    void run();
    // run once on mount with current params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">VPATs Test Harness</h1>
      <p className="text-sm text-muted-foreground">
        Provide query params in the URL to trigger calls: projectId, vpatId, versionId, criterionId.
        Check the browser console for detailed logs. A copy of results also appears below.
      </p>
      <div className="border rounded p-3 text-xs whitespace-pre-wrap break-words">
        {logs.length === 0 ? "No logs yet. Add query params and refresh." : logs.join("\n\n")}
      </div>
    </div>
  );
}
