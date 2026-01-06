import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Target, Plus, Folder, ChevronRight, DollarSign, 
  Activity, TrendingUp, BarChart3, Edit2, Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { AreaROIDashboard } from "@/components/dashboard/AreaROIDashboard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface AreaWithStats {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  projectCount: number;
  taskCount: number;
  completedTaskCount: number;
  habitCount: number;
  totalIncome: number;
  totalExpense: number;
}

const iconOptions = [
  { value: "briefcase", label: "Briefcase" },
  { value: "heart", label: "Heart" },
  { value: "users", label: "Users" },
  { value: "book", label: "Book" },
  { value: "home", label: "Home" },
  { value: "folder", label: "Folder" },
];

const colorOptions = [
  { value: "ops", label: "Operations (Orange)" },
  { value: "bio", label: "Bio (Green)" },
  { value: "vault", label: "Vault (Gold)" },
  { value: "primary", label: "Primary" },
];

const iconMap: Record<string, React.ElementType> = {
  briefcase: Target,
  heart: Activity,
  users: Target,
  book: Target,
  home: Target,
  folder: Folder,
};

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  ops: { 
    bg: "bg-ops/10", 
    text: "text-ops", 
    border: "border-ops/30",
    glow: "shadow-[0_0_20px_hsl(var(--ops)/0.3)]"
  },
  bio: { 
    bg: "bg-bio/10", 
    text: "text-bio", 
    border: "border-bio/30",
    glow: "shadow-[0_0_20px_hsl(var(--bio)/0.3)]"
  },
  vault: { 
    bg: "bg-vault/10", 
    text: "text-vault", 
    border: "border-vault/30",
    glow: "shadow-[0_0_20px_hsl(var(--vault)/0.3)]"
  },
  primary: { 
    bg: "bg-primary/10", 
    text: "text-primary", 
    border: "border-primary/30",
    glow: "shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
  },
};

