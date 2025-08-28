import { SectionCards } from "@/components/custom/section-cards";
import DashboardIssueStatistics from "@/components/custom/dashboard-issue-statistics";
import { DashboardBarChart } from "@/components/custom/dashboard-bar-chart";
import { DashboardLineChart } from "@/components/custom/dashboard-line-chart";

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
        <DashboardBarChart />
      </div>
    </div>
  );
}
