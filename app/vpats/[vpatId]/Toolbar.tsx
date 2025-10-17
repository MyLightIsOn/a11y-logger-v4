import React from "react";
import { Button } from "@/components/ui/button";
import { handleExportPdf } from "@/app/vpats/[vpatId]/data";

function Toolbar({
  vpat,
  savingAll,
  setSavingAll,
  exportingPdf,
  setExportingPdf,
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" asChild aria-label="Export HTML VPAT report">
        <a
          href={`/api/vpats/${encodeURIComponent(String(vpat.id))}/download?format=html`}
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
        onClick={() => console.log("saving")}
        disabled={savingAll}
        aria-label="Save all changes"
      >
        {savingAll ? "Saving…" : "Save"}
      </Button>
      <Button
        className={"bg-success dark:bg-success"}
        variant="default"
        onClick={() => console.log("saving")}
        disabled={savingAll}
        aria-label="Publish"
      >
        {savingAll ? "Publishing…" : "Publish"}
      </Button>
    </div>
  );
}

export default Toolbar;
