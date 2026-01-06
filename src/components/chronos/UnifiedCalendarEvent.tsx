import { motion } from "framer-motion";
import { DollarSign, CheckSquare, Heart, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type EventOrigin = "task" | "transaction" | "habit" | "manual";

export interface UnifiedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  module: "bio" | "ops" | "vault" | "general";
  origin: EventOrigin;
  originId?: string;
  isAllDay?: boolean;
  metadata?: {
    amount?: number;
    isRecurring?: boolean;
    difficulty?: string;
    originId?: string;
    taskId?: string;
  };
}

interface UnifiedCalendarEventProps {
  event: UnifiedEvent;
  top: number;
  height: number;
}

const moduleColors = {
  bio: {
    bg: "bg-bio/20",
    border: "border-l-bio",
    text: "text-bio",
    glow: "hover:shadow-[0_0_10px_hsl(var(--bio)/0.3)]",
  },
  ops: {
    bg: "bg-ops/20",
    border: "border-l-ops",
    text: "text-ops",
    glow: "hover:shadow-[0_0_10px_hsl(var(--ops)/0.3)]",
  },
  vault: {
    bg: "bg-vault/20",
    border: "border-l-vault",
    text: "text-vault",
    glow: "hover:shadow-[0_0_10px_hsl(var(--vault)/0.3)]",
  },
  general: {
    bg: "bg-muted/30",
    border: "border-l-muted-foreground",
    text: "text-foreground",
    glow: "",
  },
};

const originIcons = {
  task: CheckSquare,
  transaction: DollarSign,
  habit: Heart,
  manual: Calendar,
};

export function UnifiedCalendarEvent({ event, top, height }: UnifiedCalendarEventProps) {
  const navigate = useNavigate();
  const colors = moduleColors[event.module];
  const Icon = originIcons[event.origin];

  const handleClick = () => {
    // Navigate to source module based on origin
    if (event.origin === "transaction") {
      navigate("/vault");
    } else if (event.origin === "task") {
      navigate("/ops");
    } else if (event.origin === "habit") {
      navigate("/bio");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`absolute left-0 right-2 rounded px-3 py-1 border-l-2 cursor-pointer transition-all ${colors.bg} ${colors.border} ${colors.glow}`}
      style={{
        top: `${top}px`,
        height: `${Math.max(height - 4, 24)}px`,
      }}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between h-full">
        <div className="flex items-start gap-2 overflow-hidden">
          <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${colors.text}`} />
          <div className="min-w-0">
            <span className={`text-sm font-medium truncate block ${colors.text}`}>
              {event.title}
            </span>
            {height > 30 && (
              <span className="text-xs text-muted-foreground block">
                {event.startTime}
                {event.endTime && ` - ${event.endTime}`}
              </span>
            )}
          </div>
        </div>

        {/* Show amount for financial events */}
        {event.origin === "transaction" && event.metadata?.amount && (
          <span className={`text-xs font-mono ${colors.text} flex-shrink-0`}>
            ${event.metadata.amount}
          </span>
        )}
      </div>
    </motion.div>
  );
}
