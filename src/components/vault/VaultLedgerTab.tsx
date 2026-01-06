import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, PiggyBank, Bitcoin, TrendingUp, Home, Car,
  CreditCard, Landmark, Building, Gem, Plus, Edit2,
  ChevronDown, ChevronRight, Trash2, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";

type AssetClass = "current_asset" | "fixed_asset" | "current_liability" | "long_term_liability";

interface FinanceItem {
  id: string;
  name: string;
  value: number;
  type: string;
  class: AssetClass;
  icon?: string;
}

const getIcon = (iconType: string) => {
  switch (iconType) {
    case "wallet": return <Wallet className="w-4 h-4" />;
    case "piggy": return <PiggyBank className="w-4 h-4" />;
    case "bitcoin": return <Bitcoin className="w-4 h-4" />;
    case "chart": return <TrendingUp className="w-4 h-4" />;
    case "home": return <Home className="w-4 h-4" />;
    case "car": return <Car className="w-4 h-4" />;
    case "credit": return <CreditCard className="w-4 h-4" />;
    case "bank": return <Landmark className="w-4 h-4" />;
    case "bill": return <Building className="w-4 h-4" />;
    default: return <Gem className="w-4 h-4" />;
  }
};

export function VaultLedgerTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FinanceItem | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FinanceItem | null>(null);
  const [openSections, setOpenSections] = useState({
    currentAssets: true,
    fixedAssets: true,
    currentLiabilities: true,
    longTermLiabilities: true,
  });

  const [newAsset, setNewAsset] = useState({
    name: "",
    value: "",
    type: "",
    class: "current_asset" as AssetClass,
  });

  // Fetch assets from Supabase
  const { data: financeItems = [], isLoading } = useQuery({
    queryKey: ["finance-assets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_assets")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        value: Number(item.value),
        type: item.type,
        class: item.class as AssetClass,
        icon: item.icon || undefined,
      })) as FinanceItem[];
    },
    enabled: !!user?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (item: Omit<FinanceItem, "id">) => {
      const { data, error } = await supabase
        .from("finance_assets")
        .insert({
          user_id: user!.id,
          name: item.name,
          value: item.value,
          type: item.type,
          class: item.class,
          icon: item.icon,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
      queryClient.invalidateQueries({ queryKey: ["vault-totals"] });
      toast({ title: "Item Added", description: "Added to balance sheet" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from("finance_assets")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
      queryClient.invalidateQueries({ queryKey: ["vault-totals"] });
      toast({ title: "Value Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_assets")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
      queryClient.invalidateQueries({ queryKey: ["vault-totals"] });
      toast({ title: "Item Deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    },
  });

  const currentAssets = financeItems.filter((i) => i.class === "current_asset");
  const fixedAssets = financeItems.filter((i) => i.class === "fixed_asset");
  const currentLiabilities = financeItems.filter((i) => i.class === "current_liability");
  const longTermLiabilities = financeItems.filter((i) => i.class === "long_term_liability");

  const totalCurrentAssets = currentAssets.reduce((sum, i) => sum + i.value, 0);
  const totalFixedAssets = fixedAssets.reduce((sum, i) => sum + i.value, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiabilities = currentLiabilities.reduce((sum, i) => sum + i.value, 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((sum, i) => sum + i.value, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  const handleCreateAsset = () => {
    if (!newAsset.name.trim() || !newAsset.value) {
      toast({ title: "Error", description: "Name and value are required", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      name: newAsset.name.trim(),
      value: parseFloat(newAsset.value),
      type: newAsset.type || "Other",
      class: newAsset.class,
    });

    setNewAsset({ name: "", value: "", type: "", class: "current_asset" });
    setAssetDialogOpen(false);
  };

  const handleUpdateItem = () => {
    if (selectedItem && editValue) {
      updateMutation.mutate({ id: selectedItem.id, value: parseFloat(editValue) });
      setSelectedItem(null);
      setEditValue("");
    }
  };

  const handleDeleteItem = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const BalanceSection = ({
    title,
    items,
    total,
    isOpen,
    onToggle,
    variant,
  }: {
    title: string;
    items: FinanceItem[];
    total: number;
    isOpen: boolean;
    onToggle: () => void;
    variant: "asset" | "liability";
  }) => (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
            variant === "asset"
              ? "bg-vault/5 hover:bg-vault/10 border border-vault/20"
              : "bg-bio/5 hover:bg-bio/10 border border-bio/20"
          }`}
        >
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-title text-sm uppercase tracking-wider">{title}</span>
          </div>
          <span className={`font-mono text-sm font-bold ${variant === "asset" ? "text-vault" : "text-bio"}`}>
            {variant === "liability" && "-"}<AnimatedNumber value={total} prefix="$" />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AnimatePresence>
          <div className="mt-2 space-y-1 pl-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No items</p>
            ) : items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
              >
                <div
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    setSelectedItem(item);
                    setEditValue(item.value.toString());
                  }}
                >
                  <span className={variant === "asset" ? "text-vault/60" : "text-bio/60"}>
                    {getIcon(item.icon || "")}
                  </span>
                  <div>
                    <span className="text-sm">{item.name}</span>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm ${variant === "asset" ? "text-vault" : "text-bio"}`}>
                    ${item.value.toLocaleString()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedItem(item);
                          setEditValue(item.value.toString());
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Value
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading balance sheet...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-destructive">DELETE ITEM</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">BALANCE SHEET</h3>
          <p className="text-sm text-muted-foreground mt-1">Assets vs Liabilities</p>
        </div>
        <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-vault hover:bg-vault/80 text-vault-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-vault">ADD BALANCE ITEM</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder="e.g., Savings Account"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value ($)</Label>
                  <Input
                    type="number"
                    value={newAsset.value}
                    onChange={(e) => setNewAsset({ ...newAsset, value: e.target.value })}
                    placeholder="0.00"
                    className="bg-secondary border-border font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input
                    value={newAsset.type}
                    onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                    placeholder="Cash, Crypto..."
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Classification</Label>
                <Select
                  value={newAsset.class}
                  onValueChange={(v) => setNewAsset({ ...newAsset, class: v as AssetClass })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_asset">Current Asset (Liquid)</SelectItem>
                    <SelectItem value="fixed_asset">Fixed Asset (Long-term)</SelectItem>
                    <SelectItem value="current_liability">Current Liability (Short-term debt)</SelectItem>
                    <SelectItem value="long_term_liability">Long-term Liability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleCreateAsset} 
                className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Add to Balance Sheet"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-vault">
              UPDATE VALUE
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">{selectedItem?.name}</p>
            <div className="space-y-2">
              <Label>New Value ($)</Label>
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-secondary border-border font-mono"
              />
            </div>
            <Button 
              onClick={handleUpdateItem} 
              className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Value"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance Sheet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASSETS Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-vault" />
            <h2 className="font-display text-lg text-vault">ASSETS</h2>
            <span className="ml-auto font-mono text-vault text-glow-vault">
              ${totalAssets.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            <BalanceSection
              title="Current Assets"
              items={currentAssets}
              total={totalCurrentAssets}
              isOpen={openSections.currentAssets}
              onToggle={() =>
                setOpenSections((s) => ({ ...s, currentAssets: !s.currentAssets }))
              }
              variant="asset"
            />
            <BalanceSection
              title="Fixed Assets"
              items={fixedAssets}
              total={totalFixedAssets}
              isOpen={openSections.fixedAssets}
              onToggle={() =>
                setOpenSections((s) => ({ ...s, fixedAssets: !s.fixedAssets }))
              }
              variant="asset"
            />
          </div>
        </div>

        {/* LIABILITIES Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-bio" />
            <h2 className="font-display text-lg text-bio">LIABILITIES</h2>
            <span className="ml-auto font-mono text-bio text-glow-bio">
              -${totalLiabilities.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            <BalanceSection
              title="Current Liabilities"
              items={currentLiabilities}
              total={totalCurrentLiabilities}
              isOpen={openSections.currentLiabilities}
              onToggle={() =>
                setOpenSections((s) => ({ ...s, currentLiabilities: !s.currentLiabilities }))
              }
              variant="liability"
            />
            <BalanceSection
              title="Long-term Liabilities"
              items={longTermLiabilities}
              total={totalLongTermLiabilities}
              isOpen={openSections.longTermLiabilities}
              onToggle={() =>
                setOpenSections((s) => ({ ...s, longTermLiabilities: !s.longTermLiabilities }))
              }
              variant="liability"
            />
          </div>
        </div>
      </div>

      {/* Net Worth Summary */}
      <div className="space-card p-6 text-center border-vault/30">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Net Worth
        </span>
        <p
          className={`font-display text-4xl mt-2 ${
            totalAssets - totalLiabilities >= 0 ? "text-vault text-glow-vault" : "text-bio text-glow-bio"
          }`}
        >
          {totalAssets - totalLiabilities >= 0 ? "+" : "-"}
          <AnimatedNumber value={Math.abs(totalAssets - totalLiabilities)} prefix="$" className="font-display" />
        </p>
      </div>
    </div>
  );
}
