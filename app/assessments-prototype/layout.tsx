import Sidebar from "@/components/custom/sidebar";
export default function AssessmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Sidebar>{children}</Sidebar>;
}
