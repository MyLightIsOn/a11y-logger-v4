"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function IssueForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(title, description);
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
      <Button form="create-issue-form" type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Issue"}
      </Button>
    </div>
  );
}

export default IssueForm;
