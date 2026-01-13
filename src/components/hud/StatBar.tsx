import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

interface StatBarProps {
  current: number;
  max: number;
  label: string;
  icon?: React.ReactNode;
  variant: 'health' | 'xp' | 'mana' | 'stamina';
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  health: {
    bar: 'bg-health',
    glow: 'shadow-neon-green',
    text: 'text-health text-glow-green',
    shimmer: 'from-health/0 via-health/50 to-health/0',
  },
  xp: {
    bar: 'bg-primary',
    glow: 'shadow-neon-cyan',
    text: 'text-primary text-glow-cyan',
    shimmer: 'from-primary/0 via-primary/50 to-primary/0',
  },
  mana: {
    bar: 'bg-mana',
    glow: 'shadow-[0_0_20px_hsl(260_100%_65%/0.3)]',
    text: 'text-mana',
    shimmer: 'from-mana/0 via-mana/50 to-mana/0',
  },
  stamina: {
    bar: 'bg-stamina',
    glow: 'shadow-[0_0_20px_hsl(30_100%_50%/0.3)]',
    text: 'text-stamina',
    shimmer: 'from-stamina/0 via-stamina/50 to-stamina/0',
  },
};

const sizeStyles = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

export function StatBar({
  current,
  max,
  label,
  icon,
  variant,
  showNumbers = true,
  size = 'md',
  className,
}: StatBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const styles = variantStyles[variant];
  const prevCurrent = useRef(current);
  const [isGaining, setIsGaining] = useState(false);
  const [gainAmount, setGainAmount] = useState(0);

  // Smooth spring animation for the bar width
  const springWidth = useSpring(percentage, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  });

  // Animated number display
  const animatedNumber = useSpring(current, {
    stiffness: 150,
    damping: 25,
  });

  const displayNumber = useTransform(animatedNumber, (val) => Math.round(val));

  useEffect(() => {
    springWidth.set(percentage);
  }, [percentage, springWidth]);

  useEffect(() => {
    animatedNumber.set(current);
  }, [current, animatedNumber]);

  // Detect gains and trigger shimmer animation
  useEffect(() => {
    if (current > prevCurrent.current) {
      const gain = current - prevCurrent.current;
      setGainAmount(gain);
      setIsGaining(true);
      
      // Reset shimmer after animation
      const timer = setTimeout(() => {
        setIsGaining(false);
        setGainAmount(0);
      }, 1500);

      prevCurrent.current = current;
      return () => clearTimeout(timer);
    }
    prevCurrent.current = current;
  }, [current]);

  return (
    <div className={cn('flex flex-col gap-1 relative', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon && <span className={cn(styles.text, isGaining && 'animate-pulse')}>{icon}</span>}
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Floating gain indicator */}
          <AnimatePresence>
            {isGaining && gainAmount > 0 && (
              <motion.span
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                className={cn('text-xs font-bold', styles.text)}
              >
                +{gainAmount}
              </motion.span>
            )}
          </AnimatePresence>
          {showNumbers && (
            <motion.span className={cn('stat-number text-xs tabular-nums', styles.text)}>
              <motion.span>{displayNumber}</motion.span>/{max.toLocaleString()}
            </motion.span>
          )}
        </div>
      </div>
      
      <div className={cn('progress-bar relative overflow-hidden', sizeStyles[size])}>
        <motion.div
          style={{ width: useTransform(springWidth, (w) => `${w}%`) }}
          className={cn(
            'progress-bar-fill progress-bar-glow h-full',
            styles.bar,
            styles.glow
          )}
        />
        
        {/* Shimmer effect on gain */}
        <AnimatePresence>
          {isGaining && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'absolute inset-0 w-1/2 bg-gradient-to-r',
                styles.shimmer
              )}
            />
          )}
        </AnimatePresence>
        
        {/* Pulse glow effect on gain */}
        {isGaining && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={cn(
              'absolute inset-0 rounded-full',
              variant === 'health' && 'bg-health/30',
              variant === 'xp' && 'bg-primary/30',
              variant === 'mana' && 'bg-mana/30',
              variant === 'stamina' && 'bg-stamina/30'
            )}
          />
        )}
      </div>
    </div>
  );
}
