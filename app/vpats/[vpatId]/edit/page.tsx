"use client";

import React, { useRef, useState } from "react";
import { useVpatDraft } from "@/lib/query/use-vpat-queries";
import { useParams } from "next/navigation";
import Toolbar from "@/app/vpats/[vpatId]/Toolbar";
import VPATForm, { VpatFormHandle } from "@/app/vpats/[vpatId]/VPATForm";
import { SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Types for component props
type SaveVPATButtonProps = {
  onSave: () => void | Promise<void>;
  savingAll: boolean;
};

const SaveVPATButton: React.FC<SaveVPATButtonProps> = ({ onSave, savingAll }) => (
  <Button
    variant="success"
    onClick={onSave}
    disabled={savingAll}
    aria-label="Save all changes"
  >
    <SaveIcon />
    {savingAll ? "Saving…" : "Save"}
  </Button>
);

const CancelVPATButton = (
  <Button
    variant="destructive"
    onClick={() => window.history.back()}
    aria-label="Save all changes"
  >
    Cancel
  </Button>
);

function Page() {
  const { vpatId } = useParams<{ vpatId: string }>();

  const { data: vpat, isLoading, isError, error } = useVpatDraft(vpatId);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const formRef = useRef<VpatFormHandle>(null);

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
              buttons={
                <>
                  <SaveVPATButton
                    onSave={async () => {
                      if (savingAll) return;
                      setSavingAll(true);
                      try {
                        await formRef.current?.saveDraft();
                      } finally {
                        setSavingAll(false);
                      }
                    }}
                    savingAll={savingAll}
                  />
                  {CancelVPATButton}
                </>
              }
            />
          </div>
          <VPATForm ref={formRef} vpat={vpat} />
        </div>
      )}
    </div>
  );
}

export default Page;
