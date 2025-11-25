import React from "react";
import EditIssueFormContainer from "@/components/custom/issues/EditIssueFormContainer";

export default async function Page() {
  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Edit Issue</h1>
      <EditIssueFormContainer />
    </div>
  );
}
