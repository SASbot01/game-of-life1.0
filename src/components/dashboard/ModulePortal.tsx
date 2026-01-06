import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ModulePortalProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  kpiLabel: string;
  kpiValue: string | number;
  variant: "bio" | "ops" | "vault";
}

const variantStyles = {
  bio: {
    card: "module-card-bio",
    text: "text-bio",
    glow: "text-glow-bio",
    bg: "bg-bio/5",
    border: "border-bio/30",
  },
  ops: {
    card: "module-card-ops",
    text: "text-ops",
    glow: "text-glow-ops",
    bg: "bg-ops/5",
    border: "border-ops/30",
  },
  vault: {
    card: "module-card-vault",
    text: "text-vault",
    glow: "text-glow-vault",
    bg: "bg-vault/5",
    border: "border-vault/30",
  },
};

export function ModulePortal({
  to,
  icon: Icon,
  title,
  description,
  kpiLabel,
  kpiValue,
  variant,
}: ModulePortalProps) {
  const styles = variantStyles[variant];

  return (
    <Link to={to}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className={cn("p-6 cursor-pointer h-full", styles.card)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-lg", styles.bg, "border", styles.border)}>
            <Icon className={cn("w-6 h-6", styles.text)} />
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{kpiLabel}</span>
            <p className={cn("font-mono text-2xl font-bold", styles.text, styles.glow)}>
              {kpiValue}
            </p>
          </div>
        </div>

        {/* Content */}
        <h3 className={cn("font-title text-xl font-semibold mb-1", styles.text)}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>

        {/* Action hint */}
        <div className="mt-4 flex items-center gap-2">
          <span className={cn("text-xs font-medium", styles.text)}>ENTER MODULE</span>
          <span className={cn("text-lg", styles.text)}>→</span>
        </div>
      </motion.div>
    </Link>
  );
}
