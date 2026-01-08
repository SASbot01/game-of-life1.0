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
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type VaultMode = "personal" | "business";

export default function TheVault() {
  const { user } = useAuth();
  const [vaultMode, setVaultMode] = useState<VaultMode>("personal");

  // Fetch real totals from database filtered by vault mode
  const { data: totals } = useQuery({
    queryKey: ["vault-totals", user?.id, vaultMode],
    queryFn: async () => {
      // Type assertion for vault_mode field that will be added via migration
      const { data, error } = await supabase
        .from("finance_assets")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;

      // Filter by vault_mode (with fallback for records without the field)
      const filteredData = data.filter((item: any) =>
        !item.vault_mode || item.vault_mode === vaultMode
      );

      const totalAssets = filteredData
        .filter((item) => item.class === "current_asset" || item.class === "fixed_asset")
        .reduce((sum, item) => sum + Number(item.value), 0);

      const totalLiabilities = filteredData
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
          vaultMode={vaultMode}
        />
      ),
    },
    {
      id: "wallet",
      label: "WALLET",
      icon: Wallet,
      content: <VaultWalletTab vaultMode={vaultMode} />,
    },
    {
      id: "cashflow",
      label: "CASHFLOW",
      icon: ArrowRightLeft,
      content: <VaultCashflowTab vaultMode={vaultMode} />,
    },
    {
      id: "ledger",
      label: "LEDGER",
      icon: BookOpen,
      content: <VaultLedgerTab vaultMode={vaultMode} />,
    },
    {
      id: "config",
      label: "CONFIG",
      icon: Settings,
      content: <VaultConfigTab />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Vault Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={vaultMode === "personal" ? "default" : "outline"}
            onClick={() => setVaultMode("personal")}
            className={vaultMode === "personal" ? "bg-vault text-vault-foreground" : "border-vault/30 text-vault"}
          >
            👤 Personal
          </Button>
          <Button
            variant={vaultMode === "business" ? "default" : "outline"}
            onClick={() => setVaultMode("business")}
            className={vaultMode === "business" ? "bg-vault text-vault-foreground" : "border-vault/30 text-vault"}
          >
            🏢 Business
          </Button>
        </div>
      </div>

      <ModuleLayout
        title="THE VAULT"
        subtitle={`${vaultMode === "personal" ? "Personal" : "Business"} Balance Sheet & Financial Command Center`}
        icon={Gem}
        variant="vault"
        tabs={tabs}
        defaultTab="assets"
      />
    </div>
  );
}
