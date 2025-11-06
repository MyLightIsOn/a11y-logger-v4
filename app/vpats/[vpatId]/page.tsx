"use client";

import React, { useState } from "react";
import { useVpatDraft } from "@/lib/query/use-vpat-queries";
import { useParams } from "next/navigation";
import Toolbar from "@/app/vpats/[vpatId]/Toolbar";
import VPATTable from "@/app/vpats/[vpatId]/VPATTable";
import { Button } from "@/components/ui/button";
import { EditIcon, File, FileCode } from "lucide-react";
import { handleExportPdf } from "@/app/vpats/[vpatId]/data";
import type { Vpat } from "@/types/vpat";

interface HasVpat {
  vpat: Vpat;
}

const EditVPATButton: React.FC<HasVpat> = ({ vpat }) => (
  <Button variant="outline" asChild aria-label="Edit VPAT">
    <a
      href={`/vpats/${encodeURIComponent(String(vpat?.id ?? ""))}/edit`}
      rel="noopener noreferrer"
    >
      <EditIcon />
      Edit VPAT
    </a>
  </Button>
);

const ExportHTMLButton: React.FC<HasVpat> = ({ vpat }) => (
  <Button variant="outline" asChild aria-label="Export HTML VPAT report">
    <a
      href={`/api/vpats/${encodeURIComponent(String(vpat?.id ?? ""))}/download?format=html`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <FileCode />
      Export HTML
    </a>
  </Button>
);

type ExportPDFButtonProps = HasVpat & {
  setExportingPdf: React.Dispatch<React.SetStateAction<boolean>>;
  exportingPdf: boolean;
};

const ExportPDFButton: React.FC<ExportPDFButtonProps> = ({
  setExportingPdf,
  vpat,
  exportingPdf,
}) => (
  <Button
    variant="outline"
    onClick={() => handleExportPdf({ setExportingPdf, vpat })}
    disabled={exportingPdf}
    aria-label="Export PDF VPAT report"
  >
    <File />
    {exportingPdf ? "Exporting…" : "Export PDF"}
  </Button>
);

function Page() {
  const { vpatId } = useParams<{ vpatId: string }>();

  const { data: vpat, isLoading, isError, error } = useVpatDraft(vpatId);

  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

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

            <Toolbar
              buttons={
                <>
                  <ExportHTMLButton vpat={vpat} />
                  <ExportPDFButton
                    vpat={vpat}
                    exportingPdf={exportingPdf}
                    setExportingPdf={setExportingPdf}
                  />
                  <EditVPATButton vpat={vpat} />
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
