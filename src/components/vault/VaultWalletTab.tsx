import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Plus,
  Trash2,
  Target,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VaultMode } from "@/pages/TheVault";

type Pocket = {
  id: string;
  name: string;
  allocated_amount: number;
  target_amount: number | null;
  color: string;
  icon: string;
  linked_asset_id: string;
};

type WalletAsset = {
  id: string;
  name: string;
  value: number;
  type: string;
};

const pocketColors = [
  { name: "Primary", value: "primary" },
  { name: "Vault", value: "vault" },
  { name: "Ops", value: "ops" },
  { name: "Bio", value: "bio" },
  { name: "Chronos", value: "chronos" },
];

interface VaultWalletTabProps {
  vaultMode: VaultMode;
}

export function VaultWalletTab({ vaultMode }: VaultWalletTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const [addPocketDialogOpen, setAddPocketDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [selectedPocket, setSelectedPocket] = useState<Pocket | null>(null);
  const [editingPocket, setEditingPocket] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const [newPocket, setNewPocket] = useState({
    name: "",
    allocatedAmount: "",
    targetAmount: "",
    color: "primary",
  });

  const [transfer, setTransfer] = useState({
    fromPocketId: "",
    toPocketId: "",
    amount: "",
  });

  // Fetch wallet-type assets (bank accounts, wallets) filtered by vault mode
  const { data: walletAssets = [] } = useQuery({
    queryKey: ["wallet-assets", user?.id, vaultMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_assets")
        .select("*")
        .eq("user_id", user?.id)
        .in("type", ["Bank Account", "Wallet", "Cash", "Checking", "Savings"]);
      if (error) throw error;

      // Filter by vault_mode (with fallback for records without the field)
      const filtered = (data as any[]).filter((item: any) =>
        !item.vault_mode || item.vault_mode === vaultMode
      );
      return filtered as WalletAsset[];
    },
    enabled: !!user?.id,
  });

  // Fetch pockets filtered by vault mode
  const { data: pockets = [] } = useQuery({
    queryKey: ["pockets", user?.id, vaultMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pockets")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;

      // Filter by vault_mode (with fallback for records without the field)
      const filtered = (data as any[]).filter((item: any) =>
        !item.vault_mode || item.vault_mode === vaultMode
      );
      return filtered as Pocket[];
    },
    enabled: !!user?.id,
  });

  // Create pocket mutation
  const createPocketMutation = useMutation({
    mutationFn: async () => {
      const allocatedAmount = parseFloat(newPocket.allocatedAmount) || 0;
      const targetAmount = newPocket.targetAmount ? parseFloat(newPocket.targetAmount) : null;

      const { error } = await supabase.from("pockets").insert({
        user_id: user?.id,
        linked_asset_id: selectedWalletId,
        name: newPocket.name,
        allocated_amount: allocatedAmount,
        target_amount: targetAmount,
        color: newPocket.color,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pockets"] });
      setAddPocketDialogOpen(false);
      setNewPocket({ name: "", allocatedAmount: "", targetAmount: "", color: "primary" });
      toast.success("Pocket created");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to create pocket");
    },
  });

  // Update pocket amount mutation
  const updatePocketMutation = useMutation({
    mutationFn: async ({ pocketId, newAmount }: { pocketId: string; newAmount: number }) => {
      const { error } = await supabase
        .from("pockets")
        .update({ allocated_amount: newAmount })
        .eq("id", pocketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pockets"] });
      setEditingPocket(null);
      toast.success("Pocket updated");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to update pocket");
    },
  });

  // Delete pocket mutation
  const deletePocketMutation = useMutation({
    mutationFn: async (pocketId: string) => {
      const { error } = await supabase.from("pockets").delete().eq("id", pocketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pockets"] });
      setDeleteDialogOpen(false);
      setSelectedPocket(null);
      toast.success("Pocket deleted");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete pocket");
    },
  });

  // Transfer between pockets mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(transfer.amount);
      const fromPocket = pockets.find((p) => p.id === transfer.fromPocketId);
      const toPocket = pockets.find((p) => p.id === transfer.toPocketId);

      if (!fromPocket || !toPocket) throw new Error("Invalid pockets");
      if (amount > fromPocket.allocated_amount) throw new Error("Insufficient funds");

      // Update from pocket
      await supabase
        .from("pockets")
        .update({ allocated_amount: fromPocket.allocated_amount - amount })
        .eq("id", fromPocket.id);

      // Update to pocket
      await supabase
        .from("pockets")
        .update({ allocated_amount: toPocket.allocated_amount + amount })
        .eq("id", toPocket.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pockets"] });
      setTransferDialogOpen(false);
      setTransfer({ fromPocketId: "", toPocketId: "", amount: "" });
      toast.success("Transfer complete");
    },
    onError: (error: any) => {
      toast.error(error.message || "Transfer failed");
    },
  });

  const getPocketsForWallet = (walletId: string) => pockets.filter((p) => p.linked_asset_id === walletId);

  const getTotalAllocated = (walletId: string) =>
    getPocketsForWallet(walletId).reduce((sum, p) => sum + p.allocated_amount, 0);

  const getUnallocated = (wallet: WalletAsset) => wallet.value - getTotalAllocated(wallet.id);

  const handleStartEdit = (pocket: Pocket) => {
    setEditingPocket(pocket.id);
    setEditAmount(String(pocket.allocated_amount));
  };

  const handleSaveEdit = (pocket: Pocket) => {
    const newAmount = parseFloat(editAmount) || 0;
    updatePocketMutation.mutate({ pocketId: pocket.id, newAmount });
  };

  const handleCancelEdit = () => {
    setEditingPocket(null);
    setEditAmount("");
  };

  const openAddPocketDialog = (walletId: string) => {
    setSelectedWalletId(walletId);
    setAddPocketDialogOpen(true);
  };

  const openDeleteDialog = (pocket: Pocket) => {
    setSelectedPocket(pocket);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">WALLET CONTROL</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Distribute funds into pockets for organized spending
          </p>
        </div>
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-vault text-vault hover:bg-vault/10">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-vault">POCKET TRANSFER</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>From Pocket</Label>
                <Select value={transfer.fromPocketId} onValueChange={(v) => setTransfer({ ...transfer, fromPocketId: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select source pocket" />
                  </SelectTrigger>
                  <SelectContent>
                    {pockets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (${p.allocated_amount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Pocket</Label>
                <Select value={transfer.toPocketId} onValueChange={(v) => setTransfer({ ...transfer, toPocketId: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select destination pocket" />
                  </SelectTrigger>
                  <SelectContent>
                    {pockets.filter((p) => p.id !== transfer.fromPocketId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (${p.allocated_amount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  value={transfer.amount}
                  onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <Button
                onClick={() => transferMutation.mutate()}
                disabled={!transfer.fromPocketId || !transfer.toPocketId || !transfer.amount || transferMutation.isPending}
                className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Execute Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wallet Cards */}
      {walletAssets.length === 0 ? (
        <div className="space-card p-8 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-display text-lg mb-2">No Wallet Accounts</h4>
          <p className="text-sm text-muted-foreground">
            Add a Bank Account, Wallet, or Cash asset in the Assets tab to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {walletAssets.map((wallet, index) => {
            const walletPockets = getPocketsForWallet(wallet.id);
            const totalAllocated = getTotalAllocated(wallet.id);
            const unallocated = getUnallocated(wallet);
            const isExpanded = expandedWallet === wallet.id;

            return (
              <motion.div
                key={wallet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-card overflow-hidden"
              >
                {/* Wallet Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedWallet(isExpanded ? null : wallet.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-vault/20 text-vault">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-display text-lg">{wallet.name}</h4>
                        <p className="text-xs text-muted-foreground">{wallet.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-xl text-vault">${wallet.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {walletPockets.length} pocket{walletPockets.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Allocation Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Allocated: ${totalAllocated.toLocaleString()}</span>
                      <span className={cn("font-mono", unallocated >= 0 ? "text-vault" : "text-bio")}>
                        Unallocated: ${unallocated.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={wallet.value > 0 ? (totalAllocated / wallet.value) * 100 : 0}
                      className="h-2 bg-secondary"
                    />
                  </div>
                </div>

                {/* Expanded Pockets */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 space-y-3">
                        {walletPockets.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No pockets yet. Create one to organize your funds.
                          </p>
                        ) : (
                          walletPockets.map((pocket) => (
                            <div
                              key={pocket.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                `bg-${pocket.color}/5 border-${pocket.color}/20`
                              )}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={cn("w-3 h-3 rounded-full", `bg-${pocket.color}`)}>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{pocket.name}</p>
                                  {pocket.target_amount && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Progress
                                        value={(pocket.allocated_amount / pocket.target_amount) * 100}
                                        className="h-1 flex-1 max-w-[100px]"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        <Target className="w-3 h-3 inline mr-1" />
                                        ${pocket.target_amount.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {editingPocket === pocket.id ? (
                                  <>
                                    <Input
                                      type="number"
                                      value={editAmount}
                                      onChange={(e) => setEditAmount(e.target.value)}
                                      className="w-24 h-8 text-right font-mono bg-secondary border-border"
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-vault" onClick={() => handleSaveEdit(pocket)}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-mono text-lg">${pocket.allocated_amount.toLocaleString()}</span>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => handleStartEdit(pocket)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(pocket)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}

                        <Button
                          variant="outline"
                          className="w-full border-dashed border-vault/30 text-vault hover:bg-vault/10"
                          onClick={() => openAddPocketDialog(wallet.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Pocket
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Pocket Dialog */}
      <Dialog open={addPocketDialogOpen} onOpenChange={setAddPocketDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-vault">CREATE POCKET</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Pocket Name</Label>
              <Input
                value={newPocket.name}
                onChange={(e) => setNewPocket({ ...newPocket, name: e.target.value })}
                placeholder="e.g., Groceries, Rent, Emergency"
                className="bg-secondary border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Amount ($)</Label>
                <Input
                  type="number"
                  value={newPocket.allocatedAmount}
                  onChange={(e) => setNewPocket({ ...newPocket, allocatedAmount: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Amount (optional)</Label>
                <Input
                  type="number"
                  value={newPocket.targetAmount}
                  onChange={(e) => setNewPocket({ ...newPocket, targetAmount: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={newPocket.color} onValueChange={(v) => setNewPocket({ ...newPocket, color: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pocketColors.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-3 h-3 rounded-full", `bg-${c.value}`)} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => createPocketMutation.mutate()}
              disabled={!newPocket.name || createPocketMutation.isPending}
              className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Pocket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pocket?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPocket?.name}"? The allocated funds will become unallocated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/80"
              onClick={() => selectedPocket && deletePocketMutation.mutate(selectedPocket.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
