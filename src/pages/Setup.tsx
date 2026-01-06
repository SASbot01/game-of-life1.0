import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Coins, Sword, Rocket, Check, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const STEPS = ['Character', 'Wealth', 'Class', 'Launch'];

const CLASS_PRESETS = [
  { id: 'student', name: 'Student', icon: '📚', desc: 'Focus on learning habits' },
  { id: 'athlete', name: 'Athlete', icon: '💪', desc: 'Physical fitness focused' },
  { id: 'entrepreneur', name: 'Entrepreneur', icon: '🚀', desc: 'Productivity & business' },
  { id: 'custom', name: 'Custom', icon: '⚙️', desc: 'Build your own path' },
];

export default function Setup() {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [credits, setCredits] = useState('0');
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: username || user.email?.split('@')[0],
          credits: parseFloat(credits) || 0,
          is_onboarded: true,
          setup_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Add default habits based on class
      const defaultHabits = getHabitsForClass(selectedClass);
      if (defaultHabits.length > 0) {
        const { error: habitsError } = await supabase
          .from('habits')
          .insert(defaultHabits.map(h => ({ ...h, user_id: user.id })));
        if (habitsError) throw habitsError;
      }

      await refreshProfile();
      toast({ title: 'Adventure begins!', description: 'Welcome to Game of Life!' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getHabitsForClass = (classId: string) => {
    const habits: any[] = [];
    if (classId === 'student') {
      habits.push(
        { name: 'Study 1 hour', category: 'mana', type: 'positive', xp_reward: 20 },
        { name: 'Read 30 minutes', category: 'mana', type: 'positive', xp_reward: 15 },
      );
    } else if (classId === 'athlete') {
      habits.push(
        { name: 'Workout', category: 'health', type: 'positive', xp_reward: 25, hp_impact: 5 },
        { name: 'Drink water', category: 'stamina', type: 'positive', xp_reward: 5 },
      );
    } else if (classId === 'entrepreneur') {
      habits.push(
        { name: 'Work on project', category: 'stamina', type: 'positive', xp_reward: 30 },
        { name: 'Network', category: 'mana', type: 'positive', xp_reward: 15 },
      );
    }
    return habits;
  };

  const canProceed = () => {
    if (step === 0) return username.length >= 2;
    if (step === 2) return selectedClass !== '';
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 hex-pattern">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="glass-card rounded-2xl p-8 border border-primary/20">
          {/* Progress */}
          <div className="flex items-center justify-between mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i <= step ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-1 transition-all ${i < step ? 'bg-primary' : 'bg-secondary'}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <User className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h2 className="text-2xl font-display">Create Your Character</h2>
                  <p className="text-muted-foreground">Choose your player name</p>
                </div>
                <Input placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} className="text-center text-lg" />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <Coins className="w-12 h-12 text-accent mx-auto mb-3" />
                  <h2 className="text-2xl font-display">Starting Wealth</h2>
                  <p className="text-muted-foreground">Set your initial credits</p>
                </div>
                <Input type="number" placeholder="0" value={credits} onChange={(e) => setCredits(e.target.value)} className="text-center text-lg font-mono" />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <Sword className="w-12 h-12 text-health mx-auto mb-3" />
                  <h2 className="text-2xl font-display">Choose Your Class</h2>
                  <p className="text-muted-foreground">Select your starting habits preset</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {CLASS_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClass(c.id)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        selectedClass === c.id 
                          ? 'border-primary bg-primary/10 shadow-neon-cyan' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl">{c.icon}</span>
                      <p className="font-semibold mt-2">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
                <Sparkles className="w-16 h-16 text-accent mx-auto float" />
                <h2 className="text-2xl font-display">Ready to Begin!</h2>
                <p className="text-muted-foreground">Your adventure awaits, {username}!</p>
                <div className="glass-card rounded-lg p-4 text-left space-y-2">
                  <p><span className="text-muted-foreground">Class:</span> <span className="text-primary">{CLASS_PRESETS.find(c => c.id === selectedClass)?.name}</span></p>
                  <p><span className="text-muted-foreground">Credits:</span> <span className="text-accent font-mono">{credits}</span></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button variant="cyber" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="flex-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="cyber-gold" onClick={handleFinish} disabled={loading} className="flex-1">
                <Rocket className="w-4 h-4" /> Start Game
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
