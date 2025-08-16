import { useQuery } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api";
import type { Tag } from "@/types/tag";

export function useTagsQuery() {
  return useQuery<Tag[], Error>({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await tagsApi.getTags();
      if (!res.success) {
        throw new Error(res.error || "Failed to load tags");
      }
      return res.data?.data ?? [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
