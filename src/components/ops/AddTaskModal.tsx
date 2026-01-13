import { useState, useEffect } from "react";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type TaskDifficulty = "easy" | "medium" | "hard" | "boss";

interface Area {
  id: string;
  name: string;
}

interface Project {
  id: string;
  title: string;
  area_id: string | null;
}

const xpMap: Record<TaskDifficulty, number> = { easy: 10, medium: 25, hard: 50, boss: 100 };
const timeXpMap: Record<string, number> = {
  "15m": 5,
  "30m": 10,
  "1h": 25,
  "2h": 50,
  "4h": 75,
  "8h": 100,
};

interface AddTaskModalProps {
  defaultAreaId?: string;
  defaultProjectId?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  showTrigger?: boolean;
}

export function AddTaskModal({
  defaultAreaId,
  defaultProjectId,
  isOpen: controlledOpen,
  onOpenChange,
  onClose,
  showTrigger = true,
}: AddTaskModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or uncontrolled state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalOpen(open);
    }
    if (!open && onClose) {
      onClose();
    }
  };

  const [formData, setFormData] = useState({
    area_id: defaultAreaId || "",
    project_id: defaultProjectId || "",
    title: "",
    description: "",
    time_estimate: "",
    assignee: "",
    due_date: "",
    difficulty: "medium" as TaskDifficulty,
  });

  // Reset defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        area_id: defaultAreaId || "",
        project_id: defaultProjectId || "",
      }));
    }
  }, [isOpen, defaultAreaId, defaultProjectId]);

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ["areas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data as Area[];
    },
    enabled: !!user?.id,
  });

  // Fetch projects
  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects-with-areas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, area_id")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user?.id,
  });

  // Filter projects based on selected area
  const filteredProjects = formData.area_id
    ? allProjects.filter(p => p.area_id === formData.area_id)
    : allProjects;

  // Clear project if area changes and project doesn't belong to new area
  useEffect(() => {
    if (formData.area_id && formData.project_id) {
      const project = allProjects.find(p => p.id === formData.project_id);
      if (project && project.area_id !== formData.area_id) {
        setFormData(prev => ({ ...prev, project_id: "" }));
      }
    }
  }, [formData.area_id, formData.project_id, allProjects]);

  // Calculate XP based on time estimate
  const calculatedXp = formData.time_estimate
    ? timeXpMap[formData.time_estimate] || xpMap[formData.difficulty]
    : xpMap[formData.difficulty];

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      // Create the task
      const { data: taskData, error: taskError } = await supabase.from("tasks").insert({
        user_id: user?.id,
        title: formData.title,
        description: formData.description || null,
        difficulty: formData.difficulty,
        due_date: formData.due_date || null,
        project_id: formData.project_id || null,
        time_estimate: formData.time_estimate || null,
        assignee: formData.assignee || null,
        xp_reward: calculatedXp,
        status: "todo",
      }).select().single();

      if (taskError) throw taskError;

      // If task has a due date, create a calendar event
      if (formData.due_date && taskData) {
        const dueDate = new Date(formData.due_date);

        // Set default time to 9 AM if no time specified
        dueDate.setHours(9, 0, 0, 0);

        // Calculate end time based on time estimate or default 1 hour
        const endDate = new Date(dueDate);
        if (formData.time_estimate) {
          const hours = parseFloat(formData.time_estimate.replace('h', '').replace('m', '')) || 1;
          endDate.setHours(endDate.getHours() + (formData.time_estimate.includes('m') ? hours / 60 : hours));
        } else {
          endDate.setHours(endDate.getHours() + 1);
        }

        const { error: eventError } = await supabase.from("calendar_events").insert({
          user_id: user?.id,
          title: `📋 ${formData.title}`,
          description: formData.description || null,
          start_time: dueDate.toISOString(),
          end_time: endDate.toISOString(),
          module: "ops",
          origin_type: "task",
          origin_id: taskData.id,
        });

        if (eventError) {
          console.error("Failed to create calendar event:", eventError);
          // Don't throw - task was created successfully
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["areas-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["projects-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["area-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setIsOpen(false);
      setFormData({
        area_id: defaultAreaId || "",
        project_id: defaultProjectId || "",
        title: "",
        description: "",
        time_estimate: "",
        assignee: "",
        due_date: "",
        difficulty: "medium",
      });
      toast.success(formData.due_date ? "Mission created and added to calendar" : "Mission created");
    },
    onError: () => toast.error("Failed to create mission"),
  });

  const dialogContent = (
    <DialogContent className="bg-card border-ops/30 max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-ops">CREATE MISSION</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-4">
        {/* Area Selection */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Area</label>
          <Select
            value={formData.area_id}
            onValueChange={(v) => setFormData({ ...formData, area_id: v === "none" ? "" : v, project_id: "" })}
          >
            <SelectTrigger className="bg-background border-border">
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

        {/* Project Selection (Cascading) */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Project</label>
          <Select
            value={formData.project_id}
            onValueChange={(v) => setFormData({ ...formData, project_id: v === "none" ? "" : v })}
            disabled={formData.area_id === "" && filteredProjects.length === 0}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder={formData.area_id ? "Select project" : "Select area first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {filteredProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mission Title *</label>
          <Input
            placeholder="Enter mission title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="bg-background border-border"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
          <Textarea
            placeholder="Mission details (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="bg-background border-border"
            rows={3}
          />
        </div>

        {/* Time & Assignee */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Time Estimate</label>
            <Select value={formData.time_estimate} onValueChange={(v) => setFormData({ ...formData, time_estimate: v })}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Estimate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="2h">2 hours</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
                <SelectItem value="8h">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Assignee</label>
            <Input
              placeholder="Who's doing this?"
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              className="bg-background border-border"
            />
          </div>
        </div>

        {/* Due Date & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
            <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v as TaskDifficulty })}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="boss">Boss</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* XP Preview */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-ops/10 border border-ops/20">
          <span className="text-sm text-muted-foreground">XP Reward</span>
          <span className="flex items-center gap-1 text-ops font-mono font-bold">
            <Zap className="w-4 h-4" />
            {calculatedXp} XP
          </span>
        </div>

        {/* Submit */}
        <Button
          onClick={() => createTaskMutation.mutate()}
          disabled={!formData.title || createTaskMutation.isPending}
          className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
        >
          {createTaskMutation.isPending ? "CREATING..." : "CREATE MISSION"}
        </Button>
      </div>
    </DialogContent>
  );

  // If showTrigger is false, render without trigger
  if (!showTrigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-ops/20 text-ops border border-ops/30 hover:bg-ops/30">
          <Plus className="w-4 h-4 mr-2" />
          NEW MISSION
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
