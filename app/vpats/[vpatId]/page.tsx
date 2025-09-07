"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVpatDraft } from "@/lib/query/use-vpat-queries";
import { getAllWcagCriteria } from "@/lib/vpat/utils";
import type { UUID } from "@/types/common";
import type { ConformanceValue } from "@/types/vpat";

const CONFORMANCE_OPTIONS: ConformanceValue[] = [
  "Supports",
  "Partially Supports",
  "Does Not Support",
  "Not Applicable",
  "Not Evaluated",
];

export default function VpatEditorSkeletonPage() {
  const params = useParams();
  const vpatIdParam = (params?.vpatId ?? null) as string | string[] | null;
  const vpatId = Array.isArray(vpatIdParam) ? (vpatIdParam[0] as UUID) : (vpatIdParam as UUID | null);

  const { data: vpat, isLoading, isError, error } = useVpatDraft(vpatId);

  // Local editable header fields (not persisted in this milestone)
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (vpat) {
      setTitle(vpat.title ?? "");
      setDescription(vpat.description ?? "");
    }
  }, [vpat]);

  // Criteria list (numeric sorted already by util)
  const criteria = useMemo(() => getAllWcagCriteria(), []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">VPAT Editor</h1>
        {/* Toolbar placeholder (future: Publish / Generate Next 5) */}
        <div className="flex items-center gap-2" />
      </div>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error?.message || "Failed to load VPAT"}
        </div>
      )}

      {isLoading && <div className="text-sm text-muted-foreground">Loading VPAT…</div>}

      {!isLoading && vpat && (
        <div className="space-y-6">
          {/* Header editable fields */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vpat-title">Title</Label>
                <Input id="vpat-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vpat-description">Description</Label>
                <Input
                  id="vpat-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="pt-1">
              <div className="text-sm text-muted-foreground">
                <strong>Scope</strong>: Placeholder summary (read-only). This will display WCAG scope details in later milestones.
              </div>
            </div>
          </div>

          {/* Criteria table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 w-[22rem]">Criterion</th>
                  <th className="p-3 w-[14rem]">Conformance</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 w-[10rem]">Issues</th>
                  <th className="p-3 w-[18rem]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => (
                  <tr key={c.code} className="border-t align-top">
                    <td className="p-3">
                      <div className="font-medium">{c.code} — {c.name}</div>
                      <div className="text-xs text-muted-foreground">Level {c.level}</div>
                    </td>
                    <td className="p-3">
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONFORMANCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Textarea placeholder="Add remarks…" disabled className="min-h-[3rem]" />
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-muted-foreground">—</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" disabled>Save</Button>
                        <Button size="sm" variant="outline" disabled>Clear</Button>
                        <Button size="sm" variant="secondary" disabled title="Generation will be enabled in a later milestone">Generate</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && !vpat && !isError && (
        <div className="text-sm text-muted-foreground">VPAT not found.</div>
      )}
    </div>
  );
}
