"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordForm({ error }: { error?: string }) {
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [err, setErr] = useState<string | undefined>(error);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(undefined);
    try {
      // Client navigates to same page with password in query for SSR fetch
      const url = new URL(window.location.href);
      if (password) url.searchParams.set("password", password);
      else url.searchParams.delete("password");
      window.location.assign(url.toString());
    } catch (e) {
      console.error(e);
      setErr("Failed to submit password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium" htmlFor="pw">Password</label>
        <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
        {err && <div className="mt-1 text-sm text-red-600">{err}</div>}
      </div>
      <div className="sm:pb-[2px]">
        <Button type="submit" disabled={submitting}>Unlock</Button>
      </div>
    </form>
  );
}
