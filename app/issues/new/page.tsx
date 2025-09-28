import React, { Suspense } from "react";
import IssueForm from "@/components/custom/issues/IssueForm";
import { OldIssueForm } from "@/components/custom/issues/OldIssueForm";
function Page() {
  return (
    <div>
      Create a new issue
      <Suspense fallback={<div>Loading form…</div>}>
        <IssueForm />
      </Suspense>
    </div>
  );
}

export default Page;
