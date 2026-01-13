import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Event {
  id: string;
  title: string;
  time: string;
  module: "bio" | "ops" | "vault";
}

// Mock events for display
const todayEvents: Event[] = [
  { id: "1", title: "Morning Workout", time: "07:00", module: "bio" },
  { id: "2", title: "Sprint Planning", time: "09:00", module: "ops" },
  { id: "3", title: "Review Monthly Budget", time: "14:00", module: "vault" },
  { id: "4", title: "Evening Meditation", time: "20:00", module: "bio" },
];

const moduleColors = {
  bio: "bg-bio/20 text-bio border-bio/30",
  ops: "bg-ops/20 text-ops border-ops/30",
  vault: "bg-vault/20 text-vault border-vault/30",
};

export function ChronosWidget() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { 
    weekday: "long", 
    month: "short", 
    day: "numeric" 
  });

  return (
    <div className="space-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-title text-lg text-foreground">CHRONOS</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{dateStr}</span>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {todayEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 py-2"
          >
            <span className="font-mono text-xs text-muted-foreground w-12">
              {event.time}
            </span>
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <div className={`flex-1 px-3 py-2 rounded border ${moduleColors[event.module]}`}>
              <span className="text-sm font-medium">{event.title}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sync Status */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">Not synced</span>
        </div>
        <button className="text-xs text-primary hover:text-primary-glow transition-colors">
          Connect Calendar
        </button>
      </div>
    </div>
  );
}
