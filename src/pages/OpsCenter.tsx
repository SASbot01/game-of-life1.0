import { Crosshair, BarChart3, Target, Settings, FolderKanban } from "lucide-react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { OpsDrilldownDashboard } from "@/components/ops/OpsDrilldownDashboard";
import { OpsTacticalTab } from "@/components/ops/OpsTacticalTab";
import { OpsIntelTab } from "@/components/ops/OpsIntelTab";
import { OpsConfigTab } from "@/components/ops/OpsConfigTab";

export default function OpsCenter() {
  const tabs = [
    {
      id: "strategy",
      label: "STRATEGY",
      icon: FolderKanban,
      content: <OpsDrilldownDashboard />,
    },
    {
      id: "tactical",
      label: "TACTICAL",
      icon: Target,
      content: <OpsTacticalTab />,
    },
    {
      id: "intel",
      label: "INTEL",
      icon: BarChart3,
      content: <OpsIntelTab />,
    },
    {
      id: "config",
      label: "CONFIG",
      icon: Settings,
      content: <OpsConfigTab />,
    },
  ];

  return (
    <ModuleLayout
      title="OPS CENTER"
      subtitle="Mission control & task management"
      icon={Crosshair}
      variant="ops"
      tabs={tabs}
      defaultTab="strategy"
    />
  );
}