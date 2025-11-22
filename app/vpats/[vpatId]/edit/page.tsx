"use client";

import React, { useRef, useState } from "react";
import { useVpatDraft } from "@/lib/query/use-vpat-queries";
import { useParams, useRouter } from "next/navigation";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import VPATForm, { VpatFormHandle } from "@/app/vpats/[vpatId]/VPATForm";
import { SaveIcon, Loader2, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function Page() {
  const { vpatId } = useParams<{ vpatId: string }>();
  const router = useRouter();

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
          </div>
          <VPATForm ref={formRef} vpat={vpat} />

          <div className="mt-6">
            <ButtonToolbar
              buttons={
                <>
                  <Button
                    variant="success"
                    type="button"
                    onClick={async () => {
                      if (savingAll) return;
                      setSavingAll(true);
                      try {
                        await formRef.current?.saveDraft();
                      } finally {
                        setSavingAll(false);
                      }
                    }}
                    disabled={savingAll}
                    aria-describedby="submit-status"
                  >
                    {savingAll ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <SaveIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                    {savingAll ? "Saving VPAT…" : "Save Changes"}
                  </Button>
                  <span
                    id="submit-status"
                    role="status"
                    aria-live="polite"
                    className="sr-only"
                  >
                    {savingAll ? "Saving VPAT" : ""}
                  </span>
                  <Button
                    variant="destructive"
                    type="button"
                    onClick={() => router.push(`/vpats/${vpatId}`)}
                    aria-label="Cancel"
                  >
                    <XIcon /> Cancel
                  </Button>
                </>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Page;
