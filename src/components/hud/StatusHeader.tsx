import { motion } from 'framer-motion';
import { Heart, Zap, Coins, User, Settings, LogOut, Menu } from 'lucide-react';
import { StatBar } from './StatBar';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function StatusHeader() {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Avatar & Level */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-primary/50 shadow-neon-cyan">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-background-elevated text-primary font-bold">
                  {profile.username?.charAt(0).toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground text-xs font-bold px-1.5 py-0.5 rounded-full shadow-neon-gold">
                {profile.level}
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="font-semibold text-foreground">{profile.username || 'Player'}</p>
              <p className="text-xs text-muted-foreground">Level {profile.level}</p>
            </div>
          </div>

          {/* Stats Bars */}
          <div className="flex-1 max-w-xl hidden md:flex gap-4">
            <div className="flex-1">
              <StatBar
                current={profile.hp}
                max={profile.max_hp}
                label="HP"
                icon={<Heart className="h-3 w-3" />}
                variant="health"
                size="sm"
              />
            </div>
            <div className="flex-1">
              <StatBar
                current={profile.current_xp}
                max={profile.max_xp_for_next_level}
                label="XP"
                icon={<Zap className="h-3 w-3" />}
                variant="xp"
                size="sm"
              />
            </div>
          </div>

          {/* Credits & Menu */}
          <div className="flex items-center gap-3">
            {/* Credits Display */}
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
              <Coins className="h-4 w-4 text-accent" />
              <span className="stat-number text-accent text-glow-gold font-semibold">
                {Number(profile.credits).toLocaleString('en-US', { 
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0 
                })}
              </span>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass-card border-border/50">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={signOut}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="flex md:hidden gap-4 mt-3 pt-3 border-t border-border/30">
          <div className="flex-1">
            <StatBar
              current={profile.hp}
              max={profile.max_hp}
              label="HP"
              icon={<Heart className="h-3 w-3" />}
              variant="health"
              size="sm"
            />
          </div>
          <div className="flex-1">
            <StatBar
              current={profile.current_xp}
              max={profile.max_xp_for_next_level}
              label="XP"
              icon={<Zap className="h-3 w-3" />}
              variant="xp"
              size="sm"
            />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
