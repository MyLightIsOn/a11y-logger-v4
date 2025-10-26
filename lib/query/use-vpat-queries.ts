import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vpatsApi } from "@/lib/api/vpats";
import type { UUID } from "@/types/common";
import type {
  Vpat,
  VpatListResponse,
  VpatRowDraft,
  VpatVersion,
  SaveVpatRowRequest,
  GenerateVpatRowResponse,
  GenerateVpatRowRemarksResponse,
} from "@/types/vpat";

// useVpatsList() — list all VPATs (draft and published) for the current user/context
export function useVpatsList() {
  return useQuery<
    VpatListResponse["data"],
    Error,
    VpatListResponse["data"],
    ["vpats"]
  >({
    queryKey: ["vpats"],
    queryFn: async () => {
      const res = await vpatsApi.listAll();
      if (!res.success) throw new Error(res.error || "Failed to load VPATs");
      return res.data?.data ?? [];
    },
  });
}

// useVpatDraft(vpatId)
export function useVpatDraft(vpatId: UUID | null | undefined) {
  return useQuery<Vpat, Error, Vpat, ["vpat", UUID | null | undefined]>({
    queryKey: ["vpat", vpatId ?? null],
    queryFn: async () => {
      if (!vpatId) throw new Error("vpatId is required");
      const res = await vpatsApi.getVpat(vpatId);
      if (!res.success || !res.data)
        throw new Error(res.error || "Failed to load VPAT");
      return res.data;
    },
    enabled: !!vpatId,
  });
}

// Draft rows for a VPAT (helper query used by hooks/UI)
export function useVpatDraftRows(vpatId: UUID | null | undefined) {
  return useQuery<
    VpatRowDraft[],
    Error,
    VpatRowDraft[],
    ["vpat", "rows", UUID | null | undefined]
  >({
    queryKey: ["vpat", "rows", vpatId ?? null],
    queryFn: async () => {
      if (!vpatId) return [];
      const res = await vpatsApi.getRows(vpatId);
      if (!res.success)
        throw new Error(res.error || "Failed to load VPAT rows");
      return res.data ?? [];
    },
    enabled: !!vpatId,
  });
}

// useSaveVpatRow — mutation hook returning mutate function
export function useSaveVpatRow(vpatId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["vpat", "saveRow", vpatId],
    mutationFn: async (args: {
      criterionId: UUID;
      payload: SaveVpatRowRequest;
    }): Promise<VpatRowDraft> => {
      const { criterionId, payload } = args;
      const res = await vpatsApi.saveRow(vpatId, criterionId, payload);
      if (!res.success || !res.data)
        throw new Error(res.error || "Failed to save row");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vpat", "rows", vpatId] });
      void qc.invalidateQueries({ queryKey: ["vpat", vpatId] });
    },
  });
}

// useGenerateVpatRow — mutation for single-row AI generate (persistent on server)
export function useGenerateVpatRow(vpatId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["vpat", "generateRow", vpatId],
    mutationFn: async (args: {
      criterionId: UUID;
    }): Promise<GenerateVpatRowResponse> => {
      const { criterionId } = args;
      const res = await vpatsApi.generateRow(vpatId, criterionId);
      if (!res.success || !res.data)
        throw new Error(res.error || "Failed to generate row");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vpat", "rows", vpatId] });
      void qc.invalidateQueries({ queryKey: ["vpat", vpatId] });
    },
  });
}

// useGenerateVpatRowRemarks — non-persistent generate for a single criterion
export function useGenerateVpatRowRemarks(vpatId: UUID) {
  return useMutation({
    mutationKey: ["vpat", "generateRowRemarks", vpatId],
    mutationFn: async (args: {
      criterionId: UUID;
    }): Promise<GenerateVpatRowRemarksResponse> => {
      const { criterionId } = args;
      const res = await vpatsApi.generateRowRemarks(vpatId, criterionId);
      if (!res.success || !res.data)
        throw new Error(res.error || "Failed to generate remarks");
      return res.data;
    },
  });
}

