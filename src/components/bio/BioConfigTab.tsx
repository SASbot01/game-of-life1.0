import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Droplets, Zap, Trash2, Edit2, Plus, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type HabitCategory = "health" | "mana" | "stamina";

interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  xp_reward: number;
  hp_impact: number;
  is_active: boolean;
  area_id: string | null;
}

interface Area {
  id: string;
  name: string;
  color: string | null;
}

const categoryIcons = {
  health: Heart,
  mana: Droplets,
  stamina: Zap,
};

const categoryStyles = {
  health: "text-bio border-bio/30 bg-bio/10",
  mana: "text-ops border-ops/30 bg-ops/10",
  stamina: "text-vault border-vault/30 bg-vault/10",
};

export function BioConfigTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "health" as HabitCategory,
    xp_reward: 10,
    hp_impact: 5,
    area_id: "" as string,
  });

  // Fetch habits
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ["habits-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("id, name, category, xp_reward, hp_impact, is_active, area_id")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Habit[];
    },
    enabled: !!user?.id,
  });

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ["areas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name, color")
        .eq("user_id", user?.id)
        .order("name");

      if (error) throw error;
      return data as Area[];
    },
    enabled: !!user?.id,
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setEditingHabit(null);
      setFormData({ name: "", category: "health", xp_reward: 10, hp_impact: 5, area_id: "" });
    }
  }, [isDialogOpen]);

  // Load editing habit into form
  useEffect(() => {
    if (editingHabit) {
      setFormData({
        name: editingHabit.name,
        category: editingHabit.category,
        xp_reward: editingHabit.xp_reward,
        hp_impact: editingHabit.hp_impact,
        area_id: editingHabit.area_id || "",
      });
    }
  }, [editingHabit]);

  // Create habit mutation
  const createHabitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("habits").insert({
        user_id: user?.id,
        name: formData.name,
        category: formData.category,
        xp_reward: formData.xp_reward,
        hp_impact: formData.hp_impact,
        area_id: formData.area_id || null,
        type: "positive",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-config"] });
      setIsDialogOpen(false);
      toast.success("Habit created");
    },
    onError: () => toast.error("Failed to create habit"),
  });

  // Update habit mutation
  const updateHabitMutation = useMutation({
    mutationFn: async () => {
      if (!editingHabit) return;
      const { error } = await supabase
        .from("habits")
        .update({
          name: formData.name,
          category: formData.category,
          xp_reward: formData.xp_reward,
          hp_impact: formData.hp_impact,
          area_id: formData.area_id || null,
        })
        .eq("id", editingHabit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-config"] });
      setIsDialogOpen(false);
      toast.success("Habit updated");
    },
    onError: () => toast.error("Failed to update habit"),
  });

  // Delete habit mutation
  const deleteHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-config"] });
      toast.success("Habit deleted");
    },
    onError: () => toast.error("Failed to delete habit"),
  });

  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setHabitToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (habitToDelete) {
      deleteHabitMutation.mutate(habitToDelete);
      setDeleteDialogOpen(false);
      setHabitToDelete(null);
    }
  };

  const handleSave = () => {
    if (editingHabit) {
      updateHabitMutation.mutate();
    } else {
      createHabitMutation.mutate();
    }
  };

  const isPending = createHabitMutation.isPending || updateHabitMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground font-mono animate-pulse">LOADING HABITS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">HABIT CONFIGURATION</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define XP rewards, HP impacts, and frequencies
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-bio hover:bg-bio/80 text-bio-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingHabit ? "Edit Habit" : "Create New Habit"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Habit Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Workout"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: HabitCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health">
                      <span className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-bio" /> Health
                      </span>
                    </SelectItem>
                    <SelectItem value="mana">
                      <span className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-ops" /> Mana
                      </span>
                    </SelectItem>
                    <SelectItem value="stamina">
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-vault" /> Stamina
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Area Selection */}
              <div className="space-y-2">
                <Label>Linked Area (optional)</Label>
                <Select
                  value={formData.area_id}
                  onValueChange={(value) => setFormData({ ...formData, area_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="No area linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No area linked</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>XP Reward</Label>
                  <Input
                    type="number"
                    value={formData.xp_reward}
                    onChange={(e) => setFormData({ ...formData, xp_reward: Number(e.target.value) })}
                    className="bg-secondary border-border font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>HP Impact</Label>
                  <Input
                    type="number"
                    value={formData.hp_impact}
                    onChange={(e) => setFormData({ ...formData, hp_impact: Number(e.target.value) })}
                    className="bg-secondary border-border font-mono"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!formData.name || isPending}
                className="w-full bg-bio hover:bg-bio/80 text-bio-foreground"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingHabit ? "Save Changes" : "Create Habit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the habit and all associated logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No habits configured yet. Create your first habit to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit, index) => {
            const Icon = categoryIcons[habit.category];
            const linkedArea = areas.find(a => a.id === habit.area_id);
            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded border", categoryStyles[habit.category])}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium">{habit.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-xs">
                      <span className="text-ops font-mono">+{habit.xp_reward} XP</span>
                      <span className="text-bio font-mono">+{habit.hp_impact} HP</span>
                      {linkedArea && (
                        <span className="text-muted-foreground">• {linkedArea.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(habit)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => openDeleteDialog(habit.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
