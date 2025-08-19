import IssueDetailPage from "@/components/custom/issues/IssueDetailPage";

export type IssueDetailRouteParams = {
  readonly id: string;
};

export interface IssueDetailPageProps {
  readonly params: IssueDetailRouteParams;
}

export default function Page({ params }: IssueDetailPageProps) {
  return <IssueDetailPage issueId={params.id} />;
}
