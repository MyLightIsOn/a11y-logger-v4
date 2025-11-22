"use client";

import React, { useState } from "react";
import { useVpatDraft } from "@/lib/query/use-vpat-queries";
import { useParams, useRouter } from "next/navigation";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import VPATTable from "@/app/vpats/[vpatId]/VPATTable";
import { Button } from "@/components/ui/button";
import { EditIcon, Download, Trash2 } from "lucide-react";
import { handleExportPdf } from "@/app/vpats/[vpatId]/data";
import type { Vpat } from "@/types/vpat";
import { useDeleteVpatMutation } from "@/lib/query/use-delete-vpat-mutation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HasVpat {
  vpat: Vpat;
}

const EditVPATButton: React.FC<HasVpat> = ({ vpat }) => (
  <Button variant="outline" asChild aria-label="Edit">
    <a
      href={`/vpats/${encodeURIComponent(String(vpat?.id ?? ""))}/edit`}
      rel="noopener noreferrer"
    >
      <EditIcon />
      Edit
    </a>
  </Button>
);

// Single Export dropdown to match Assessment report page behavior
const ExportMenu: React.FC<{
  vpat: Vpat;
  exportingPdf: boolean;
  setExportingPdf: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ vpat, exportingPdf, setExportingPdf }) => {
  const htmlUrl = `/api/vpats/${encodeURIComponent(String(vpat?.id ?? ""))}/download?format=html`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Export VPAT">
          <Download /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={"bg-white dark:bg-card-dark"}>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            if (!exportingPdf) handleExportPdf({ setExportingPdf, vpat });
          }}
          disabled={exportingPdf}
        >
          {exportingPdf ? "Exporting PDF…" : "Export as PDF"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            window.open(htmlUrl, "_blank", "noopener,noreferrer");
          }}
        >
          Export as HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function Page() {
  const { vpatId } = useParams<{ vpatId: string }>();
  const router = useRouter();

  const { data: vpat, isLoading, isError, error } = useVpatDraft(vpatId);

  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const deleteVpat = useDeleteVpatMutation();

  const confirmAndDelete = async () => {
    if (!vpatId) return;
    const ok = window.confirm(
      "Are you sure you want to delete this VPAT? This action cannot be undone.",
    );
    if (!ok) return;
    deleteVpat.mutate(String(vpatId), {
      onSuccess: () => {
        router.push("/vpats");
      },
    });
  };

  return (
    <div className={"min-h-full"}>
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="loader"></div>
        </div>
      )}
      {isError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error?.message || "Failed to load VPAT"}
        </div>
      )}

      {vpat && (
        <div className={"container mx-auto px-4 py-8 min-h-full"}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">VPAT Detail</h1>

            <ButtonToolbar
              buttons={
                <>
                  <ExportMenu
                    vpat={vpat}
                    exportingPdf={exportingPdf}
                    setExportingPdf={setExportingPdf}
                  />
                  <EditVPATButton vpat={vpat} />
                  <Button
                    variant="destructive"
                    onClick={confirmAndDelete}
                    disabled={deleteVpat.isPending}
                    aria-label="Delete VPAT"
                  >
                    <Trash2 />
                    {deleteVpat.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </>
              }
            />
          </div>
          <VPATTable vpat={vpat} />
        </div>
      )}
    </div>
  );
}

export default Page;
