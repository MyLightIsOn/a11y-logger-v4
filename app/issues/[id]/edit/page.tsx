import React from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Edit Issue</h1>
      <p className="text-sm text-muted-foreground">Issue ID: {id}</p>
      {/* Step 3 will render the actual EditIssueForm here */}
    </div>
  );
}
