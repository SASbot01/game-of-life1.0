import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PunishmentModalProps {
    isOpen: boolean;
    punishmentTask: string;
    onComplete: () => void;
}

export function PunishmentModal({ isOpen, punishmentTask, onComplete }: PunishmentModalProps) {
    const { user, profile, refreshProfile } = useAuth();
    const [confirmed, setConfirmed] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleComplete = async () => {
        if (!confirmed) {
            toast.error('You must confirm completion of your punishment');
            return;
        }

        setIsRestoring(true);
        try {
            // Restore HP to maximum
            const { error } = await supabase
                .from('profiles')
                .update({ hp: profile?.max_hp || 100 })
                .eq('id', user?.id);

            if (error) throw error;

            await refreshProfile();
            toast.success('HP restored! Get back in the game!');
            onComplete();
        } catch (error) {
            toast.error('Failed to restore HP');
            console.error(error);
        } finally {
            setIsRestoring(false);
            setConfirmed(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ pointerEvents: 'auto' }}
                >
                    {/* Dark backdrop - non-dismissible */}
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

                    {/* Modal content */}
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="relative glass-card border-2 border-red-500/50 rounded-2xl p-8 max-w-md w-full shadow-neon-red"
                    >
                        {/* Animated skull */}
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                            className="flex justify-center mb-6"
                        >
                            <div className="relative">
                                {/* Glow effect */}
                                <div className="absolute inset-0 blur-xl bg-red-500/50 rounded-full" />
                                <Skull className="w-24 h-24 text-red-500 relative z-10" strokeWidth={1.5} />
                            </div>
                        </motion.div>

                        {/* Title */}
                        <h2 className="text-3xl font-display text-center text-red-500 mb-2">
                            HP DEPLETED
                        </h2>
                        <p className="text-center text-muted-foreground mb-6">
                            Your health has reached zero. Complete your punishment to continue.
                        </p>

                        {/* Punishment task */}
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                            <p className="text-sm text-muted-foreground mb-2">YOUR PUNISHMENT:</p>
                            <p className="text-xl font-display text-red-500">{punishmentTask}</p>
                        </div>

                        {/* Confirmation checkbox */}
                        <div className="flex items-start gap-3 mb-6">
                            <button
                                onClick={() => setConfirmed(!confirmed)}
                                className={`
                  w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5
                  ${confirmed
                                        ? 'bg-red-500 border-red-500'
                                        : 'border-muted-foreground hover:border-red-500/50'
                                    }
                `}
                            >
                                {confirmed && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </button>
                            <label
                                onClick={() => setConfirmed(!confirmed)}
                                className="text-sm text-muted-foreground cursor-pointer select-none"
                            >
                                I have completed my punishment and I'm ready to get back in the game
                            </label>
                        </div>

                        {/* Restore button */}
                        <Button
                            onClick={handleComplete}
                            disabled={!confirmed || isRestoring}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-display text-lg h-12"
                        >
                            {isRestoring ? 'RESTORING HP...' : 'RESTORE HP'}
                        </Button>

                        {/* Warning message */}
                        <p className="text-xs text-center text-muted-foreground mt-4">
                            This modal cannot be dismissed until you complete your punishment
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
