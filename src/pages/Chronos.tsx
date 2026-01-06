import { useState, useMemo, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { TimeAnalytics } from "@/components/chronos/TimeAnalytics";
import { UnifiedCalendarEvent, UnifiedEvent } from "@/components/chronos/UnifiedCalendarEvent";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, isSameDay } from "date-fns";

const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export default function Chronos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "bio" | "ops" | "vault">("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedEvent, setDraggedEvent] = useState<UnifiedEvent | null>(null);

  // Fetch calendar events
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["calendar-events", user?.id, format(currentDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const dayStart = startOfDay(currentDate).toISOString();
      const dayEnd = endOfDay(currentDate).toISOString();

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user?.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch tasks with due dates for current day
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-calendar", user?.id, format(currentDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const dateStr = format(currentDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user?.id)
        .eq("due_date", dateStr)
        .neq("status", "done");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recurring transactions for calendar
  const { data: recurringTransactions = [] } = useQuery({
    queryKey: ["recurring-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_recurring", true);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Build unified events
  const unifiedEvents: UnifiedEvent[] = useMemo(() => {
    const events: UnifiedEvent[] = [];

    // Calendar events from database
    calendarEvents.forEach((event) => {
      const startTime = new Date(event.start_time);
      events.push({
        id: event.id,
        title: event.title,
        startTime: format(startTime, "HH:mm"),
        endTime: event.end_time ? format(new Date(event.end_time), "HH:mm") : undefined,
        module: (event.module as "bio" | "ops" | "vault" | "general") || "general",
        origin: event.origin_type as "task" | "transaction" | "habit" | "manual",
        isAllDay: event.is_all_day,
        metadata: { originId: event.origin_id },
      });
    });

    // Tasks as time blocks
    tasks.forEach((task) => {
      events.push({
        id: `task-${task.id}`,
        title: task.title,
        startTime: "09:00",
        endTime: "10:00",
        module: "ops",
        origin: "task",
        metadata: { difficulty: task.difficulty, taskId: task.id },
      });
    });

    return events;
  }, [calendarEvents, tasks]);

  // All-day events (recurring payments)
  const allDayEvents: UnifiedEvent[] = useMemo(() => {
    const events: UnifiedEvent[] = [];

    // From calendar events
    calendarEvents
      .filter((e) => e.is_all_day)
      .forEach((event) => {
        events.push({
          id: event.id,
          title: event.title,
          startTime: "00:00",
          module: (event.module as "bio" | "ops" | "vault" | "general") || "vault",
          origin: event.origin_type as "task" | "transaction" | "habit" | "manual",
          isAllDay: true,
          metadata: { originId: event.origin_id },
        });
      });

    return events;
  }, [calendarEvents]);

  const filteredEvents = useMemo(() => {
    const events = filter === "all" ? unifiedEvents : unifiedEvents.filter((e) => e.module === filter);
    return events.filter((e) => !e.isAllDay);
  }, [unifiedEvents, filter]);

  const filteredAllDayEvents = useMemo(() => {
    return filter === "all" ? allDayEvents : allDayEvents.filter((e) => e.module === filter);
  }, [allDayEvents, filter]);

  // Update event time mutation
  const updateEventTimeMutation = useMutation({
    mutationFn: async ({ eventId, newStartTime, newEndTime }: { eventId: string; newStartTime: string; newEndTime?: string }) => {
      const startDate = new Date(currentDate);
      const [startHour, startMin] = newStartTime.split(":").map(Number);
      startDate.setHours(startHour, startMin, 0, 0);

      let endDate = null;
      if (newEndTime) {
        endDate = new Date(currentDate);
        const [endHour, endMin] = newEndTime.split(":").map(Number);
        endDate.setHours(endHour, endMin, 0, 0);
      }

      const { error } = await supabase
        .from("calendar_events")
        .update({
          start_time: startDate.toISOString(),
          end_time: endDate?.toISOString() || null,
        })
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event time updated");
    },
    onError: () => {
      toast.error("Failed to update event");
    },
  });

  const getEventPosition = (startTime: string) => {
    const [hour, minute] = startTime.split(":").map(Number);
    const startHour = 6;
    const topOffset = (hour - startHour) * 60 + minute;
    return topOffset;
  };

  const getEventHeight = (startTime: string, endTime?: string) => {
    if (!endTime) return 30;
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return Math.max(duration, 30);
  };

  const handleDragStart = (event: UnifiedEvent) => {
    setDraggedEvent(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const calendarRect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - calendarRect.top;
    const newMinutes = Math.round(relativeY);
    const newHour = Math.floor(newMinutes / 60) + 6;
    const newMin = Math.round((newMinutes % 60) / 15) * 15;

    const newStartTime = `${newHour.toString().padStart(2, "0")}:${newMin.toString().padStart(2, "0")}`;

    // Calculate end time based on original duration
    let newEndTime: string | undefined;
    if (draggedEvent.endTime) {
      const [origStartH, origStartM] = draggedEvent.startTime.split(":").map(Number);
      const [origEndH, origEndM] = draggedEvent.endTime.split(":").map(Number);
      const durationMins = (origEndH * 60 + origEndM) - (origStartH * 60 + origStartM);
      const endMins = newHour * 60 + newMin + durationMins;
      const endHour = Math.floor(endMins / 60);
      const endMin = endMins % 60;
      newEndTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;
    }

    // Only update actual calendar events, not derived task events
    if (!draggedEvent.id.startsWith("task-")) {
      updateEventTimeMutation.mutate({
        eventId: draggedEvent.id,
        newStartTime,
        newEndTime,
      });
    }

    setDraggedEvent(null);
  };

  const dateStr = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  return (
    <div className="flex gap-6">
      {/* Main Calendar */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-primary text-glow-ops flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              CHRONOS
            </h1>
            <p className="text-muted-foreground mt-1">Time Commander & Unified Calendar</p>
          </div>

          <Button variant="outline" className="border-primary/30 text-primary">
            Connect Google Calendar
          </Button>
        </motion.div>

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigateDay(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-mono text-sm text-foreground min-w-[200px] text-center">{dateStr}</span>
            <Button variant="ghost" size="icon" onClick={() => navigateDay(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="ml-2 text-muted-foreground">
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {(["all", "bio", "ops", "vault"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "ghost"}
                  onClick={() => setFilter(f)}
                  className={
                    filter === f
                      ? f === "bio"
                        ? "bg-bio text-bio-foreground"
                        : f === "ops"
                        ? "bg-ops text-ops-foreground"
                        : f === "vault"
                        ? "bg-vault text-vault-foreground"
                        : "bg-primary text-primary-foreground"
                      : ""
                  }
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* All-day events (recurring payments) */}
        {filteredAllDayEvents.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-card p-3">
            <div className="flex flex-wrap gap-2">
              {filteredAllDayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${
                    event.module === "vault"
                      ? "bg-vault/20 text-vault border border-vault/30"
                      : event.module === "bio"
                      ? "bg-bio/20 text-bio border border-bio/30"
                      : "bg-ops/20 text-ops border border-ops/30"
                  }`}
                >
                  <span>{event.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Calendar Grid with Drag & Drop */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-card p-4 overflow-hidden">
          <div className="relative" style={{ height: `${hours.length * 60}px` }} onDragOver={handleDragOver} onDrop={handleDrop}>
            {/* Hour lines */}
            {hours.map((hour, index) => (
              <div key={hour} className="absolute w-full border-t border-border/30 flex items-start" style={{ top: `${index * 60}px` }}>
                <span className="font-mono text-xs text-muted-foreground w-12 -mt-2 pr-3 text-right">{hour.toString().padStart(2, "0")}:00</span>
              </div>
            ))}

            {/* Events */}
            <div className="absolute left-14 right-0 top-0 bottom-0">
              {filteredEvents.map((event) => {
                const top = getEventPosition(event.startTime);
                const height = getEventHeight(event.startTime, event.endTime);

                return (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={() => handleDragStart(event)}
                    className="cursor-move"
                  >
                    <UnifiedCalendarEvent event={event} top={top} height={height} />
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Sync Status */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-vault animate-pulse" />
          <span>Drag events to reschedule. Recurring payments sync from Vault.</span>
        </div>
      </div>

      {/* Time Analytics Sidebar */}
      <div className="w-72 flex-shrink-0">
        <TimeAnalytics />
      </div>
    </div>
  );
}
