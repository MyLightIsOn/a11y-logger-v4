import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { CreateIssueInput } from "@/lib/validation/issues";
import type { WcagVersion } from "@/types/issue";

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
  selector: string;
  onSelectorChangeAction: (v: string) => void;
  codeSnippet: string;
  onCodeSnippetChangeAction: (v: string) => void;
  errors: FieldErrors<CreateIssueInput>;
  register: UseFormRegister<CreateIssueInput>;
};

/** Props for the WcagCriteriaSection client component */
export type WcagCriteriaSectionProps = {
  // Loading and error states (can still be provided by parent)
  isLoading?: boolean;
  error?: Error | null;
  // Raw criteria list used to compute options locally
  allCriteria: Array<{
    version: WcagVersion;
    code: string;
    name: string;
    level: "A" | "AA" | "AAA";
  }>;
  disabled?: boolean;
  // Context for deriving options
  version: WcagVersion | null;
  wcagLevel?: "A" | "AA" | "AAA";
  // RHF wiring
  errors: FieldErrors<CreateIssueInput>;
  watch: (name: keyof CreateIssueInput) => unknown;
  setValue: (name: keyof CreateIssueInput, value: unknown, options?: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean }) => void;
};
