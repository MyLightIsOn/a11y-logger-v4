import React, { Dispatch, SetStateAction } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function ViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: string;
  setViewMode: Dispatch<SetStateAction<"table" | "card">>;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="view-mode" className="sr-only">
        View Mode
      </Label>
      <div className="flex items-center space-x-1">
        <List
          className={`h-4 w-4 ${viewMode === "table" ? "text-primary" : "text-muted-foreground"}`}
        />
        <Switch
          id="view-mode"
          checked={viewMode === "card"}
          onCheckedChange={(checked) => setViewMode(checked ? "card" : "table")}
        />
        <LayoutGrid
          className={`h-4 w-4 ${viewMode === "card" ? "text-primary" : "text-muted-foreground"}`}
        />
      </div>
    </div>
  );
}

export default ViewModeToggle;
