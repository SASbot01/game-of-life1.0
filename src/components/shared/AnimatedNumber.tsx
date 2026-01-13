import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatAsCurrency?: boolean;
}

export function AnimatedNumber({
  value,
  duration = 1.5,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatAsCurrency = true,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (latest) => {
    if (formatAsCurrency) {
      return latest.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return latest.toFixed(decimals);
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(parseFloat(latest.replace(/,/g, '')) || 0);
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span className={cn('stat-number tabular-nums', className)}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
}
