import IssueDetailPage from "@/components/custom/issues/IssueDetailPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <IssueDetailPage issueId={id ?? ""} />;
}
