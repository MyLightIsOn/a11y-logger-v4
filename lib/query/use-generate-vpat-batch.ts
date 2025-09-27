import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UUID } from "@/types/common";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * SSE event payloads from POST /api/vpats/{vpatId}:generate_batch
 */
import type {
  BatchStartEvent,
  BatchRowEvent,
  BatchSkipEvent,
  BatchErrorEvent,
  BatchEvent,
  BatchProgressItem,
} from "@/types/vpat-batch";

/**
 * Hook to generate a batch of VPAT rows via SSE-like streaming from a POST endpoint.
 * - Exposes isRunning, progress map keyed by criterionId, counts, start, and abort.
 * - Cleans up on unmount.
 */
export function useGenerateVpatBatch(
  vpatId: UUID,
): import("@/types/vpat-batch").UseGenerateVpatBatchResult {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<Map<string, BatchProgressItem>>(
    new Map(),
  );
  const [counts, setCounts] = useState({
    done: 0,
    total: 0,
    errors: 0,
    skipped: 0,
  });
  const [lastEvent, setLastEvent] = useState<BatchEvent | undefined>(undefined);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);
  const readingRef = useRef<boolean>(false);

  const resetState = useCallback((total: number) => {
    setProgress(new Map());
    setCounts({ done: 0, total, errors: 0, skipped: 0 });
    setLastEvent(undefined);
    setLastError(undefined);
  }, []);

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    readingRef.current = false;
    setIsRunning(false);
  }, []);

  const start = useCallback(
    async (criterionIds: UUID[]) => {
      if (!vpatId || !Array.isArray(criterionIds)) return;
      if (readingRef.current) return; // prevent concurrent runs

      resetState(criterionIds.length);
      setIsRunning(true);
      setProgress((prev) => {
        const next = new Map(prev);
        for (const id of criterionIds) next.set(id, { status: "PENDING" });
        return next;
      });

      const controller = new AbortController();
      abortRef.current = controller;
      readingRef.current = true;

      try {
        // Attach auth token
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(`/api/vpats/${vpatId}:generate_batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ criterionIds }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(
            `Batch request failed: ${res.status} ${res.statusText}`,
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const enqueueEvent = (evt: BatchEvent) => {
          setLastEvent(evt);
          switch (evt.type) {
            case "start": {
              // ensure total
              setCounts((c) => ({
                ...c,
                total: (evt as BatchStartEvent).total,
              }));
              break;
            }
            case "row": {
              const e = evt as BatchRowEvent;
              setProgress((prev) => {
                const next = new Map(prev);
                next.set(e.criterionId, {
                  status: e.status,
                  row: e.row,
                  warning: e.warning,
                });
                return next;
              });
              setCounts((c) => ({ ...c, done: c.done + 1 }));
              // Invalidate cached rows to reflect updates
              void qc.invalidateQueries({ queryKey: ["vpat", "rows", vpatId] });
              break;
            }
            case "skip": {
              const e = evt as BatchSkipEvent;
              setProgress((prev) => {
                const next = new Map(prev);
                next.set(e.criterionId, {
                  status: "SKIPPED",
                  row: e.row,
                  warning: e.warning,
                });
                return next;
              });
              setCounts((c) => ({
                ...c,
                done: c.done + 1,
                skipped: c.skipped + 1,
              }));
              // Still invalidate to keep any timestamps up to date if server touched row
              void qc.invalidateQueries({ queryKey: ["vpat", "rows", vpatId] });
              break;
            }
            case "error": {
              const e = evt as BatchErrorEvent;
              if (e.criterionId) {
                setProgress((prev) => {
                  const next = new Map(prev);
                  next.set(e.criterionId as UUID, {
                    status: "ERROR",
                    message: e.message,
                  });
                  return next;
                });
                setCounts((c) => ({
                  ...c,
                  done: c.done + 1,
                  errors: c.errors + 1,
                }));
              } else {
                setLastError(e.message);
              }
              break;
            }
            case "done": {
              setIsRunning(false);
              readingRef.current = false;
              break;
            }
          }
        };

        // Read and parse text/event-stream
        while (readingRef.current) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Split by double newline separating events
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            for (const line of raw.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith("data:")) {
                const json = trimmed.slice(5).trim();
                try {
                  const evt = JSON.parse(json) as BatchEvent;
                  enqueueEvent(evt);
                } catch (e) {
                  // swallow parse errors but record lastError
                  setLastError((e as Error).message);
                }
              }
            }
          }
        }

        // Flush any remaining buffered data
        if (buffer.trim().length > 0) {
          const maybeLines = buffer.split(/\n\n/).filter(Boolean);
          for (const chunk of maybeLines) {
            for (const line of chunk.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith("data:")) {
                const json = trimmed.slice(5).trim();
                try {
                  const evt = JSON.parse(json) as BatchEvent;
                  enqueueEvent(evt);
                } catch (e) {
                  setLastError((e as Error).message);
                }
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // aborted by user; treat as stopped without error
        } else {
          setLastError((err as Error).message || "Batch failed");
        }
      } finally {
        setIsRunning(false);
        readingRef.current = false;
        abortRef.current = null;
        // After batch, also invalidate vpat draft meta
        void qc.invalidateQueries({ queryKey: ["vpat", vpatId] });
      }
    },
    [qc, resetState, supabase, vpatId],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      readingRef.current = false;
    };
  }, []);

  return {
    isRunning,
    progress,
    counts,
    lastEvent,
    lastError,
    start,
    abort,
  };
}
