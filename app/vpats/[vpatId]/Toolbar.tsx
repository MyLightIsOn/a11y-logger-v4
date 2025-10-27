import React from "react";
import { Button } from "@/components/ui/button";
import { handleExportPdf } from "@/app/vpats/[vpatId]/data";
import { EditIcon, FileCode, File, SaveIcon, CircleX } from "lucide-react";

type VpatLikeLocal = { id: string | number };

type ToolbarProps = {
  vpat?: VpatLikeLocal | null;
  savingAll: boolean;
  exportingPdf: boolean;
  setExportingPdf: (value: boolean) => void;
  onSave: () => void | Promise<void>;
  readOnly?: boolean;
};

function Toolbar({
  vpat,
  savingAll,
  exportingPdf,
  setExportingPdf,
  onSave,
  readOnly,
}: ToolbarProps) {
  return (
    <div className="flex gap-2">
      {readOnly && (
        <Button variant="outline" asChild aria-label="Edit VPAT">
          <a
            href={`/vpats/${encodeURIComponent(String(vpat?.id ?? ""))}/edit`}
            rel="noopener noreferrer"
          >
            <EditIcon />
            Edit VPAT
          </a>
        </Button>
      )}
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
      <Button
        variant="outline"
        onClick={() => handleExportPdf({ setExportingPdf, vpat })}
        disabled={exportingPdf}
        aria-label="Export PDF VPAT report"
      >
        <File />
        {exportingPdf ? "Exporting…" : "Export PDF"}
      </Button>
      {!readOnly && (
        <Button
          variant="success"
          onClick={onSave}
          disabled={savingAll}
          aria-label="Save all changes"
        >
          <SaveIcon />
          {savingAll ? "Saving…" : "Save"}
        </Button>
      )}
      {!readOnly && (
        <Button
          variant="destructive"
          onClick={() => window.history.back()}
          aria-label="Save all changes"
        >
          <CircleX />
          Cancel
        </Button>
      )}
    </div>
  );
}

export default Toolbar;
