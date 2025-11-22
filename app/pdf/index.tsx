"use client";
import dynamic from "next/dynamic";
export { MyDocument } from "@/app/reports/[assessmentId]/print/document";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const PDFViewer = dynamic(
  async () => await import("@react-pdf/renderer").then((m) => m.PDFViewer),
  {
    loading: () => <>Loading</>,
    ssr: false,
  },
);

export const PDFDownloadLink = dynamic(
  async () =>
    await import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  {
    loading: () => (
      <Button>
        <Loader2 className={"animate-spin"}></Loader2>
        Loading
      </Button>
    ),
    ssr: false,
  },
);