// useVpatVersions(vpatId)
export function useVpatVersions(vpatId: UUID | null | undefined) {
  return useQuery<
    VpatVersion[],
    Error,
    VpatVersion[],
    ["vpat", "versions", UUID | null | undefined]
  >({
    queryKey: ["vpat", "versions", vpatId ?? null],
    queryFn: async () => {
      if (!vpatId) return [];
      const res = await vpatsApi.listVersions(vpatId);
      if (!res.success) throw new Error(res.error || "Failed to load versions");
      return res.data ?? [];
    },
    enabled: !!vpatId,
  });
}

// useGetVersion(versionId)
// useVpatIssuesSummary(vpatId) — counts of issues per WCAG code for the VPAT's project
export function useVpatIssuesSummary(vpatId: UUID | null | undefined) {
  return useQuery<
    { code: string; count: number }[],
    Error,
    { code: string; count: number }[],
    ["vpat", "issuesSummary", UUID | null | undefined]
  >({
    queryKey: ["vpat", "issuesSummary", vpatId ?? null],
    queryFn: async () => {
      if (!vpatId) return [];
      const res = await vpatsApi.getIssuesSummary(vpatId);
      if (!res.success)
        throw new Error(res.error || "Failed to load issues summary");
      return res.data?.data ?? [];
    },
    enabled: !!vpatId,
  });
}

// useVpatIssuesByCriterion(vpatId, code) — list of issue IDs for slideshow
export function useVpatIssuesByCriterion(
  vpatId: UUID | null | undefined,
  code: string | null,
) {
  return useQuery<
    string[],
    Error,
    string[],
    ["vpat", "issuesByCode", UUID | null | undefined, string | null]
  >({
    queryKey: ["vpat", "issuesByCode", vpatId ?? null, code ?? null],
    queryFn: async () => {
      if (!vpatId || !code) return [];
      const res = await vpatsApi.getIssuesByCriterion(vpatId, code);
      if (!res.success) throw new Error(res.error || "Failed to load issues");
      return res.data?.data ?? [];
    },
    enabled: Boolean(vpatId && code && code.length > 0),
  });
}

export function useGetVersion(versionId: UUID | null | undefined) {
  return useQuery<
    VpatVersion,
    Error,
    VpatVersion,
    ["vpatVersion", UUID | null | undefined]
  >({
    queryKey: ["vpatVersion", versionId ?? null],
    queryFn: async () => {
      if (!versionId) throw new Error("versionId is required");
      const res = await vpatsApi.getVersion(versionId);
      if (!res.success || !res.data)
        throw new Error(res.error || "Failed to load version");
      return res.data;
    },
    enabled: !!versionId,
  });
}

// Publish current draft into a new version
export function usePublishVpat(vpatId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["vpat", "publish", vpatId ?? null],
    mutationFn: async () => {
      if (!vpatId) throw new Error("vpatId is required");
      const res = await vpatsApi.publish(vpatId);
      if (!res.success) throw new Error(res.error || "Failed to publish VPAT");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vpat", vpatId ?? null] });
      void qc.invalidateQueries({
        queryKey: ["vpat", "versions", vpatId ?? null],
      });
    },
  });
}

// Update VPAT (e.g., to unpublish or update metadata)
export function useUpdateVpat(vpatId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["vpat", "update", vpatId ?? null],
    mutationFn: async (patch: Partial<Pick<Vpat, "title" | "description">>) => {
      if (!vpatId) throw new Error("vpatId is required");
      const res = await vpatsApi.update(vpatId, patch);
      if (!res.success || !res.data)
        throw new Error(res.error || "Failed to update VPAT");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vpat", vpatId ?? null] });
    },
  });
}

// Unpublish VPAT back to draft
export function useUnpublishVpat(vpatId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["vpat", "unpublish", vpatId ?? null],
    mutationFn: async () => {
      if (!vpatId) throw new Error("vpatId is required");
      const res = await vpatsApi.unpublish(vpatId);
      if (!res.success)
        throw new Error(res.error || "Failed to unpublish VPAT");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vpat", vpatId ?? null] });
      void qc.invalidateQueries({
        queryKey: ["vpat", "versions", vpatId ?? null],
      });
    },
  });
}
