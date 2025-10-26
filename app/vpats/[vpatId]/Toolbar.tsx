import React from "react";
import { Button } from "@/components/ui/button";
import { handleExportPdf } from "@/app/vpats/[vpatId]/data";

type VpatLikeLocal = { id: string | number };

type ToolbarProps = {
  vpat?: VpatLikeLocal | null;
  savingAll: boolean;
  exportingPdf: boolean;
  setExportingPdf: (value: boolean) => void;
  onSave: () => void | Promise<void>;
};

function Toolbar({ vpat, savingAll, exportingPdf, setExportingPdf, onSave }: ToolbarProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" asChild aria-label="Export HTML VPAT report">
        <a
          href={`/api/vpats/${encodeURIComponent(String(vpat?.id ?? ""))}/download?format=html`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Export HTML
        </a>
      </Button>
      <Button
        variant="outline"
        onClick={() => handleExportPdf({ setExportingPdf, vpat })}
        disabled={exportingPdf}
        aria-label="Export PDF VPAT report"
      >
        {exportingPdf ? "Exporting…" : "Export PDF"}
      </Button>
      <Button
        variant="default"
        className={"bg-success dark:bg-success"}
        onClick={onSave}
        disabled={savingAll}
        aria-label="Save all changes"
      >
        {savingAll ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export default Toolbar;
