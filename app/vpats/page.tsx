"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVpatsList } from "@/lib/query/use-vpat-queries";
import { formatDate } from "@/lib/utils";
import type { VpatCurrentView } from "@/types/vpat";
import { PlusIcon } from "lucide-react";

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
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${cls}`}
    >
      {label}
    </span>
  );
}

export default function VpatsListPage() {
  const { data: vpats, isLoading, isError, error } = useVpatsList();

  return (
    <div className="container mx-auto px-4 py-8 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">VPATs</h1>
        {vpats && vpats.length > 0 && (
          <Link href={"/vpats/new"}>
            <Button className={"ml-5 bg-success dark:bg-success"}>
              Create VPAT <PlusIcon />
            </Button>
          </Link>
        )}
      </div>

      {isError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error?.message || "Failed to load VPATs"}
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading VPATs…</div>
      )}

      {!isLoading && (vpats?.length ?? 0) === 0 && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No VPATs found. Create your first VPAT.
        </div>
      )}

      {!isLoading && (vpats?.length ?? 0) > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="vpats-grid"
        >
          {vpats!.map((row) => (
            <Link key={row.vpat_id} href={`/vpats/${row.vpat_id}`}>
              <Card key={row.vpat_id} className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {row.title}
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
                      <span className="tabular-nums">
                        {formatDate(row.updated_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
