import React, { Suspense } from "react";
import IssueForm from "@/components/custom/issues/IssueForm";
function Page() {
  return (
    <div>
      <Suspense fallback={<div>Loading form…</div>}>
        <IssueForm />
      </Suspense>
    </div>
  );
}

export default Page;
