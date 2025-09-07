import { useQuery } from "@tanstack/react-query";

export type WcagCriterionRow = {
  id: string; // UUID
  code: string;
  name: string;
  version: string; // "2.0" | "2.1" | "2.2"
  level: string; // "A" | "AA" | "AAA"
};

export function useWcagCriteria() {
  return useQuery<WcagCriterionRow[], Error, WcagCriterionRow[], ["wcag","criteria"]>({
    queryKey: ["wcag", "criteria"],
    queryFn: async () => {
      const res = await fetch(`/api/wcag/criteria`);
      if (!res.ok) throw new Error("Failed to load WCAG criteria");
      const json = (await res.json()) as { data?: WcagCriterionRow[] };
      return json.data ?? [];
    },
  });
}