export default function CommandCenterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaWithStats | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<AreaWithStats | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "folder",
    color: "ops",
  });

  // Fetch areas with aggregated stats
  const { data: areasWithStats = [], isLoading } = useQuery({
    queryKey: ["command-center-areas", user?.id],
    queryFn: async () => {
      const { data: areas, error: areasError } = await supabase
        .from("areas")
        .select("*")
        .eq("user_id", user?.id);
      
      if (areasError) throw areasError;

      const { data: projects } = await supabase
        .from("projects")
        .select("id, area_id")
        .eq("user_id", user?.id);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, project_id, status")
        .eq("user_id", user?.id);

      const { data: habits } = await supabase
        .from("habits")
        .select("id, area_id")
        .eq("user_id", user?.id);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("id, area_id, type, amount")
        .eq("user_id", user?.id);

      return areas?.map((area) => {
        const areaProjects = projects?.filter(p => p.area_id === area.id) || [];
        const projectIds = areaProjects.map(p => p.id);
        const areaTasks = tasks?.filter(t => projectIds.includes(t.project_id)) || [];
        const areaHabits = habits?.filter(h => h.area_id === area.id) || [];
        const areaTransactions = transactions?.filter(t => t.area_id === area.id) || [];

        const totalIncome = areaTransactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalExpense = areaTransactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          id: area.id,
          name: area.name,
          description: area.description,
          icon: area.icon || "folder",
          color: area.color || "ops",
          projectCount: areaProjects.length,
          taskCount: areaTasks.length,
          completedTaskCount: areaTasks.filter(t => t.status === "done").length,
          habitCount: areaHabits.length,
          totalIncome,
          totalExpense,
        };
      }) || [];
    },
    enabled: !!user?.id,
  });

  // Reset form when dialog closes
  const resetForm = () => {
    setEditingArea(null);
    setFormData({ name: "", description: "", icon: "folder", color: "ops" });
  };

  const openEditDialog = (area: AreaWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description || "",
      icon: area.icon,
      color: area.color,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (area: AreaWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setAreaToDelete(area);
    setDeleteDialogOpen(true);
  };

  // Create/Update area mutation
  const saveAreaMutation = useMutation({
    mutationFn: async () => {
      if (editingArea) {
        const { error } = await supabase
          .from("areas")
          .update({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
          })
          .eq("id", editingArea.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("areas").insert({
          user_id: user?.id,
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon,
          color: formData.color,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center-areas"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingArea ? "Area updated" : "Area created");
    },
    onError: () => toast.error(editingArea ? "Failed to update area" : "Failed to create area"),
  });

  // Delete area mutation
  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center-areas"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setDeleteDialogOpen(false);
      setAreaToDelete(null);
      toast.success("Area deleted");
    },
    onError: () => toast.error("Failed to delete area"),
  });

  // Calculate totals
  const totalProjects = areasWithStats.reduce((sum, a) => sum + a.projectCount, 0);
  const totalTasks = areasWithStats.reduce((sum, a) => sum + a.taskCount, 0);
  const totalCompleted = areasWithStats.reduce((sum, a) => sum + a.completedTaskCount, 0);
  const totalHabits = areasWithStats.reduce((sum, a) => sum + a.habitCount, 0);
  const totalIncome = areasWithStats.reduce((sum, a) => sum + a.totalIncome, 0);
  const totalExpense = areasWithStats.reduce((sum, a) => sum + a.totalExpense, 0);
  const overallCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // If an area is selected, show the ROI Dashboard
  if (selectedAreaId) {
    return (
      <div className="p-6">
        <AreaROIDashboard 
          areaId={selectedAreaId} 
          onBack={() => setSelectedAreaId(null)} 
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl text-primary flex items-center gap-3">
            <Target className="w-8 h-8" />
            COMMAND CENTER
          </h1>
          <p className="text-muted-foreground mt-1">
            Master node for all life domains • {areasWithStats.length} areas configured
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              NEW AREA
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="font-display text-primary">
                {editingArea ? "EDIT AREA" : "CREATE AREA"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Area Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Business, Health, Relationships"
                  className="bg-background border-border mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description (optional)"
                  className="bg-background border-border mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon</Label>
                  <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color Theme</Label>
                  <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => saveAreaMutation.mutate()}
                disabled={!formData.name || saveAreaMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {saveAreaMutation.isPending ? "Saving..." : (editingArea ? "Save Changes" : "Create Area")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Area "{areaToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this area. Projects and habits linked to this area will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => areaToDelete && deleteAreaMutation.mutate(areaToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <StatCard label="Areas" value={areasWithStats.length} icon={Folder} variant="primary" />
        <StatCard label="Projects" value={totalProjects} icon={Target} variant="ops" />
        <StatCard label="Tasks" value={totalTasks} icon={BarChart3} variant="ops" />
        <StatCard label="Completion" value={`${overallCompletion}%`} icon={TrendingUp} variant="vault" />
        <StatCard label="Habits" value={totalHabits} icon={Activity} variant="bio" />
        <StatCard 
          label="Net Flow" 
          value={`${totalIncome - totalExpense >= 0 ? "+" : "-"}$${Math.abs(totalIncome - totalExpense).toLocaleString()}`} 
          icon={DollarSign} 
          variant={totalIncome - totalExpense >= 0 ? "vault" : "bio"} 
        />
      </motion.div>

      {/* Areas Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading areas...</div>
        </div>
      ) : areasWithStats.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-card p-12 text-center"
        >
          <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-display text-xl text-muted-foreground mb-2">No Areas Yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first life domain to start tracking holistic performance.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Create First Area
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areasWithStats.map((area, index) => {
            const colors = colorMap[area.color] || colorMap.ops;
            const Icon = iconMap[area.icon] || Folder;
            const completionRate = area.taskCount > 0 
              ? Math.round((area.completedTaskCount / area.taskCount) * 100) 
              : 0;
            const netFlow = area.totalIncome - area.totalExpense;

            return (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => setSelectedAreaId(area.id)}
                className={cn(
                  "relative p-6 rounded-xl border cursor-pointer transition-all duration-300",
                  colors.bg,
                  colors.border,
                  "hover:shadow-xl",
                  colors.glow
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl", colors.bg, "border", colors.border)}>
                      <Icon className={cn("w-6 h-6", colors.text)} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg uppercase tracking-wider">{area.name}</h3>
                      {area.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                          {area.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) => openEditDialog(area, e)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => openDeleteDialog(area, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="w-3 h-3" />
                      <span>OPERATIONS</span>
                    </div>
                    <p className="font-mono text-sm">
                      {area.projectCount} projects • {completionRate}% done
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Activity className="w-3 h-3" />
                      <span>HABITS</span>
                    </div>
                    <p className="font-mono text-sm">
                      {area.habitCount} active
                    </p>
                  </div>
                </div>

                {/* Financial Flow */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>NET FLOW</span>
                    </div>
                    <span className={cn(
                      "font-mono text-lg font-bold",
                      netFlow >= 0 ? "text-vault" : "text-bio"
                    )}>
                      {netFlow >= 0 ? "+" : "-"}$
                      <AnimatedNumber value={Math.abs(netFlow)} formatAsCurrency={false} />
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.05 }}
                    className={cn("h-full rounded-full", colors.text.replace("text-", "bg-"))}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant: "ops" | "bio" | "vault" | "primary";
}) {
  const variantStyles = {
    ops: "text-ops bg-ops/10 border-ops/30",
    bio: "text-bio bg-bio/10 border-bio/30",
    vault: "text-vault bg-vault/10 border-vault/30",
    primary: "text-primary bg-primary/10 border-primary/30",
  };

  return (
    <div className={cn("p-4 rounded-xl border", variantStyles[variant])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="font-mono text-xl font-bold">{value}</p>
    </div>
  );
}
