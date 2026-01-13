import { useAuth } from "@/hooks/useAuth";
import { Heart, Zap, Gem, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatBar } from "@/components/hud/StatBar";

export function StatusBar() {
  const { profile, signOut, user } = useAuth();

  const hp = profile?.hp ?? 100;
  const maxHp = profile?.max_hp ?? 100;

  const xp = profile?.current_xp ?? 0;
  const maxXp = profile?.max_xp_for_next_level ?? 100;

  const credits = profile?.credits ?? 0;
  const level = profile?.level ?? 1;

  return (
    <header className="h-14 border-b border-border/50 bg-background-deep flex items-center px-4 gap-6">
      {/* HP Bar */}
      <div className="min-w-[160px]">
        <StatBar
          current={hp}
          max={maxHp}
          label="HP"
          icon={<Heart className="h-3 w-3" />}
          variant="health"
          size="sm"
          showNumbers={true}
        />
      </div>

      {/* XP Bar */}
      <div className="min-w-[160px]">
        <StatBar
          current={xp}
          max={maxXp}
          label="XP"
          icon={<Zap className="h-3 w-3" />}
          variant="xp"
          size="sm"
          showNumbers={true}
        />
      </div>

      {/* Level Badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-ops/10 border border-ops/20">
        <span className="text-xs text-ops font-medium">LVL</span>
        <span className="font-mono text-sm text-ops font-bold">{level}</span>
      </div>

      {/* Credits */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-vault/10 border border-vault/20">
        <Gem className="w-3.5 h-3.5 text-vault" />
        <span className="font-mono text-sm text-vault font-medium">
          {Number(credits).toLocaleString()}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {profile?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm text-muted-foreground">
              {profile?.username || user?.email?.split('@')[0]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
