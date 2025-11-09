"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewReportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/reports" className="dark:text-white hover:underline flex items-center a11y-focus w-fit">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">New Report (Placeholder)</h1>
      <p className="text-muted-foreground">This is a placeholder for creating a new report.</p>
    </div>
  );
}
