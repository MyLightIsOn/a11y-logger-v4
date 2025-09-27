import React, { Suspense, useMemo } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PasswordForm from "./PasswordForm";
import { compareWcagCodes } from "@/lib/vpat/utils";
import type { WcagScope } from "@/lib/vpat/export";

// Page fulfills Milestone 6 — Public page: /share/vpat/[versionId]
// It calls the Edge Function (functions/public-vpat) to retrieve a public snapshot.

export const dynamic = "force-dynamic";

type PublicRow = {
  code: string;
  name: string;
  level: "A" | "AA" | "AAA";
  conformance: string | null;
  remarks: string | null;
  related_issue_titles?: string[] | null;
  related_issue_urls?: string[] | null;
};

type PublicPayload = {
  version_id: string;
  wcag_scope: unknown; // passthrough; we'll coerce minimal portion used for display
  criteria_rows: PublicRow[];
};

export async function generateMetadata({ params }: { params: Promise<{ versionId: string }> }): Promise<Metadata> {
  const { versionId } = await params;
  return { title: `Shared VPAT ${versionId}` };
}

async function fetchPublic(versionId: string, password?: string): Promise<{ status: number; data?: PublicPayload; error?: string }> {
  // The Edge Function path is configured in Vercel/Supabase; derive from env if available
  // Fallback to /edge/public/vpats/:id which can be proxied in dev.
  const { clientEnv } = await import("@/lib/env");
  const base = clientEnv.NEXT_PUBLIC_PUBLIC_VPAT_BASE || "/edge/public/vpats";
  const url = new URL(`${base.replace(/\/$/, "")}/${encodeURIComponent(versionId)}`, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  if (password) url.searchParams.set("password", password);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const status = res.status;
  let body: unknown = undefined;
  try { body = await res.json(); } catch {}
  if (status >= 200 && status < 300) return { status, data: body as PublicPayload };
  let msg = `Request failed (${status})`;
  if (body && typeof body === "object" && "error" in (body as Record<string, unknown>)) {
    const b = body as { error?: unknown };
    if (typeof b.error === "string" && b.error.trim().length > 0) msg = b.error;
  }
  return { status, error: msg };
}

export default async function PublicVpatPage({ params, searchParams }: { params: Promise<{ versionId: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { versionId } = await params;
  const sp = await searchParams;
  const password = typeof sp?.password === "string" ? sp.password : undefined;

  const initial = await fetchPublic(versionId, password);

  // Not found if explicit 404
  if (initial.status === 404) notFound();

  // If forbidden or password required, render password form client component
  if (initial.status === 401 || initial.status === 403) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Header versionId={versionId} />
        <div className="mt-6 rounded border p-4">
          <h2 className="text-lg font-semibold">This VPAT is protected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Enter the password to view the shared VPAT.</p>
          <Suspense>
            <PasswordForm error={initial.error} />
          </Suspense>
        </div>
      </div>
    );
  }

  if (initial.status >= 400) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Header versionId={versionId} />
        <div className="mt-6 rounded border p-4 text-sm text-red-600">{initial.error || "Unable to load shared VPAT."}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Header versionId={versionId} />
      <PublicVpatView payload={initial.data!} />
    </div>
  );
}

function Header({ versionId }: { versionId: string }) {
  return (
    <div className="pt-2">
      <h1 className="text-2xl font-bold">Shared VPAT</h1>
      <p className="mt-1 text-sm text-muted-foreground break-all">Version: {versionId}</p>
    </div>
  );
}

function PublicVpatView({ payload }: { payload: PublicPayload }) {
  // minimal safe coercion of scope used for display
  const scope = toDisplayScope(payload.wcag_scope);
  const rows = (payload.criteria_rows || []).slice().sort((a, b) => compareWcagCodes(a.code, b.code));

  const byLevel = useMemo(() => {
    return {
      A: rows.filter((r) => r.level === "A"),
      AA: rows.filter((r) => r.level === "AA"),
      AAA: rows.filter((r) => r.level === "AAA"),
    } as const;
  }, [rows]);

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded border p-4">
        <div className="text-sm text-muted-foreground">Scope</div>
        <div className="mt-1 text-sm">WCAG {scope.versionsText} · Levels {scope.levelsText}</div>
      </div>

      <LevelTable title="WCAG Level A" rows={byLevel.A} />
      <LevelTable title="WCAG Level AA" rows={byLevel.AA} />
      <LevelTable title="WCAG Level AAA" rows={byLevel.AAA} />
    </div>
  );
}

function LevelTable({ title, rows }: { title: string; rows: PublicRow[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <Th>Criterion</Th>
              <Th>Conformance</Th>
              <Th>Remarks</Th>
              <Th>Issues</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={4}>
                  <em>No criteria</em>
                </Td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.code} className="border-t">
                  <Td>
                    <div className="font-medium">{r.code} {r.name}</div>
                    <div className="text-xs text-muted-foreground">Level {r.level}</div>
                  </Td>
                  <Td>{r.conformance || "-"}</Td>
                  <Td>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{r.remarks || ""}</pre>
                  </Td>
                  <Td>
                    <IssueList titles={r.related_issue_titles} urls={r.related_issue_urls} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IssueList({ titles, urls }: { titles?: string[] | null; urls?: string[] | null }) {
  const t = Array.isArray(titles) ? titles : [];
  const u = Array.isArray(urls) ? urls : [];
  const items = t.length === u.length ? t.map((title, i) => ({ title, url: u[i] })) : [];
  if (items.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <ul className="list-disc pl-5">
      {items.map((it, idx) => (
        <li key={idx} className="truncate">
          {it.url ? (
            <a href={it.url} target="_blank" rel="noreferrer" className="underline">
              {it.title || it.url}
            </a>
          ) : (
            <span>{it.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-semibold">{children}</th>;
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td className="px-3 py-2 align-top" colSpan={colSpan}>
      {children}
    </td>
  );
}

function toDisplayScope(scope: unknown): { versionsText: string; levelsText: string } {
  try {
    const s = scope as Partial<WcagScope> | null | undefined;
    const versions = Array.isArray(s?.versions) && s!.versions!.length > 0 ? (s!.versions as string[]).join(", ") : "2.2";
    const levels = s?.levels as { A?: boolean; AA?: boolean; AAA?: boolean } | undefined;
    const flags = [levels?.A ? "A" : null, levels?.AA ? "AA" : null, levels?.AAA ? "AAA" : null].filter(Boolean) as string[];
    const levelsText = flags.length ? flags.join("/") : "A/AA/AAA";
    return { versionsText: versions, levelsText };
  } catch {
    return { versionsText: "2.2", levelsText: "A/AA/AAA" };
  }
}

