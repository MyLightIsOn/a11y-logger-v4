import { SectionCards } from "@/components/custom/layout/section-cards";
import DashboardIssueStatistics from "@/components/custom/dashboard/dashboard-issue-statistics";
import { DashboardLineChart } from "@/components/custom/dashboard/dashboard-line-chart";
import { CriteriaTable } from "@/components/custom/dashboard/criteria-table";

export default function Page() {
  return (
    <div className="flex flex-col max-w-screen-xl">
      <div className="flex flex-1 pb-4">
        <div className="w-3/4 flex flex-col">
          <div className="pb-4">
            <SectionCards />
          </div>
          <DashboardLineChart />
        </div>
        <div className="w-1/4 flex flex-1 pl-4">
          <DashboardIssueStatistics />
        </div>
      </div>
      <div>
        <CriteriaTable />
      </div>
    </div>
  );
}
