import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { globalSoundPlayer } from './useSoundEffects';

interface GainOptions {
  xp?: number;
  hp?: number;
  source?: string;
}

export function useXpGain() {
  const { profile, user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const showFloatingGain = (xp: number, hp: number, source?: string) => {
    // Create floating notification with satisfying animation
    const container = document.createElement('div');
    container.className = 'xp-gain-popup';
    container.innerHTML = `
      <div class="xp-gain-content">
        ${xp > 0 ? `<span class="xp-text">+${xp} XP</span>` : ''}
        ${hp > 0 ? `<span class="hp-text">+${hp} HP</span>` : ''}
        ${source ? `<span class="source-text">${source}</span>` : ''}
      </div>
    `;
    document.body.appendChild(container);

    // Trigger animation
    requestAnimationFrame(() => {
      container.classList.add('animate');
    });

    // Remove after animation
    setTimeout(() => {
      container.classList.add('fade-out');
      setTimeout(() => container.remove(), 300);
    }, 2000);
  };

  const triggerCelebration = (xp: number) => {
    // Small celebration for normal gains
    if (xp >= 10 && xp < 50) {
      confetti({
        particleCount: 20,
        spread: 50,
        origin: { y: 0.3 },
        colors: ['#00d4ff', '#ff0080'],
        scalar: 0.7,
      });
    }
    // Medium celebration for significant gains
    else if (xp >= 50 && xp < 100) {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.3 },
        colors: ['#00d4ff', '#ff0080', '#ffd700'],
      });
    }
    // Big celebration for boss-level completions
    else if (xp >= 100) {
      const end = Date.now() + 500;
      const colors = ['#00d4ff', '#ff0080', '#ffd700'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  };

  const gainMutation = useMutation({
    mutationFn: async ({ xp = 0, hp = 0 }: GainOptions) => {
      if (!profile || !user) throw new Error('No profile');

      const newXp = profile.current_xp + xp;
      const newHp = Math.min(profile.hp + hp, profile.max_hp);

      const { error } = await supabase
        .from('profiles')
        .update({
          current_xp: newXp,
          hp: newHp,
        })
        .eq('id', user.id);

      if (error) throw error;
      return { xp, hp, newXp, newHp };
    },
    onSuccess: ({ xp, hp }) => {
      // Refresh profile to trigger bar animations
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profiles'] });

      // Show floating gain popup
      if (xp > 0 || hp > 0) {
        showFloatingGain(xp, hp);
      }

      // Play sound and trigger celebration based on XP amount
      if (xp > 0) {
        globalSoundPlayer.play('xpGain');
        triggerCelebration(xp);
      }

      // Dispatch custom event for stat bar animation
      window.dispatchEvent(new CustomEvent('stat-gain', { detail: { xp, hp } }));
    },
    onError: (error) => {
      console.error('Failed to award XP/HP:', error);
      toast.error('Failed to update stats');
    },
  });

  const awardXp = (options: GainOptions) => {
    gainMutation.mutate(options);
  };

  return { awardXp, isPending: gainMutation.isPending };
}
