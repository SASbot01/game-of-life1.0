import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface OpsBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function OpsBreadcrumb({ items }: OpsBreadcrumbProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 text-sm mb-6"
    >
      <button
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">OPS</span>
      </button>

      {items.slice(1).map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-ops font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </motion.nav>
  );
}
