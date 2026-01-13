import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays } from "date-fns";

export type DateRange = "week" | "month" | "quarter" | "year" | "all";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  variant?: "bio" | "ops" | "vault" | "default";
}

export function getDateRangeFilter(range: DateRange): { start: Date; end: Date } | null {
  const now = new Date();
  
  switch (range) {
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarter":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "all":
    default:
      return null;
  }
}

export function DateRangeFilter({ value, onChange, variant = "default" }: DateRangeFilterProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "bio":
        return "border-bio/30 data-[state=open]:border-bio/50";
      case "ops":
        return "border-ops/30 data-[state=open]:border-ops/50";
      case "vault":
        return "border-vault/30 data-[state=open]:border-vault/50";
      default:
        return "border-border";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
        <SelectTrigger className={`w-36 h-8 bg-background text-sm ${getVariantStyles()}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
