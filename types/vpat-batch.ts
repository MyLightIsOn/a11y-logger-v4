import type { UUID } from "@/types/common";
import type { VpatRowDraft } from "@/types/vpat";

/**
 * SSE event payloads from POST /api/vpats/{vpatId}:generate_batch
 */
export type BatchStartEvent = {
  type: "start";
  vpatId: UUID;
  total: number;
};

export type BatchRowEvent = {
  type: "row";
  criterionId: UUID;
  status: "UPDATED" | "INSERTED";
  row: VpatRowDraft | null;
  warning?: string;
};

export type BatchSkipEvent = {
  type: "skip";
  criterionId: UUID;
  row: VpatRowDraft | null;
  warning?: string;
};

export type BatchErrorEvent = {
  type: "error";
  criterionId?: UUID;
  message: string;
};

export type BatchDoneEvent = {
  type: "done";
};

export type BatchEvent =
  | BatchStartEvent
  | BatchRowEvent
  | BatchSkipEvent
  | BatchErrorEvent
  | BatchDoneEvent;

export type BatchProgressStatus =
  | "PENDING"
  | "UPDATED"
  | "INSERTED"
  | "SKIPPED"
  | "ERROR";

export interface BatchProgressItem {
  status: BatchProgressStatus;
  row?: VpatRowDraft | null;
  warning?: string;
  message?: string; // for ERROR
}

export interface UseGenerateVpatBatchResult {
  isRunning: boolean;
  progress: Map<string, BatchProgressItem>;
  counts: { done: number; total: number; errors: number; skipped: number };
  lastEvent?: BatchEvent;
  lastError?: string;
  start: (criterionIds: UUID[]) => Promise<void>;
  abort: () => void;
}
