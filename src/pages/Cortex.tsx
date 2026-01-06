import { Brain, BookOpen, Calendar, Settings } from "lucide-react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { CortexLogTab } from "@/components/cortex/CortexLogTab";
import { CortexDatabaseTab } from "@/components/cortex/CortexDatabaseTab";
import { CortexConfigTab } from "@/components/cortex/CortexConfigTab";

export default function Cortex() {
  const tabs = [
    {
      id: "log",
      label: "CAPTAIN'S LOG",
      icon: Calendar,
      content: <CortexLogTab />,
    },
    {
      id: "database",
      label: "DATABASE",
      icon: BookOpen,
      content: <CortexDatabaseTab />,
    },
    {
      id: "config",
      label: "CONFIG",
      icon: Settings,
      content: <CortexConfigTab />,
    },
  ];

  return (
    <ModuleLayout
      title="CORTEX"
      subtitle="Neural link & knowledge base"
      icon={Brain}
      variant="bio"
      tabs={tabs}
      defaultTab="log"
    />
  );
}
