import { Gem, BarChart3, BookOpen, Settings, ArrowRightLeft, Wallet } from "lucide-react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { VaultAssetsTab } from "@/components/vault/VaultAssetsTab";
import { VaultLedgerTab } from "@/components/vault/VaultLedgerTab";
import { VaultCashflowTab } from "@/components/vault/VaultCashflowTab";
import { VaultWalletTab } from "@/components/vault/VaultWalletTab";
import { VaultConfigTab } from "@/components/vault/VaultConfigTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function TheVault() {
  const { user } = useAuth();

  // Fetch real totals from database
  const { data: totals } = useQuery({
    queryKey: ["vault-totals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_assets")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;

      const totalAssets = data
        .filter((item) => item.class === "current_asset" || item.class === "fixed_asset")
        .reduce((sum, item) => sum + Number(item.value), 0);

      const totalLiabilities = data
        .filter((item) => item.class === "current_liability" || item.class === "long_term_liability")
        .reduce((sum, item) => sum + Number(item.value), 0);

      return {
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
      };
    },
    enabled: !!user?.id,
  });

  const safeData = totals || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };

  const tabs = [
    {
      id: "assets",
      label: "ASSETS",
      icon: BarChart3,
      content: (
        <VaultAssetsTab
          netWorth={safeData.netWorth}
          totalAssets={safeData.totalAssets}
          totalLiabilities={safeData.totalLiabilities}
        />
      ),
    },
    {
      id: "wallet",
      label: "WALLET",
      icon: Wallet,
      content: <VaultWalletTab />,
    },
    {
      id: "cashflow",
      label: "CASHFLOW",
      icon: ArrowRightLeft,
      content: <VaultCashflowTab />,
    },
    {
      id: "ledger",
      label: "LEDGER",
      icon: BookOpen,
      content: <VaultLedgerTab />,
    },
    {
      id: "config",
      label: "CONFIG",
      icon: Settings,
      content: <VaultConfigTab />,
    },
  ];

  return (
    <ModuleLayout
      title="THE VAULT"
      subtitle="Balance Sheet & Financial Command Center"
      icon={Gem}
      variant="vault"
      tabs={tabs}
      defaultTab="assets"
    />
  );
}
