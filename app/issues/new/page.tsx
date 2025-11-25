import React from "react";
import IssueForm from "@/components/custom/issues/IssueForm";
function Page() {
  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Create Issue</h1>
      <IssueForm />
    </div>
  );
}

export default Page;
