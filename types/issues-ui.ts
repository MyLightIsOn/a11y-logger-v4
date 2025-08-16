import type { FieldErrors } from "react-hook-form";
import type { CreateIssueInput } from "@/lib/validation/issues";

/** Props for the CoreFields client component */
export type CoreFieldsProps = {
  title: string;
  onTitleChangeAction: (v: string) => void;
  description: string;
  onDescriptionChangeAction: (v: string) => void;
  url: string;
  onUrlChangeAction: (v: string) => void;
  severity: string;
  onSeverityChangeAction: (v: string) => void;
  impact: string;
  onImpactChangeAction: (v: string) => void;
  suggestedFix: string;
  onSuggestedFixChangeAction: (v: string) => void;
  errors: FieldErrors<CreateIssueInput>;
};
