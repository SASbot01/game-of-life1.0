import { NavLink, useLocation } from "react-router-dom";
import { Home, Heart, Crosshair, Gem, Settings, Calendar, Brain, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import golLogo from "@/assets/gol-logo.png";

const navItems = [
  { 
    to: "/dashboard", 
    icon: Home, 
    label: "Main Deck",
    color: "default"
  },
  { 
    to: "/command", 
    icon: Target, 
    label: "Command",
    color: "primary"
  },
  { 
    to: "/chronos", 
    icon: Calendar, 
    label: "Chronos",
    color: "default"
  },
  { 
    to: "/bio", 
    icon: Heart, 
    label: "Bio-Dome",
    color: "bio"
  },
  { 
    to: "/ops", 
    icon: Crosshair, 
    label: "Ops Center",
    color: "ops"
  },
  { 
    to: "/vault", 
    icon: Gem, 
    label: "The Vault",
    color: "vault"
  },
  { 
    to: "/cortex", 
    icon: Brain, 
    label: "Cortex",
    color: "ops"
  },
];

const bottomItems = [
  { 
    to: "/settings", 
    icon: Settings, 
    label: "Settings",
    color: "default"
  },
];

export function SpaceNavigation() {
  const location = useLocation();

  const getItemStyles = (color: string, isActive: boolean) => {
    if (!isActive) return "text-muted-foreground hover:text-foreground hover:bg-secondary/50";
    
    switch (color) {
      case "bio":
        return "text-bio bg-bio/10 border-l-2 border-bio";
      case "ops":
        return "text-ops bg-ops/10 border-l-2 border-ops";
      case "vault":
        return "text-vault bg-vault/10 border-l-2 border-vault";
      default:
        return "text-primary bg-primary/10 border-l-2 border-primary";
    }
  };

  return (
    <aside className="w-16 lg:w-56 border-r border-border/50 bg-background-deep flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center justify-center lg:justify-start lg:px-4 border-b border-border/50 gap-2">
        <img src={golLogo} alt="Game of Life" className="w-8 h-8" />
        <span className="font-display text-sm text-primary hidden lg:block">Game of Life</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                getItemStyles(item.color, isActive)
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="py-4 border-t border-border/50 px-2">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                getItemStyles(item.color, isActive)
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
}
