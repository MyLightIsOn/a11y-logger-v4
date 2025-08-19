import React from "react";
import EditIssueFormContainer from "@/components/custom/issues/EditIssueFormContainer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Edit Issue</h1>
      <EditIssueFormContainer issueId={id} />
    </div>
  );
}
