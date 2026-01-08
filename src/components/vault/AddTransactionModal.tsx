import { useState, useEffect } from "react";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, addWeeks, addMonths, addYears } from "date-fns";

interface AddTransactionModalProps {
  defaultAreaId?: string;
  onClose: () => void;
}

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
  projectId: string;
};

export function AddTransactionModal({ defaultAreaId, onClose }: AddTransactionModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<TransactionForm>({
    concept: "",
    amount: "",
    type: "expense",
    linkedAssetId: "",
    isRecurring: false,
    recurrenceFrequency: "monthly",
    category: "",
    date: format(new Date(), "yyyy-MM-dd"),
    areaId: defaultAreaId || "",
    projectId: "",
  });

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

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, area_id")
        .eq("user_id", user?.id)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Filter projects by selected area
  const filteredProjects = formData.areaId
    ? projects.filter(p => p.area_id === formData.areaId)
    : projects;

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      const linkedAsset = assets.find((a) => a.id === formData.linkedAssetId);
      const amount = parseFloat(formData.amount);

      // Create transaction
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user?.id,
          description: formData.concept,
          amount,
          type: formData.type,
          linked_asset_id: formData.linkedAssetId || null,
          is_recurring: formData.isRecurring,
          recurrence_frequency: formData.isRecurring ? formData.recurrenceFrequency : null,
          category: formData.category || "General",
          date: formData.date,
          area_id: formData.areaId || null,
          project_id: formData.projectId || null,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update asset value
      if (linkedAsset) {
        const isLiability = linkedAsset.class.includes("liability");
        let newValue = Number(linkedAsset.value);

        if (formData.type === "expense") {
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
      if (formData.isRecurring) {
        const events = [];
        let currentDate = new Date(formData.date);

        for (let i = 0; i < 12; i++) {
          if (i > 0) {
            switch (formData.recurrenceFrequency) {
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
            title: `${formData.type === "expense" ? "💸" : "💰"} ${formData.concept}`,
            description: `${formData.type === "income" ? "+" : "-"}$${amount} - ${linkedAsset?.name || "No account"}`,
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
      queryClient.invalidateQueries({ queryKey: ["area-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["vault-totals"] });
      toast.success("Transaction created");
      onClose();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to create transaction");
    },
  });

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-vault">ADD TRANSACTION</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Area Selection */}
          <div className="space-y-2">
            <Label>Area</Label>
            <Select
              value={formData.areaId}
              onValueChange={(v) => setFormData({ ...formData, areaId: v === "none" ? "" : v, projectId: "" })}
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

          {/* Project Selection */}
          {formData.areaId && filteredProjects.length > 0 && (
            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <Select
                value={formData.projectId}
                onValueChange={(v) => setFormData({ ...formData, projectId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Concept */}
          <div className="space-y-2">
            <Label>Concept</Label>
            <Input
              value={formData.concept}
              onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
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
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as "income" | "expense" })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <span className="flex items-center gap-2 text-vault">
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

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Housing, Food..."
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          {/* Link Account */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Link to Account
            </Label>
            <Select
              value={formData.linkedAssetId}
              onValueChange={(v) => setFormData({ ...formData, linkedAssetId: v === "none" ? "" : v })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No account</SelectItem>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} (${Number(a.value).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recurring */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="recurring" className="cursor-pointer">Recurring</Label>
            </div>
            <Switch
              id="recurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
            />
          </div>

          {formData.isRecurring && (
            <Select
              value={formData.recurrenceFrequency}
              onValueChange={(v) => setFormData({ ...formData, recurrenceFrequency: v as "weekly" | "monthly" | "yearly" })}
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
          )}

          {/* Submit Button */}
          <Button
            onClick={() => createTransactionMutation.mutate()}
            disabled={!formData.concept || !formData.amount || createTransactionMutation.isPending}
            className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
          >
            {createTransactionMutation.isPending ? "Processing..." : "Add Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
