import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Link2,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, addWeeks, addMonths, addYears, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { DateRangeFilter, DateRange, getDateRangeFilter } from "@/components/shared/DateRangeFilter";

type TransactionForm = {
  concept: string;
  amount: string;
  type: "income" | "expense";
  linkedAssetId: string;
  isRecurring: boolean;
  recurrenceFrequency: "weekly" | "monthly" | "yearly";
  category: string;
  date: string;
  areaId: string;
};

const emptyForm: TransactionForm = {
  concept: "",
  amount: "",
  type: "expense",
  linkedAssetId: "",
  isRecurring: false,
  recurrenceFrequency: "monthly",
  category: "",
  date: format(new Date(), "yyyy-MM-dd"),
  areaId: "",
};

export function VaultCashflowTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange>("month");

  const [newTransaction, setNewTransaction] = useState<TransactionForm>(emptyForm);
  const [editForm, setEditForm] = useState<TransactionForm>(emptyForm);

  // Fetch assets
  const { data: assets = [] } = useQuery({
    queryKey: ["finance-assets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_assets")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ["areas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch categories from database
  const { data: financeCategories = [] } = useQuery({
    queryKey: ["finance-categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("*")
        .eq("user_id", user?.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Filter categories based on transaction type
  const getFilteredCategories = (type: "income" | "expense") =>
    financeCategories.filter((c) => c.type === type);

  // Fetch transactions with date range filter
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", user?.id, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*, linked_asset:finance_assets(name)")
        .eq("user_id", user?.id)
        .order("date", { ascending: false });

      const range = getDateRangeFilter(dateRange);
      if (range) {
        query = query
          .gte("date", format(range.start, "yyyy-MM-dd"))
          .lte("date", format(range.end, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate cashflow chart data
  const cashflowData = (() => {
    const last4Months = eachMonthOfInterval({
      start: subMonths(new Date(), 3),
      end: new Date(),
    });

    return last4Months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter((t) => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const income = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        month: format(month, "MMM"),
        income,
        expenses,
      };
    });
  })();

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
  const netFlow = totalIncome - totalExpenses;

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      const linkedAsset = assets.find((a) => a.id === newTransaction.linkedAssetId);
      const amount = parseFloat(newTransaction.amount);
      const today = format(new Date(), "yyyy-MM-dd");

      // Create transaction
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user?.id,
          description: newTransaction.concept,
          amount,
          type: newTransaction.type,
          linked_asset_id: newTransaction.linkedAssetId || null,
          is_recurring: newTransaction.isRecurring,
          recurrence_frequency: newTransaction.isRecurring ? newTransaction.recurrenceFrequency : null,
          category: newTransaction.category || "General",
          date: today,
          area_id: newTransaction.areaId || null,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update asset value
      if (linkedAsset) {
        const isLiability = linkedAsset.class.includes("liability");
        let newValue = Number(linkedAsset.value);

        if (newTransaction.type === "expense") {
          newValue = isLiability ? newValue + amount : newValue - amount;
        } else {
          newValue = isLiability ? newValue - amount : newValue + amount;
        }

        await supabase
          .from("finance_assets")
          .update({ value: newValue })
          .eq("id", linkedAsset.id);
      }

      // Create calendar events for recurring transactions
      if (newTransaction.isRecurring) {
        const events = [];
        let currentDate = new Date();

        // Create events for next 12 occurrences
        for (let i = 0; i < 12; i++) {
          if (i > 0) {
            switch (newTransaction.recurrenceFrequency) {
              case "weekly":
                currentDate = addWeeks(currentDate, 1);
                break;
              case "monthly":
                currentDate = addMonths(currentDate, 1);
                break;
              case "yearly":
                currentDate = addYears(currentDate, 1);
                break;
            }
          }

          events.push({
            user_id: user?.id,
            title: `${newTransaction.type === "expense" ? "💸" : "💰"} ${newTransaction.concept}`,
            description: `${newTransaction.type === "income" ? "+" : "-"}$${amount} - ${linkedAsset?.name || "No account"}`,
            start_time: currentDate.toISOString(),
            origin_type: "transaction",
            origin_id: txData.id,
            module: "vault",
            is_all_day: true,
          });
        }

        await supabase.from("calendar_events").insert(events);
      }

      return txData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setDialogOpen(false);
      setNewTransaction(emptyForm);
      toast.success("Transaction created" + (newTransaction.isRecurring ? " & synced to Chronos" : ""));
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to create transaction");
    },
  });

  // Update transaction mutation with proper accounting logic
  const updateTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!editingTransaction) return;

      const oldAmount = Number(editingTransaction.amount);
      const newAmount = parseFloat(editForm.amount);
      const oldLinkedAssetId = editingTransaction.linked_asset_id;
      const newLinkedAssetId = editForm.linkedAssetId && editForm.linkedAssetId !== "none" ? editForm.linkedAssetId : null;
      const oldType = editingTransaction.type;
      const newType = editForm.type;

      // Reverse the old transaction's effect on the old asset
      if (oldLinkedAssetId) {
        const oldAsset = assets.find((a) => a.id === oldLinkedAssetId);
        if (oldAsset) {
          const isLiability = oldAsset.class.includes("liability");
          let revertedValue = Number(oldAsset.value);
          
          // Reverse: if it was an expense, add back; if income, subtract back
          if (oldType === "expense") {
            revertedValue = isLiability ? revertedValue - oldAmount : revertedValue + oldAmount;
          } else {
            revertedValue = isLiability ? revertedValue + oldAmount : revertedValue - oldAmount;
          }

          await supabase
            .from("finance_assets")
            .update({ value: revertedValue })
            .eq("id", oldAsset.id);
        }
      }

      // Apply the new transaction's effect on the new asset
      if (newLinkedAssetId) {
        const newAsset = assets.find((a) => a.id === newLinkedAssetId);
        if (newAsset) {
          const isLiability = newAsset.class.includes("liability");
          // Get fresh value if same asset, otherwise use current
          const currentValue = oldLinkedAssetId === newLinkedAssetId 
            ? (await supabase.from("finance_assets").select("value").eq("id", newAsset.id).single()).data?.value ?? newAsset.value
            : Number(newAsset.value);
          let newValue = Number(currentValue);

          // Apply: expense to liability = increase liability (debt paid off reduces asset, but if paying with account we subtract from account)
          // The key insight: paying an expense to a liability means we're paying off debt
          // So the liability should DECREASE, and if there's a source account, it should also decrease
          if (newType === "expense") {
            newValue = isLiability ? newValue - newAmount : newValue - newAmount;
          } else {
            newValue = isLiability ? newValue - newAmount : newValue + newAmount;
          }

          await supabase
            .from("finance_assets")
            .update({ value: newValue })
            .eq("id", newAsset.id);
        }
      }

      const { error } = await supabase
        .from("transactions")
        .update({
          description: editForm.concept,
          amount: newAmount,
          type: newType,
          linked_asset_id: newLinkedAssetId,
          is_recurring: editForm.isRecurring,
          recurrence_frequency: editForm.isRecurring ? editForm.recurrenceFrequency : null,
          category: editForm.category || "General",
          date: editForm.date,
        })
        .eq("id", editingTransaction.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
      queryClient.invalidateQueries({ queryKey: ["vault-totals"] });
      setEditDialogOpen(false);
      setEditingTransaction(null);
      toast.success("Transaction updated");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to update transaction");
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!editingTransaction) return;

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", editingTransaction.id);

      if (error) throw error;

      // Also delete related calendar events
      await supabase
        .from("calendar_events")
        .delete()
        .eq("origin_id", editingTransaction.id)
        .eq("origin_type", "transaction");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["vault-totals"] });
      setDeleteDialogOpen(false);
      setEditingTransaction(null);
      toast.success("Transaction deleted");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete transaction");
    },
  });

  const openEditDialog = (tx: any) => {
    setEditingTransaction(tx);
    setEditForm({
      concept: tx.description || "",
      amount: String(tx.amount),
      type: tx.type,
      linkedAssetId: tx.linked_asset_id || "",
      isRecurring: tx.is_recurring,
      recurrenceFrequency: tx.recurrence_frequency || "monthly",
      category: tx.category || "",
      date: tx.date || format(new Date(), "yyyy-MM-dd"),
      areaId: tx.area_id || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (tx: any) => {
    setEditingTransaction(tx);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">CASHFLOW CONSOLE</h3>
          <p className="text-sm text-muted-foreground mt-1">Track money flows & recurring payments</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangeFilter value={dateRange} onChange={setDateRange} variant="vault" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-vault hover:bg-vault/80 text-vault-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-vault">TRANSACTION TERMINAL</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Concept */}
                <div className="space-y-2">
                  <Label>Concept</Label>
                  <Input
                    value={newTransaction.concept}
                    onChange={(e) => setNewTransaction({ ...newTransaction, concept: e.target.value })}
                    placeholder="e.g., Salary, Rent, Groceries"
                    className="bg-secondary border-border"
                  />
                </div>

                {/* Amount & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      placeholder="0.00"
                      className="bg-secondary border-border font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, type: v as "income" | "expense" })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">
                          <span className="flex items-center gap-2 text-green-500">
                            <ArrowUpCircle className="w-4 h-4" /> Income
                          </span>
                        </SelectItem>
                        <SelectItem value="expense">
                          <span className="flex items-center gap-2 text-bio">
                            <ArrowDownCircle className="w-4 h-4" /> Expense
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Area Selection */}
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Select
                    value={newTransaction.areaId}
                    onValueChange={(v) => setNewTransaction({ ...newTransaction, areaId: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select area (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No area</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newTransaction.category}
                    onValueChange={(v) => setNewTransaction({ ...newTransaction, category: v })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredCategories(newTransaction.type).map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Link Account */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-vault" />
                    Source/Destination Account
                  </Label>
                  <Select
                    value={newTransaction.linkedAssetId}
                    onValueChange={(v) => setNewTransaction({ ...newTransaction, linkedAssetId: v })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <span className="flex items-center justify-between w-full">
                            <span>{asset.name}</span>
                            <span className="ml-2 text-muted-foreground font-mono text-xs">
                              ${Number(asset.value).toLocaleString()}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {newTransaction.type === "expense"
                      ? "Amount will be deducted from this account"
                      : "Amount will be added to this account"}
                  </p>
                </div>

                {/* Recurring Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-ops" />
                    <div>
                      <Label className="cursor-pointer">Recurring Payment</Label>
                      <p className="text-xs text-muted-foreground">Syncs to Chronos calendar</p>
                    </div>
                  </div>
                  <Switch
                    checked={newTransaction.isRecurring}
                    onCheckedChange={(v) => setNewTransaction({ ...newTransaction, isRecurring: v })}
                  />
                </div>

                {/* Recurrence Frequency */}
                {newTransaction.isRecurring && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label>Frequency</Label>
                    <Select
                      value={newTransaction.recurrenceFrequency}
                      onValueChange={(v) =>
                        setNewTransaction({
                          ...newTransaction,
                          recurrenceFrequency: v as "weekly" | "monthly" | "yearly",
                        })
                      }
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                <Button
                  onClick={() => createTransactionMutation.mutate()}
                  disabled={!newTransaction.concept || !newTransaction.amount || createTransactionMutation.isPending}
                  className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  {createTransactionMutation.isPending ? "Processing..." : "Execute Transaction"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cashflow Summary */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-card p-4">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-title uppercase">Income</span>
          </div>
          <p className="font-mono text-2xl text-green-500">+${totalIncome.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-card p-4">
          <div className="flex items-center gap-2 text-bio mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm font-title uppercase">Expenses</span>
          </div>
          <p className="font-mono text-2xl text-bio">-${totalExpenses.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-card p-4 border-vault/30">
          <div className="flex items-center gap-2 text-vault mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-title uppercase">Net Flow</span>
          </div>
          <p className={`font-mono text-2xl ${netFlow >= 0 ? "text-vault text-glow-vault" : "text-bio"}`}>
            {netFlow >= 0 ? "+" : ""}${netFlow.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Cashflow Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-card p-4">
        <h4 className="font-title text-sm uppercase tracking-wider mb-4 text-muted-foreground">CASHFLOW MONITOR</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--bio))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Transaction Log */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-card p-4">
        <h4 className="font-title text-sm uppercase tracking-wider mb-4 text-muted-foreground">TRANSACTION LOG</h4>
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8 animate-pulse">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">No transactions found</div>
          ) : (
            transactions.slice(0, 10).map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tx.type === "income" ? "bg-green-500/20 text-green-500" : "bg-bio/20 text-bio"}`}>
                    {tx.type === "income" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{tx.category}</span>
                      {tx.is_recurring && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-ops">
                            <RefreshCw className="w-3 h-3" />
                            {tx.recurrence_frequency}
                          </span>
                        </>
                      )}
                      {tx.linked_asset && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            {tx.linked_asset.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-mono font-semibold ${tx.type === "income" ? "text-green-500" : "text-bio"}`}>
                      {tx.type === "income" ? "+" : "-"}${Number(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.date), "MMM d")}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(tx)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteDialog(tx)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-vault">EDIT TRANSACTION</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Concept</Label>
              <Input
                value={editForm.concept}
                onChange={(e) => setEditForm({ ...editForm, concept: e.target.value })}
                placeholder="e.g., Salary, Rent, Groceries"
                className="bg-secondary border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) => setEditForm({ ...editForm, type: v as "income" | "expense" })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">
                      <span className="flex items-center gap-2 text-green-500">
                        <ArrowUpCircle className="w-4 h-4" /> Income
                      </span>
                    </SelectItem>
                    <SelectItem value="expense">
                      <span className="flex items-center gap-2 text-bio">
                        <ArrowDownCircle className="w-4 h-4" /> Expense
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm({ ...editForm, category: v })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredCategories(editForm.type).map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-vault" />
                Source/Destination Account
              </Label>
              <Select
                value={editForm.linkedAssetId}
                onValueChange={(v) => setEditForm({ ...editForm, linkedAssetId: v })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      <span className="flex items-center justify-between w-full">
                        <span>{asset.name}</span>
                        <span className="ml-2 text-muted-foreground font-mono text-xs">
                          ${Number(asset.value).toLocaleString()}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-vault" />
                Date
              </Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-ops" />
                <div>
                  <Label className="cursor-pointer">Recurring Payment</Label>
                  <p className="text-xs text-muted-foreground">Syncs to Chronos calendar</p>
                </div>
              </div>
              <Switch
                checked={editForm.isRecurring}
                onCheckedChange={(v) => setEditForm({ ...editForm, isRecurring: v })}
              />
            </div>

            {editForm.isRecurring && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <Label>Frequency</Label>
                <Select
                  value={editForm.recurrenceFrequency}
                  onValueChange={(v) =>
                    setEditForm({
                      ...editForm,
                      recurrenceFrequency: v as "weekly" | "monthly" | "yearly",
                    })
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}

            <Button
              onClick={() => updateTransactionMutation.mutate()}
              disabled={!editForm.concept || !editForm.amount || updateTransactionMutation.isPending}
              className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {updateTransactionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{editingTransaction?.description}" and any associated calendar events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTransactionMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTransactionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
