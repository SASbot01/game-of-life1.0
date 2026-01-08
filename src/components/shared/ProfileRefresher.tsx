import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Component to ensure profile data is always fresh
 * Automatically refreshes profile on mount and when user changes
 */
export function ProfileRefresher() {
    const { refreshProfile, user } = useAuth();

    useEffect(() => {
        if (user) {
            console.log('🔄 [ProfileRefresher] Refreshing profile for user:', user.id);
            refreshProfile();
        }
    }, [user?.id]); // Refresh when user ID changes

    return null; // This component doesn't render anything
}
