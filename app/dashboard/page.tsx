import { SectionCards } from "@/components/section-cards";
import { DemoPieChart } from "@/components/demo-pie-chart";
import { DashboardBarChart } from "@/components/dashboard-bar-chart";
import { DashBoardLineChart } from "@/components/dashboard-line-chart";

export default function Page() {
  return (
    <div className="flex flex-col max-w-screen-xl">
      <div className="flex flex-1 pb-4">
        <div className="w-3/4 flex flex-col">
          <div className="pb-4">
            <SectionCards />
          </div>
          <DashBoardLineChart />
        </div>
        <div className="w-1/4 flex flex-1 pl-4">
          <DemoPieChart />
        </div>
      </div>
      <div>
        <DashboardBarChart />
      </div>
    </div>
  );
}
