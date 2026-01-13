import { Filter, Clock, Zap, FolderKanban, LayoutGrid, PieChart, CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Area {
  id: string;
  name: string;
  color: string | null;
}

interface Project {
  id: string;
  title: string;
}

export type ViewMode = "kanban" | "analytics" | "timeline";
export type EnergyFilter = "all" | "low" | "medium" | "high";
export type TimeFilter = "all" | "today" | "week" | "overdue";

interface TacticalFiltersProps {
  projectFilter: string;
  setProjectFilter: (value: string) => void;
  areaFilter: string;
  setAreaFilter: (value: string) => void;
  energyFilter: EnergyFilter;
  setEnergyFilter: (value: EnergyFilter) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (value: TimeFilter) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
}

export function TacticalFilters({
  projectFilter,
  setProjectFilter,
  areaFilter,
  setAreaFilter,
  energyFilter,
  setEnergyFilter,
  timeFilter,
  setTimeFilter,
  viewMode,
  setViewMode,
}: TacticalFiltersProps) {
  const { user } = useAuth();

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name, color")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data as Area[];
    },
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Area Filter */}
      <div className="flex items-center gap-2">
        <FolderKanban className="w-4 h-4 text-muted-foreground" />
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-32 bg-background border-border h-9">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-36 bg-background border-border h-9">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Energy Filter */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-muted-foreground" />
        <Select value={energyFilter} onValueChange={(v) => setEnergyFilter(v as EnergyFilter)}>
          <SelectTrigger className="w-28 bg-background border-border h-9">
            <SelectValue placeholder="Energy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Energy</SelectItem>
            <SelectItem value="low">Low (Easy)</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High (Hard+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Filter */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <SelectTrigger className="w-28 bg-background border-border h-9">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Due Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      {/* View Toggle */}
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(v) => v && setViewMode(v as ViewMode)}
        className="border border-border rounded-lg p-1 bg-background/50"
      >
        <ToggleGroupItem 
          value="kanban" 
          aria-label="Kanban View"
          className="data-[state=on]:bg-ops/20 data-[state=on]:text-ops h-8 px-3"
        >
          <LayoutGrid className="w-4 h-4 mr-1" />
          <span className="text-xs font-mono hidden sm:inline">KANBAN</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="timeline" 
          aria-label="Timeline View"
          className="data-[state=on]:bg-ops/20 data-[state=on]:text-ops h-8 px-3"
        >
          <CalendarDays className="w-4 h-4 mr-1" />
          <span className="text-xs font-mono hidden sm:inline">TIMELINE</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="analytics" 
          aria-label="Analytics View"
          className="data-[state=on]:bg-ops/20 data-[state=on]:text-ops h-8 px-3"
        >
          <PieChart className="w-4 h-4 mr-1" />
          <span className="text-xs font-mono hidden sm:inline">ANALYTICS</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
