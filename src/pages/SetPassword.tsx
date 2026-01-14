import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import golLogo from '@/assets/gol-logo-new.png';

export default function SetPassword() {
    const navigate = useNavigate();
    const [processing, setProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const handleInvitation = async () => {
            try {
                // Check for token in URL hash (Supabase format: #access_token=...)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (!accessToken) {
                    setError('No invitation token found');
                    setProcessing(false);
                    return;
                }

                console.log('Processing invitation...');

                // Set the session
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || '',
                });

                if (sessionError) throw sessionError;
                if (!sessionData.session) throw new Error('Failed to create session');

                console.log('Session created for user:', sessionData.session.user.id);

                // Check if profile already exists
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', sessionData.session.user.id)
                    .single();

                if (existingProfile) {
                    console.log('Profile already exists, redirecting to setup...');
                    setSuccess(true);
                    toast.success('Welcome back! Redirecting...');
                    setTimeout(() => {
                        window.location.href = '/setup';
                    }, 1000);
                    return;
                }

                // Create profile with email as temporary username
                const email = sessionData.session.user.email || 'user';
                const username = email.split('@')[0]; // Use part before @ as username

                console.log('Creating profile with username:', username);

                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: sessionData.session.user.id,
                        username: username,
                        is_onboarded: false,
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    throw profileError;
                }

                console.log('Profile created successfully');
                setSuccess(true);
                toast.success('✅ Account activated! Redirecting to setup...');

                // Redirect to setup
                setTimeout(() => {
                    window.location.href = '/setup';
                }, 1500);

            } catch (err: any) {
                console.error('Invitation processing error:', err);
                setError(err.message || 'Failed to process invitation');
                setProcessing(false);
            }
        };

        handleInvitation();
    }, []);

    if (processing && !error && !success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-8 border border-primary/20 max-w-md w-full text-center"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 mb-4 overflow-hidden">
                        <img src={golLogo} alt="Game of Life" className="w-10 h-10 object-contain" />
                    </div>
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-display text-foreground mb-2">Processing Invitation</h2>
                    <p className="text-muted-foreground">
                        Setting up your account...
                    </p>
                </motion.div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-8 border border-green-500/20 max-w-md w-full text-center"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 mb-4 overflow-hidden">
                        <img src={golLogo} alt="Game of Life" className="w-10 h-10 object-contain" />
                    </div>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-display text-foreground mb-2">Account Activated!</h2>
                    <p className="text-muted-foreground mb-4">
                        Redirecting to setup...
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Please wait...</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-8 border border-red-500/20 max-w-md w-full text-center"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 mb-4 overflow-hidden">
                        <img src={golLogo} alt="Game of Life" className="w-10 h-10 object-contain" />
                    </div>
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-display text-foreground mb-2">Invalid Invitation</h2>
                    <p className="text-muted-foreground mb-6">
                        {error === 'No invitation token found'
                            ? 'This invitation link is invalid or has expired. Please contact an administrator for a new invitation.'
                            : error
                        }
                    </p>
                    <Button variant="cyber" onClick={() => navigate('/auth')}>
                        Go to Login
                    </Button>
                </motion.div>
            </div>
        );
    }

    return null;
}
