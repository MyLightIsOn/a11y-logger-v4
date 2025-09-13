import IssueDetailPage from "@/components/custom/issues/IssueDetailPage";

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const { id } = params;
  return <IssueDetailPage issueId={id ?? ""} />;
}
