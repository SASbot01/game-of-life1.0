import { Heart, BarChart3, Flame, Settings } from "lucide-react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { BioStatusTab } from "@/components/bio/BioStatusTab";
import { BioActionTab } from "@/components/bio/BioActionTab";
import { BioConfigTab } from "@/components/bio/BioConfigTab";
import { PunishmentModal } from "@/components/bio/PunishmentModal";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

export default function BioDome() {
  const { profile } = useAuth();
  const [showPunishmentModal, setShowPunishmentModal] = useState(false);

  useEffect(() => {
    if (profile && profile.hp === 0) {
      setShowPunishmentModal(true);
    } else {
      setShowPunishmentModal(false);
    }
  }, [profile?.hp]);

  const tabs = [
    {
      id: "status",
      label: "STATUS",
      icon: BarChart3,
      content: <BioStatusTab />,
    },
    {
      id: "action",
      label: "ACTION",
      icon: Flame,
      content: <BioActionTab />,
    },
    {
      id: "config",
      label: "CONFIG",
      icon: Settings,
      content: <BioConfigTab />,
    },
  ];

  return (
    <>
      <ModuleLayout
        title="BIO-DOME"
        subtitle="Life maintenance & habit tracking"
        icon={Heart}
        variant="bio"
        tabs={tabs}
        defaultTab="action"
      />

      <PunishmentModal
        isOpen={showPunishmentModal}
        punishmentTask={profile?.punishment_task || '100 push-ups'}
        onComplete={() => setShowPunishmentModal(false)}
      />
    </>
  );
}
