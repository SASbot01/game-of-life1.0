import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Gamepad2, ArrowLeft, Palette, Calendar, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { HudPanel } from '@/components/hud/HudPanel';
import { ThemeSwitcher } from '@/components/settings/ThemeSwitcher';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSoundContext } from '@/contexts/SoundContext';
import { setGlobalSoundEnabled } from '@/hooks/useSoundEffects';

interface GameRules {
  id: string;
  xp_multiplier: number;
  hp_penalty_rate: number;
  sprint_duration_days: number;
}

export default function Settings() {
  const { profile, user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { soundEnabled, setSoundEnabled } = useSoundContext();

  // Profile form state
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Game rules form state
  const [xpMultiplier, setXpMultiplier] = useState('1.0');
  const [hpPenaltyRate, setHpPenaltyRate] = useState('5');

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  // Fetch game rules
  const { data: gameRules } = useQuery({
    queryKey: ['game-rules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_rules')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data as GameRules | null;
    },
    enabled: !!user?.id,
  });

  // Load game rules into form
  useEffect(() => {
    if (gameRules) {
      setXpMultiplier(gameRules.xp_multiplier.toString());
      setHpPenaltyRate(gameRules.hp_penalty_rate.toString());
    }
  }, [gameRules]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ username, avatar_url: avatarUrl || null })
        .eq('id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  // Update game rules mutation
  const updateGameRulesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('game_rules')
        .update({
          xp_multiplier: parseFloat(xpMultiplier),
          hp_penalty_rate: parseInt(hpPenaltyRate),
        })
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-rules'] });
      toast.success('Game rules updated');
    },
    onError: () => toast.error('Failed to update game rules'),
  });

  return (
    <div className="min-h-screen grid-pattern p-4">
      <div className="container mx-auto max-w-2xl pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-3xl font-display text-foreground mb-8 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Settings
          </h1>

          <div className="space-y-6">
            {/* Sound Settings */}
            <HudPanel title="Sound Effects" icon={soundEnabled ? Volume2 : VolumeX} iconColor="text-mana">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sound-toggle" className="text-sm font-medium">UI Sound Effects</Label>
                  <p className="text-xs text-muted-foreground">
                    COD-style audio feedback for buttons, menus, and interactions
                  </p>
                </div>
                <Switch
                  id="sound-toggle"
                  checked={soundEnabled}
                  onCheckedChange={(checked) => {
                    setSoundEnabled(checked);
                    setGlobalSoundEnabled(checked);
                  }}
                  noSound
                />
              </div>
            </HudPanel>

            <HudPanel title="Theme" icon={Palette} iconColor="text-accent">
              <p className="text-sm text-muted-foreground mb-4">
                Choose your visual skin. Changes apply instantly.
              </p>
              <ThemeSwitcher />
            </HudPanel>

            {/* Punishment Task */}
            <HudPanel title="Punishment Task" icon={Gamepad2} iconColor="text-bio">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Custom Punishment</label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    This task will be required when your HP reaches 0
                  </p>
                  <Input
                    value={profile?.punishment_task || '100 push-ups'}
                    onChange={(e) => {
                      supabase
                        .from('profiles')
                        .update({ punishment_task: e.target.value })
                        .eq('id', user?.id)
                        .then(() => {
                          refreshProfile();
                          toast.success('Punishment task updated');
                        })
                        .catch(() => toast.error('Failed to update'));
                    }}
                    placeholder="e.g., 100 push-ups, 5km run, cold shower"
                    className="mt-1"
                  />
                </div>
              </div>
            </HudPanel>

            <HudPanel title="Integrations" icon={Calendar} iconColor="text-ops">
              <p className="text-sm text-muted-foreground mb-4">
                Connect external services to enhance your experience.
              </p>
              <GoogleCalendarConnect />
            </HudPanel>

            <HudPanel title="Profile" icon={User} iconColor="text-primary">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Avatar URL</label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="cyber"
                  size="sm"
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </HudPanel>

            <HudPanel title="Game Rules" icon={Gamepad2} iconColor="text-accent">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">XP Multiplier</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={xpMultiplier}
                    onChange={(e) => setXpMultiplier(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">HP Penalty Rate</label>
                  <Input
                    type="number"
                    value={hpPenaltyRate}
                    onChange={(e) => setHpPenaltyRate(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
                <Button
                  variant="cyber"
                  size="sm"
                  onClick={() => updateGameRulesMutation.mutate()}
                  disabled={updateGameRulesMutation.isPending}
                >
                  {updateGameRulesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Rules
                </Button>
              </div>
            </HudPanel>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
