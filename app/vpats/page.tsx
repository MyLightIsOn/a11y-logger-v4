"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVpatsList } from "@/lib/query/use-vpat-queries";
import { formatDate } from "@/lib/utils";
import type { UUID } from "@/types/common";
import type { VpatCurrentView } from "@/types/vpat";

function DescriptionFirstLine({ text }: { text?: string | null }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  const firstLine = text.split("\n")[0]?.trim();
  return <span className="text-muted-foreground">{firstLine || "—"}</span>;
}

function StatusBadge({ status }: { status: VpatCurrentView["status"] }) {
  const cls =
    status === "published"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : "bg-amber-100 text-amber-800 border-amber-200";
  const label = status === "published" ? "Published" : "Draft";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${cls}`}>{label}</span>
  );
}

export default function VpatsListPage() {
  const params = useSearchParams();
  const projectId = (params.get("projectId") as UUID | null) ?? null;

  const { data: vpats, isLoading, isError, error } = useVpatsList(projectId);

  const headerExtras = useMemo(() => {
    return (
      <div className="flex items-center gap-3">
        <Link href={projectId ? `/vpats/new?projectId=${projectId}` : "/vpats/new"}>
          <Button>Create VPAT</Button>
        </Link>
      </div>
    );
  }, [projectId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">VPATs</h1>
        {headerExtras}
      </div>

      {!projectId && (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Add ?projectId=... to the URL to view VPATs for a specific project.
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error?.message || "Failed to load VPATs"}
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading VPATs…</div>
      )}

      {!isLoading && projectId && (vpats?.length ?? 0) === 0 && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No VPATs found for this project. Create your first VPAT.
        </div>
      )}

      {!isLoading && (vpats?.length ?? 0) > 0 && (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="vpats-grid"
        >
          {vpats!.map((row) => (
            <Card key={row.vpat_id} className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link href={`/vpats/${row.vpat_id}`} className="hover:underline">
                    {row.title}
                  </Link>
                  <StatusBadge status={row.status} />
                </CardTitle>
                <CardDescription>
                  <DescriptionFirstLine text={row.description ?? null} />
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="tabular-nums">
                      {row.version_number ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Published</span>
                    <span className="tabular-nums">
                      {row.published_at ? formatDate(row.published_at) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="tabular-nums">{formatDate(row.updated_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
