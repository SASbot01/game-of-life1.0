import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, Zap, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import golLogo from '@/assets/gol-logo-new.png';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashPhase, setSplashPhase] = useState<'logo' | 'welcome' | 'initializing' | 'done'>('logo');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const timeline = async () => {
      await new Promise(r => setTimeout(r, 1500)); // Logo assembles
      setSplashPhase('welcome');
      await new Promise(r => setTimeout(r, 1200)); // Show welcome
      setSplashPhase('initializing');
      await new Promise(r => setTimeout(r, 1000)); // Show initializing
      setSplashPhase('done');
      await new Promise(r => setTimeout(r, 500)); // Fade out
      setShowSplash(false);
    };
    timeline();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        // Generic error message for security
        throw new Error('Invalid email or password');
      }
      toast({
        title: 'Welcome back, Player!',
        description: 'Loading your game...'
      });
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message || 'Please check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Check Your Email',
        description: 'Password reset instructions have been sent to your email',
      });
      setShowResetPassword(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-mana/5" />

      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          >
            {/* Animated Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{
                scale: splashPhase === 'done' ? 0.8 : 1,
                rotate: 0,
                opacity: splashPhase === 'done' ? 0 : 1
              }}
              transition={{
                duration: 1.2,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              className="relative"
            >
              {/* Glow effect behind logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 0.8, 0.4],
                  scale: [0.5, 1.2, 1]
                }}
                transition={{ duration: 1.5, times: [0, 0.5, 1] }}
                className="absolute inset-0 blur-2xl bg-primary/30 rounded-full"
                style={{ width: 180, height: 180, left: -30, top: -30 }}
              />

              {/* Logo segments animation */}
              <motion.img
                src={golLogo}
                alt="Game of Life"
                className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_0_30px_hsl(var(--primary)/0.8)]"
                initial={{ filter: "brightness(0)" }}
                animate={{
                  filter: splashPhase === 'logo'
                    ? ["brightness(0)", "brightness(1.5)", "brightness(1)"]
                    : "brightness(1)"
                }}
                transition={{ duration: 1, times: [0, 0.6, 1] }}
              />
            </motion.div>

            {/* Welcome Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: splashPhase === 'welcome' || splashPhase === 'initializing' ? 1 : 0,
                y: splashPhase === 'welcome' || splashPhase === 'initializing' ? 0 : 20
              }}
              transition={{ duration: 0.4 }}
              className="mt-8 text-center"
            >
              <AnimatePresence mode="wait">
                {splashPhase === 'welcome' && (
                  <motion.h2
                    key="welcome"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-3xl font-display text-primary text-glow-cyan"
                  >
                    Welcome
                  </motion.h2>
                )}
                {splashPhase === 'initializing' && (
                  <motion.div
                    key="init"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-mono tracking-wider">Initializing...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: showSplash ? 0 : 1, scale: showSplash ? 0.95 : 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 border border-primary/20 shadow-neon-cyan">
          {/* Logo */}
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 mb-4 overflow-hidden">
              <img src={golLogo} alt="Game of Life" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-3xl font-display text-foreground">
              Game of <span className="text-primary text-glow-cyan">Life</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              {showResetPassword ? 'Reset your password' : 'Level up your reality'}
            </p>
          </motion.div>

          {/* Form */}
          {!showResetPassword ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="cyber" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Enter Game
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <Button type="submit" variant="cyber" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Send Reset Link
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to login
              </button>
            </form>
          )}

          {/* Info Message */}
          {!showResetPassword && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <span className="text-primary">Contact us for access</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
