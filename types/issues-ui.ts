import type { FieldErrors, FieldPath, FieldValues, UseFormRegisterReturn, UseFormRegister } from "react-hook-form";
import type { CreateIssueInput } from "@/lib/validation/issues";
import type { WcagVersion } from "@/types/issue";
import type { Option } from "@/types/options";

/** Props for the CoreFields client component */
export type CoreFieldsProps = {
  title: string,
  onTitleChangeAction: (v: string) => void,
  description: string,
  onDescriptionChangeAction: (v: string) => void,
  url: string,
  onUrlChangeAction: (v: string) => void,
  severity: string,
  onSeverityChangeAction: (v: string) => void,
  impact: string,
  onImpactChangeAction: (v: string) => void,
  suggestedFix: string,
  onSuggestedFixChangeAction: (v: string) => void,
  selector: string,
  onSelectorChangeAction: (v: string) => void,
  codeSnippet: string,
  onCodeSnippetChangeAction: (v: string) => void,
  errors: FieldErrors<CreateIssueInput>,
  register?: UseFormRegister<CreateIssueInput>
};

/** Props for the WcagCriteriaSection client component */
export type WcagCriteriaSectionProps = {
  isLoading: boolean;
  error: Error | null | undefined;
  options: Option[];
  selected: string[];
  onSelectedChangeAction: (arr: string[]) => void;
  disabled?: boolean;
  version?: WcagVersion | null;
  errors: FieldErrors<CreateIssueInput>;
};
