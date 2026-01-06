import { motion } from 'framer-motion';
import { Target, Sparkles, TrendingUp, Plus, CheckCircle2 } from 'lucide-react';
import { StatusHeader } from '@/components/hud/StatusHeader';
import { HudPanel } from '@/components/hud/HudPanel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen grid-pattern">
      <StatusHeader />
      
      <main className="pt-28 pb-8 px-4 md:pt-24">
        <div className="container mx-auto max-w-6xl">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-display text-foreground mb-2">
              Welcome back, <span className="text-primary text-glow-cyan">{profile?.username || 'Player'}</span>
            </h1>
            <p className="text-muted-foreground">Ready to conquer today's quests?</p>
          </motion.div>

          {/* HUD Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Active Quests */}
            <HudPanel title="Active Quests" icon={Target} iconColor="text-primary" delay={0.1}>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Complete daily workout</p>
                    <p className="text-xs text-muted-foreground">+25 XP • Medium</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Review project docs</p>
                    <p className="text-xs text-muted-foreground">+50 XP • Boss</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2">
                <Plus className="w-4 h-4 mr-1" /> Add Quest
              </Button>
            </HudPanel>

            {/* Daily Buffs */}
            <HudPanel title="Daily Buffs" icon={Sparkles} iconColor="text-health" delay={0.2}>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-health/10 border border-health/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💪</span>
                    <span className="text-sm font-medium">Workout</span>
                  </div>
                  <span className="text-xs text-health font-mono">+25 XP</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-mana/10 border border-mana/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📚</span>
                    <span className="text-sm font-medium">Read 30 min</span>
                  </div>
                  <span className="text-xs text-mana font-mono">+15 XP</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-stamina/10 border border-stamina/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💧</span>
                    <span className="text-sm font-medium">Drink water</span>
                  </div>
                  <span className="text-xs text-stamina font-mono">+5 XP</span>
                </div>
              </div>
            </HudPanel>

            {/* Loot Summary */}
            <HudPanel title="Loot" icon={TrendingUp} iconColor="text-accent" delay={0.3}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="text-lg font-mono text-health">+$240</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="text-lg font-mono text-destructive">-$85</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net</span>
                  <span className="text-xl font-mono text-accent text-glow-gold">+$155</span>
                </div>
              </div>
            </HudPanel>
          </div>
        </div>
      </main>
    </div>
  );
}
