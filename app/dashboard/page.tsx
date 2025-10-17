import { SectionCards } from "@/components/custom/layout/section-cards";
import DashboardIssueStatistics from "@/components/custom/dashboard/dashboard-issue-statistics";
import { CriteriaTable } from "@/components/custom/dashboard/criteria-table";
import DashboardAreaChart from "@/components/custom/dashboard/dashboard-area-chart";

export default function Page() {
  return (
    <div className="flex flex-col max-w-screen-xl pt-2">
      <div className="flex flex-1 pb-4">
        <div className="w-3/4 flex flex-col">
          <div className="pb-4">
            <SectionCards />
          </div>
          <DashboardAreaChart />
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
