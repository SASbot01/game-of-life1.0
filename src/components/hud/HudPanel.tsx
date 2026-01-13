import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface HudPanelProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function HudPanel({ 
  title, 
  icon: Icon, 
  iconColor = 'text-primary',
  children, 
  className,
  delay = 0
}: HudPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn('hud-panel scan-line', className)}
    >
      <div className="hud-panel-header">
        {Icon && <Icon className={cn('h-4 w-4', iconColor)} />}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </motion.div>
  );
}
