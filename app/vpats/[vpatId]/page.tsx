"use client";

import React, { useRef, useState } from "react";
import { useVpatDraft } from "@/lib/query/use-vpat-queries";
import { useParams } from "next/navigation";
import Toolbar from "@/app/vpats/[vpatId]/Toolbar";
import VPATTable from "@/app/vpats/[vpatId]/VPATTable";

function Page() {
  const params = useParams();
  const vpatId = (params?.vpatId ?? null) as string | null | undefined;

  const { data: vpat, isLoading, isError, error } = useVpatDraft(vpatId);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const formRef = useRef<VpatFormHandle>(null);

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
            <h1 className="text-2xl font-bold">VPAT Editor</h1>

            <Toolbar
              vpat={vpat}
              savingAll={savingAll}
              exportingPdf={exportingPdf}
              setExportingPdf={setExportingPdf}
              readOnly
            />
          </div>
          <VPATTable ref={formRef} vpat={vpat} />
        </div>
      )}
    </div>
  );
}

export default Page;
