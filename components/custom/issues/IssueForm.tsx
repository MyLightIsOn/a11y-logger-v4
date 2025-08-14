"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function IssueForm() {
  const [aiBusy, setAiBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string>(
    "Use AI to suggest fields based on current context.",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleAiAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiBusy(true);
    setAiError(null);
    setAiMessage("Generating suggestions...");
    try {
      const res = await fetch("/api/ai/issue-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("AI assist is not configured on this environment.");
        }
        const text = await res.text();
        throw new Error(text || `AI request failed (${res.status})`);
      }
      const json = await res.json();
      if (json?.title && !title) setTitle(json.title);
      if (json?.description && !description) setDescription(json.description);
      setAiMessage("Suggestions applied. Review and adjust as needed.");
    } catch (e: any) {
      setAiError(e?.message || "AI assist failed");
      setAiMessage(
        "AI assist unavailable. You can continue filling the form manually.",
      );
    } finally {
      setAiBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    console.log("submitting");
  };

  return (
    <div>
      <h2>Issue Form</h2>
      <form id={"create-issue-form"} onSubmit={handleSubmit}>
        <Label htmlFor={"title"}>Title</Label>
        <Input
          type={"text"}
          id={"title"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Label htmlFor={"description"}>Description</Label>
        <Textarea
          id={"description"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </form>
      <Button type="button" onClick={handleAiAssist} disabled={aiBusy}>
        {aiBusy ? "Working..." : "Generate/Refine with AI"}
      </Button>
    </div>
  );
}

export default IssueForm;
