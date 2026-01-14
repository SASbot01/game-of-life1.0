import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import golLogo from '@/assets/gol-logo-new.png';

export default function SetPassword() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            // Check for token in URL hash (Supabase format: #access_token=...)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            // If we have access_token in hash, set the session
            if (accessToken) {
                try {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (error) throw error;

                    if (data.session) {
                        setTokenValid(true);
                        setValidating(false);
                        return;
                    }
                } catch (error) {
                    console.error('Session error:', error);
                    setTokenValid(false);
                    setValidating(false);
                    return;
                }
            }

            // Check if user already has a session (clicked link again)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setTokenValid(true);
                setValidating(false);
                return;
            }

            // No valid token found
            setTokenValid(false);
            setValidating(false);
        };

        validateToken();
    }, []);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) {
            toast.error('Username is required');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }


        setLoading(true);
        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session found');
            }

            console.log('Setting password for user:', session.user.id);

            // Update user password
            const { error: passwordError } = await supabase.auth.updateUser({
                password: password,
            });

            if (passwordError) {
                console.error('Password error:', passwordError);
                throw passwordError;
            }

            console.log('Password updated successfully');

            // Create or update profile with username
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: session.user.id,
                    username: username.trim(),
                    is_onboarded: false, // Will go through setup flow
                }, {
                    onConflict: 'id'
                });

            if (profileError) {
                console.error('Profile error:', profileError);
                throw profileError;
            }

            console.log('Profile created successfully');

            toast.success('✅ Account activated successfully!');

            // Force navigation after a short delay
            console.log('Redirecting to /setup...');
            setTimeout(() => {
                window.location.href = '/setup';
            }, 1000);

        } catch (error: any) {
            console.error('Setup error:', error);
            toast.error(error.message || 'Failed to activate account');
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-4">Validating invitation...</p>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-8 border border-red-500/20 max-w-md w-full text-center"
                >
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-display text-foreground mb-2">Invalid Invitation</h2>
                    <p className="text-muted-foreground mb-6">
                        This invitation link is invalid or has expired. Please contact an administrator for a new invitation.
                    </p>
                    <Button variant="cyber" onClick={() => navigate('/auth')}>
                        Go to Login
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 grid-pattern relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-bio/5" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
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
                            Welcome to <span className="text-primary text-glow-cyan">Game of Life</span>
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Create your account to get started
                        </p>
                    </motion.div>

                    {/* Form */}
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10"
                                required
                                autoFocus
                                maxLength={30}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Choose a unique username</p>
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
                            />
                        </div>

                        <div className="relative">
                            <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-10"
                                required
                                minLength={6}
                            />
                        </div>

                        {password && confirmPassword && password !== confirmPassword && (
                            <p className="text-sm text-red-500">Passwords do not match</p>
                        )}

                        <Button
                            type="submit"
                            variant="cyber"
                            size="lg"
                            className="w-full"
                            disabled={loading || !username.trim() || password !== confirmPassword || password.length < 6}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Activate Account
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Info */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <p className="text-center text-xs text-muted-foreground">
                            Password must be at least 6 characters long
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
