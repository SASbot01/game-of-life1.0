import { useState } from "react";
import { motion } from "framer-motion";
import { GripVertical, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PipelineStage {
  id: string;
  name: string;
  color: string;
}

interface XpRule {
  difficulty: string;
  xp: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const initialStages: PipelineStage[] = [
  { id: "backlog", name: "Backlog", color: "hsl(0 0% 50%)" },
  { id: "todo", name: "Todo", color: "hsl(200 100% 50%)" },
  { id: "in_progress", name: "In Progress", color: "hsl(43 100% 50%)" },
  { id: "review", name: "Review", color: "hsl(280 100% 60%)" },
  { id: "done", name: "Done", color: "hsl(150 100% 45%)" },
];

const initialXpRules: XpRule[] = [
  { difficulty: "Easy", xp: 10 },
  { difficulty: "Medium", xp: 25 },
  { difficulty: "Hard", xp: 50 },
  { difficulty: "Boss", xp: 100 },
];

const initialCategories: Category[] = [
  { id: "1", name: "Dev", color: "hsl(187 100% 50%)" },
  { id: "2", name: "Design", color: "hsl(340 100% 50%)" },
  { id: "3", name: "Business", color: "hsl(43 100% 50%)" },
  { id: "4", name: "Personal", color: "hsl(260 100% 65%)" },
];

export function OpsConfigTab() {
  const [stages, setStages] = useState(initialStages);
  const [xpRules, setXpRules] = useState(initialXpRules);
  const [categories, setCategories] = useState(initialCategories);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const updateStage = (id: string, name: string) => {
    setStages(stages.map(s => (s.id === id ? { ...s, name } : s)));
    setEditingStage(null);
    toast({ title: "Stage Updated" });
  };

  const updateXpRule = (difficulty: string, xp: number) => {
    setXpRules(xpRules.map(r => (r.difficulty === difficulty ? { ...r, xp } : r)));
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      color: `hsl(${Math.floor(Math.random() * 360)} 70% 50%)`,
    };
    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    toast({ title: "Category Added" });
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    toast({ title: "Category Deleted" });
  };

  const saveChanges = () => {
    toast({ title: "Settings Saved", description: "Your Ops configuration has been updated" });
  };

  return (
    <div className="space-y-8">
      {/* Pipeline Editor */}
      <div className="space-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg">PIPELINE STAGES</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Customize your workflow stages
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />

              {editingStage === stage.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    defaultValue={stage.name}
                    className="h-8 bg-secondary border-border"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateStage(stage.id, e.currentTarget.value);
                      } else if (e.key === "Escape") {
                        setEditingStage(null);
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingStage(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 font-medium">{stage.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingStage(stage.id)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* XP Rules */}
      <div className="space-card p-6">
        <div className="mb-4">
          <h3 className="font-display text-lg">XP REWARD RULES</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define XP rewards for each difficulty level
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {xpRules.map((rule, index) => (
            <motion.div
              key={rule.difficulty}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-lg border text-center",
                rule.difficulty === "Easy" && "border-emerald-400/30 bg-emerald-400/5",
                rule.difficulty === "Medium" && "border-ops/30 bg-ops/5",
                rule.difficulty === "Hard" && "border-vault/30 bg-vault/5",
                rule.difficulty === "Boss" && "border-bio/30 bg-bio/5"
              )}
            >
              <p className="text-xs text-muted-foreground uppercase mb-2">
                {rule.difficulty}
              </p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-muted-foreground">+</span>
                <Input
                  type="number"
                  value={rule.xp}
                  onChange={(e) => updateXpRule(rule.difficulty, Number(e.target.value))}
                  className="w-16 h-8 text-center bg-secondary border-border font-mono"
                />
                <span className="text-muted-foreground">XP</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Category Editor */}
      <div className="space-card p-6">
        <div className="mb-4">
          <h3 className="font-display text-lg">PROJECT CATEGORIES</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Organize tasks by custom categories
          </p>
        </div>

        <div className="space-y-3 mb-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
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

        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name..."
            className="bg-secondary border-border"
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <Button onClick={addCategory} className="bg-ops hover:bg-ops/80 text-ops-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={saveChanges}
        className="w-full bg-ops hover:bg-ops/80 text-ops-foreground"
        size="lg"
      >
        <Save className="w-4 h-4 mr-2" />
        Save Configuration
      </Button>
    </div>
  );
}
