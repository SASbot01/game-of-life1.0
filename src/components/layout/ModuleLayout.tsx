import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ModuleTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

interface ModuleLayoutProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  variant: "bio" | "ops" | "vault";
  tabs: ModuleTab[];
  defaultTab?: string;
  headerActions?: ReactNode;
}

const variantStyles = {
  bio: {
    text: "text-bio",
    glow: "text-glow-bio",
    border: "border-bio/30",
    activeBg: "data-[state=active]:bg-bio/10 data-[state=active]:text-bio",
    tabClass: "module-tab-bio",
  },
  ops: {
    text: "text-ops",
    glow: "text-glow-ops",
    border: "border-ops/30",
    activeBg: "data-[state=active]:bg-ops/10 data-[state=active]:text-ops",
    tabClass: "module-tab-ops",
  },
  vault: {
    text: "text-vault",
    glow: "text-glow-vault",
    border: "border-vault/30",
    activeBg: "data-[state=active]:bg-vault/10 data-[state=active]:text-vault",
    tabClass: "module-tab-vault",
  },
};

export function ModuleLayout({
  title,
  subtitle,
  icon: Icon,
  variant,
  tabs,
  defaultTab,
  headerActions,
}: ModuleLayoutProps) {
  const styles = variantStyles[variant];

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "p-3 rounded-lg border bg-card/50",
              styles.border
            )}
          >
            <Icon className={cn("w-6 h-6", styles.text, styles.glow)} />
          </div>
          <div>
            <h1 className={cn("font-display text-2xl", styles.text, styles.glow)}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </motion.div>

      {/* Tabs Navigation */}
      <Tabs defaultValue={defaultTab || tabs[0]?.id} className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TabsList className="w-full justify-start bg-transparent border-b border-border/50 rounded-none p-0 h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "module-tab rounded-none border-b-2 border-transparent",
                  styles.tabClass,
                  "data-[state=active]:border-current data-[state=active]:shadow-none"
                )}
              >
                {tab.icon && <tab.icon className="w-4 h-4 mr-2" />}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </motion.div>

        {/* Tab Content */}
        {tabs.map((tab, index) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              {tab.content}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
