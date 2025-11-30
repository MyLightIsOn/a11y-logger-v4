"use client";

import React, { useRef, useState } from "react";
import { useVpatDraft } from "@/lib/query/use-vpat-queries";
import { useParams, useRouter } from "next/navigation";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import VPATForm, { VpatFormHandle } from "@/app/vpats/[vpatId]/VPATForm";
import { SaveIcon, Loader2, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Page() {
  const { vpatId } = useParams<{ vpatId: string }>();
  const router = useRouter();

  const { data: vpat, isLoading, isError, error } = useVpatDraft(vpatId);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const formRef = useRef<VpatFormHandle>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"confirm" | "saving" | "done">(
    "confirm",
  );
  const [totalToSave, setTotalToSave] = useState<number>(0);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [allCriteriaCount, setAllCriteriaCount] = useState<number>(0);

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
        <div className={"container px-4 py-8 min-h-full"}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">VPAT Editor</h1>
          </div>
          <VPATForm ref={formRef} vpat={vpat} />

          <div className="mt-6">
            <ButtonToolbar
              buttons={
                <>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (savingAll) return;
                      // Require all rows to have conformance selected before proceeding
                      const valid =
                        formRef.current?.validateConformanceOrFocus?.();
                      if (!valid) {
                        // Do not open modal; focus has been moved to the first empty select
                        return;
                      }
                      // Open confirmation modal and compute targets
                      const targets = formRef.current?.getSaveTargets();
                      setTotalToSave(targets?.codes.length ?? 0);
                      setAllCriteriaCount(targets?.totalCriteria ?? 0);
                      setSavedCount(0);
                      setModalStep("confirm");
                      setModalOpen(true);
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
                    Save Changes
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

      {/* Save Confirmation and Progress Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            // reset state when closed
            setModalStep("confirm");
            setSavedCount(0);
            setTotalToSave(0);
          }
        }}
      >
        <DialogContent aria-describedby="save-vpat-description">
          <DialogHeader>
            <DialogTitle>
              {modalStep === "confirm"
                ? "Confirm Save"
                : modalStep === "saving"
                  ? "Saving VPAT"
                  : "Save Complete"}
            </DialogTitle>
            <DialogDescription id="save-vpat-description">
              {modalStep === "confirm" && (
                <span>
                  You are about to save {totalToSave} of {allCriteriaCount}{" "}
                  criteria. This may take a few minutes.
                </span>
              )}
              {modalStep === "saving" && (
                <span aria-live="polite">
                  Saved {savedCount} of {totalToSave} criteria…
                </span>
              )}
              {modalStep === "done" && (
                <span>All selected criteria have been saved.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {modalStep !== "confirm" && (
            <div className="my-4">
              {/* Simple progress bar */}
              <div className="h-2 w-full bg-muted rounded">
                <div
                  className="h-2 bg-primary rounded"
                  style={{
                    width: `${totalToSave === 0 ? 100 : Math.min(100, Math.round((savedCount / Math.max(1, totalToSave)) * 100))}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {savedCount} / {totalToSave} saved
              </div>
            </div>
          )}

          <DialogFooter>
            {modalStep === "confirm" && (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  type="button"
                  onClick={async () => {
                    if (savingAll) return;
                    // Re-validate before performing save to guard against last-second changes
                    const valid =
                      formRef.current?.validateConformanceOrFocus?.();
                    if (!valid) {
                      // Close modal so the user can fix the selection
                      setModalOpen(false);
                      return;
                    }
                    setSavingAll(true);
                    setModalStep("saving");
                    try {
                      await formRef.current?.saveDraft({
                        onStart: (total) => {
                          setTotalToSave(total);
                          setSavedCount(0);
                        },
                        onProgress: (saved) => {
                          setSavedCount(saved);
                        },
                        onDone: () => {
                          setModalStep("done");
                        },
                      });
                    } catch {
                      setModalOpen(false);
                    } finally {
                      setSavingAll(false);
                    }
                  }}
                >
                  Confirm and Save
                </Button>
              </>
            )}
            {modalStep === "saving" && (
              <Button variant="secondary" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </Button>
            )}
            {modalStep === "done" && (
              <Button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  // Navigate to view screen
                  const id = vpatId;
                  if (id) {
                    router.push(`/vpats/${id}`);
                  }
                }}
              >
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Page;
