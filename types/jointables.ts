import { UUID } from "@/types/common";

export type ProjectAssessment = {
  project_id: UUID;
  assessment_id: UUID;
};

export type ProjectTag = {
  project_id: UUID;
  tag_id: UUID;
};

export type AssessmentTag = {
  assessment_id: UUID;
  tag_id: UUID;
};

export type AssessmentIssue = {
  assessment_id: UUID;
  issue_id: UUID;
};

export type IssueTag = {
  issue_id: UUID;
  tag_id: UUID;
};
