import { useMemo, useState } from "react";
import { useWcagCriteriaQuery } from "@/lib/query/use-wcag-criteria-query";
import type { WcagCriterion, WcagVersion } from "@/types/issue";

export type Level = "A" | "AA" | "AAA";

export function useWcagFilters() {
  const [versionFilter, setVersionFilter] = useState<WcagVersion | "all">(
    "all",
  );
  const [levelFilter, setLevelFilter] = useState<"all" | Level>("all");

  const { data = [], isLoading, error } = useWcagCriteriaQuery();

  const allOptions = useMemo(() => {
    return (data || []).map((item: WcagCriterion) => ({
      value: `${item.version}|${item.code}`,
      label: `${item.code} ${item.name} (${item.version}, ${item.level})`,
      level: item.level,
      version: item.version,
    }));
  }, [data]);

  const filteredOptions = useMemo(() => {
    return allOptions
      .filter((opt: any) =>
        versionFilter === "all" ? true : opt.version === versionFilter,
      )
      .filter((opt: any) => (levelFilter === "all" ? true : opt.level === levelFilter))
      .map((opt) => ({ value: opt.value, label: opt.label }));
  }, [allOptions, versionFilter, levelFilter]);

  return {
    versionFilter,
    setVersionFilter,
    levelFilter,
    setLevelFilter,
    options: filteredOptions,
    rawOptions: allOptions,
    isLoading,
    error: error as Error | undefined,
  } as const;
}
