import { motion } from "framer-motion";
import { Heart, Droplets, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HabitEvent {
    id: string;
    title: string;
    category: "health" | "mana" | "stamina";
    scheduledTime: string; // HH:mm format
    xpReward: number;
    completed?: boolean;
}

interface HabitCalendarEventProps {
    habit: HabitEvent;
    top: number; // Position in pixels from top
}

const categoryIcons = {
    health: Heart,
    mana: Droplets,
    stamina: Zap,
};

const categoryColors = {
    health: "bg-bio/20 border-bio/50 text-bio",
    mana: "bg-ops/20 border-ops/50 text-ops",
    stamina: "bg-vault/20 border-vault/50 text-vault",
};

export function HabitCalendarEvent({ habit, top }: HabitCalendarEventProps) {
    const Icon = categoryIcons[habit.category];

    return (
        <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "absolute left-0 right-0 h-5 rounded border flex items-center px-2 gap-1.5 overflow-hidden",
                categoryColors[habit.category],
                habit.completed && "opacity-50 line-through"
            )}
            style={{ top: `${top}px` }}
        >
            <Icon className="w-3 h-3 flex-shrink-0" />
            <span className="text-xs font-medium truncate flex-1">{habit.title}</span>
            <span className="text-[10px] font-mono flex-shrink-0">+{habit.xpReward}</span>
        </motion.div>
    );
}
