import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Trash2, Plus, Save } from "lucide-react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FinanceCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "BTC", symbol: "₿", name: "Bitcoin" },
];

const defaultCategories: Omit<FinanceCategory, "id">[] = [
  { name: "Salary", type: "income", icon: "tag", color: "vault" },
  { name: "Freelance", type: "income", icon: "tag", color: "vault" },
  { name: "Investments", type: "income", icon: "tag", color: "vault" },
  { name: "Food", type: "expense", icon: "tag", color: "bio" },
  { name: "Transport", type: "expense", icon: "tag", color: "bio" },
  { name: "Entertainment", type: "expense", icon: "tag", color: "bio" },
  { name: "Utilities", type: "expense", icon: "tag", color: "bio" },
  { name: "Shopping", type: "expense", icon: "tag", color: "bio" },
];

export function VaultConfigTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState("USD");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("expense");

  // Fetch categories from database
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["finance-categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("*")
        .eq("user_id", user?.id)
        .order("name");
      if (error) throw error;
      return data as FinanceCategory[];
    },
    enabled: !!user?.id,
  });

  // Seed default categories if none exist
  const seedCategoriesMutation = useMutation({
    mutationFn: async () => {
      const categoriesToInsert = defaultCategories.map((c) => ({
        ...c,
        user_id: user?.id,
      }));
      const { error } = await supabase.from("finance_categories").insert(categoriesToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
    },
  });

  // Seed categories on first load if empty
  useEffect(() => {
    if (!isLoading && categories.length === 0 && user?.id) {
      seedCategoriesMutation.mutate();
    }
  }, [isLoading, categories.length, user?.id]);

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("finance_categories").insert({
        user_id: user?.id,
        name: newCategoryName.trim(),
        type: newCategoryType,
        color: newCategoryType === "income" ? "vault" : "bio",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
      setNewCategoryName("");
      toast.success("Category added");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to add category");
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
      toast.success("Category deleted");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete category");
    },
  });

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategoryMutation.mutate();
  };

  const deleteCategory = (id: string) => {
    deleteCategoryMutation.mutate(id);
  };

  const saveChanges = () => {
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-8">
      {/* Currency Settings */}
      <div className="space-card p-6">
        <div className="mb-4">
          <h3 className="font-display text-lg">CURRENCY SETTINGS</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set your primary display currency
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((cur) => (
                  <SelectItem key={cur.code} value={cur.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{cur.symbol}</span>
                      {cur.name} ({cur.code})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="space-card p-4 flex-1">
              <p className="text-xs text-muted-foreground mb-1">Preview</p>
              <p className="font-mono text-2xl text-vault">
                {currencies.find((c) => c.code === currency)?.symbol}1,234.56
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Income Categories */}
      <div className="space-card p-6">
        <div className="mb-4">
          <h3 className="font-display text-lg text-vault">INCOME CATEGORIES</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your income sources
          </p>
        </div>

        <div className="space-y-2 mb-4">
          {incomeCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-vault/5 border border-vault/20"
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: category.color }}
              />
              <span className="flex-1 font-medium">{category.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteCategory(category.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Expense Categories */}
      <div className="space-card p-6">
        <div className="mb-4">
          <h3 className="font-display text-lg text-bio">EXPENSE CATEGORIES</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track where your money goes
          </p>
        </div>

        <div className="space-y-2 mb-4">
          {expenseCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-bio/5 border border-bio/20"
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: category.color }}
              />
              <span className="flex-1 font-medium">{category.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteCategory(category.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add New Category */}
      <div className="space-card p-6">
        <h3 className="font-display text-lg mb-4">ADD CATEGORY</h3>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label>Category Name</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
          </div>
          <div className="w-full md:w-40 space-y-2">
            <Label>Type</Label>
            <Select
              value={newCategoryType}
              onValueChange={(v) => setNewCategoryType(v as "income" | "expense")}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={addCategory}
              className={cn(
                "w-full md:w-auto",
                newCategoryType === "income"
                  ? "bg-vault hover:bg-vault/80 text-vault-foreground"
                  : "bg-bio hover:bg-bio/80 text-bio-foreground"
              )}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={saveChanges}
        className="w-full bg-vault hover:bg-vault/80 text-vault-foreground"
        size="lg"
      >
        <Save className="w-4 h-4 mr-2" />
        Save Configuration
      </Button>
    </div>
  );
}
