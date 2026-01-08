import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DateRangeFilter, DateRange, getDateRangeFilter } from "@/components/shared/DateRangeFilter";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface VaultAssetsTabProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export function VaultAssetsTab({ netWorth, totalAssets, totalLiabilities }: VaultAssetsTabProps) {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("quarter");

  // Fetch transactions for monthly summary
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.id, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false });

      const range = getDateRangeFilter(dateRange);
      if (range) {
        query = query
          .gte("date", format(range.start, "yyyy-MM-dd"))
          .lte("date", format(range.end, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch assets for allocation
  const { data: assets = [] } = useQuery({
    queryKey: ["finance-assets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_assets")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate monthly summary from transactions
  const monthlySummary = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expenses, savings, savingsRate };
  }, [transactions]);

  // Net worth history (simulated based on current data) - extended to 12 months
  const netWorthHistory = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    });

    const hasRealData = transactions.length > 0;
    let runningTotal = netWorth > 0 ? netWorth - monthlySummary.savings * 12 : 15000;

    return months.map((month, index) => {
      if (hasRealData) {
        runningTotal += monthlySummary.savings || 0;
      } else {
        // Sample growth pattern
        const baseGrowth = 800 + Math.sin(index * 0.5) * 300;
        runningTotal += baseGrowth + Math.random() * 200;
      }
      return {
        month: format(month, "MMM"),
        value: Math.max(0, runningTotal),
      };
    });
  }, [netWorth, monthlySummary.savings, transactions.length]);

  // Monthly burn rate (last 12 months expenses) - real data only
  const burnRateData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthExpenses = transactions
        .filter((t) => {
          const transDate = new Date(t.date);
          return t.type === "expense" && transDate >= monthStart && transDate <= monthEnd;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        month: format(month, "MMM"),
        expenses: monthExpenses,
      };
    });
  }, [transactions]);

  // Asset allocation from real data - with sample data fallback
  const assetAllocation = useMemo(() => {
    const colors = [
      "hsl(43 100% 50%)",
      "hsl(187 100% 50%)",
      "hsl(260 100% 65%)",
      "hsl(150 100% 45%)",
      "hsl(340 100% 50%)",
    ];

    if (assets.length === 0) {
      // Sample allocation data
      return [
        { name: "Stocks", value: 18500, color: colors[0] },
        { name: "Crypto", value: 8200, color: colors[1] },
        { name: "Cash", value: 12000, color: colors[2] },
        { name: "Real Estate", value: 25000, color: colors[3] },
        { name: "Bonds", value: 6300, color: colors[4] },
      ];
    }

    const assetsByType: Record<string, number> = {};

    assets
      .filter((a) => !a.class.includes("liability"))
      .forEach((asset) => {
        const type = asset.type || "Other";
        assetsByType[type] = (assetsByType[type] || 0) + Number(asset.value);
      });

    return Object.entries(assetsByType).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [assets]);

  const totalAllocation = assetAllocation.reduce((sum, a) => sum + a.value, 0);

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <DateRangeFilter value={dateRange} onChange={setDateRange} variant="vault" />
      </div>

      {/* NET WORTH & Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 space-card p-8 text-center border-vault/30"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Net Worth
          </span>
          <p
            className={`font-display text-5xl mt-2 ${netWorth >= 0 ? "text-vault text-glow-vault" : "text-bio text-glow-bio"
              }`}
          >
            {netWorth >= 0 ? "+" : "-"}
            <AnimatedNumber value={Math.abs(netWorth)} prefix="$" className="font-display" />
          </p>
          <div className="flex justify-center gap-8 mt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Assets</span>
              <p className="font-mono text-vault">
                <AnimatedNumber value={totalAssets} prefix="$" />
              </p>
            </div>
            <div className="text-2xl text-muted-foreground">−</div>
            <div>
              <span className="text-muted-foreground">Total Liabilities</span>
              <p className="font-mono text-bio">
                <AnimatedNumber value={totalLiabilities} prefix="$" />
              </p>
            </div>
          </div>
        </motion.div>

        {/* Financial Health Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="space-card p-6 text-center flex flex-col justify-center"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Financial Health
          </span>
          {(() => {
            const healthScore = totalLiabilities === 0
              ? 100
              : Math.min(100, Math.max(0, Math.round((totalAssets / (totalAssets + totalLiabilities)) * 100)));
            const healthColor = healthScore >= 70 ? "text-vault" : healthScore >= 40 ? "text-ops" : "text-bio";
            return (
              <>
                <p className={`font-display text-6xl mt-2 ${healthColor}`}>
                  <AnimatedNumber value={healthScore} formatAsCurrency={false} />
                </p>
                <p className="text-sm text-muted-foreground mt-1">out of 100</p>
                <p className="text-xs mt-3 px-2 py-1 rounded bg-secondary/50">
                  {healthScore >= 70 ? "Strong Position" : healthScore >= 40 ? "Building" : "Needs Attention"}
                </p>
              </>
            );
          })()}
        </motion.div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Period Income",
            value: monthlySummary.income,
            color: "text-vault",
            icon: ArrowUpRight,
            prefix: "+$",
          },
          {
            label: "Period Expenses",
            value: monthlySummary.expenses,
            color: "text-bio",
            icon: ArrowDownRight,
            prefix: "-$",
          },
          {
            label: "Net Savings",
            value: monthlySummary.savings,
            color: monthlySummary.savings >= 0 ? "text-ops" : "text-bio",
            icon: DollarSign,
            prefix: monthlySummary.savings >= 0 ? "+$" : "-$",
          },
          {
            label: "Savings Rate",
            value: monthlySummary.savingsRate,
            color: "text-primary",
            icon: TrendingUp,
            suffix: "%",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className={`font-mono text-2xl ${stat.color}`}>
              <AnimatedNumber
                value={Math.abs(stat.value)}
                prefix={stat.prefix}
                suffix={stat.suffix}
                decimals={stat.suffix === "%" ? 1 : 0}
              />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth Trend */}
        <div className="space-card p-6">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-vault" />
            WEALTH GROWTH
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthHistory}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(43 100% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(43 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(0 0% 40%)"
                  tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                />
                <YAxis
                  stroke="hsl(0 0% 40%)"
                  tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 5%)",
                    border: "1px solid hsl(43 100% 50% / 0.3)",
                    borderRadius: "8px",
                    color: "hsl(0 0% 90%)",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Net Worth"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(43 100% 50%)"
                  strokeWidth={2}
                  fill="url(#netWorthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Allocation Pie */}
        <div className="space-card p-6">
          <h3 className="font-display text-lg flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-vault" />
            ASSET ALLOCATION
          </h3>

          {assetAllocation.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No assets yet
            </div>
          ) : (
            <>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 5%)",
                        border: "1px solid hsl(0 0% 20%)",
                        borderRadius: "8px",
                        color: "hsl(0 0% 90%)",
                      }}
                      formatter={(value: number) => [
                        `$${value.toLocaleString()} (${((value / totalAllocation) * 100).toFixed(1)}%)`,
                        "Value",
                      ]}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {assetAllocation.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="text-xs font-mono ml-auto">
                      ${(item.value / 1000).toFixed(0)}k
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Burn Rate */}
      <div className="space-card p-6">
        <h3 className="font-display text-lg flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-bio" />
          MONTHLY BURN RATE
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Last 6 months of expenses
        </p>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={burnRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis
                dataKey="month"
                stroke="hsl(0 0% 40%)"
                tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
              />
              <YAxis
                stroke="hsl(0 0% 40%)"
                tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 5%)",
                  border: "1px solid hsl(340 100% 50% / 0.3)",
                  borderRadius: "8px",
                  color: "hsl(0 0% 90%)",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Expenses"]}
              />
              <Bar
                dataKey="expenses"
                fill="hsl(340 100% 50%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average burn rate */}
        <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Avg Monthly Burn</span>
            <span className="font-mono text-lg text-bio">
              <AnimatedNumber
                value={burnRateData.reduce((sum, m) => sum + m.expenses, 0) / Math.max(1, burnRateData.length)}
                prefix="$"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
