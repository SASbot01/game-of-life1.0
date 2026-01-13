import { motion } from "framer-motion";
import { Moon, Sun, Zap, Gamepad2, Check, Flower2, Circle } from "lucide-react";
import { useTheme, ThemePreset } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const themes: {
  id: ThemePreset;
  name: string;
  description: string;
  icon: typeof Moon;
  preview: { bg: string; accent: string; text: string };
}[] = [
  {
    id: "void",
    name: "VOID",
    description: "Pure black, neon accents. Default spaceship terminal.",
    icon: Moon,
    preview: { bg: "#000000", accent: "#00f0ff", text: "#ffffff" },
  },
  {
    id: "monochrome",
    name: "CORPORATE",
    description: "Clean, professional, elegant. Minimal grayscale palette.",
    icon: Sun,
    preview: { bg: "#ffffff", accent: "#2d3748", text: "#1a202c" },
  },
  {
    id: "cyber-ops",
    name: "CYBER-OPS",
    description: "Deep blue military interface. Electric blue & orange.",
    icon: Zap,
    preview: { bg: "#0b1120", accent: "#3b82f6", text: "#e2e8f0" },
  },
  {
    id: "retro-pixel",
    name: "RETRO-PIXEL",
    description: "8-bit nostalgia. Bright colors, thick borders.",
    icon: Gamepad2,
    preview: { bg: "#1a1c2c", accent: "#f77f00", text: "#f4f4f4" },
  },
  {
    id: "soft-bloom",
    name: "SOFT BLOOM",
    description: "Feminine aesthetic. Rose, lavender & warm tones.",
    icon: Flower2,
    preview: { bg: "#fdf2f8", accent: "#ec4899", text: "#4a1a3d" },
  },
  {
    id: "midnight-obsidian",
    name: "OBSIDIAN",
    description: "All black stealth mode. Pure monochrome darkness.",
    icon: Circle,
    preview: { bg: "#080808", accent: "#c0c0c0", text: "#a0a0a0" },
  },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {themes.map((t) => {
        const isActive = theme === t.id;
        const Icon = t.icon;

        return (
          <motion.button
            key={t.id}
            onClick={() => setTheme(t.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative p-4 rounded-lg border-2 transition-all text-left",
              isActive
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground/50 bg-card"
            )}
          >
            {isActive && (
              <div className="absolute top-2 right-2">
                <Check className="w-4 h-4 text-primary" />
              </div>
            )}

            {/* Theme Preview */}
            <div
              className="w-full h-16 rounded-md mb-3 flex items-center justify-center border"
              style={{ backgroundColor: t.preview.bg, borderColor: t.preview.accent }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: t.preview.accent }}
              >
                <Icon className="w-4 h-4" style={{ color: t.preview.bg }} />
              </div>
            </div>

            <h4 className="font-display text-sm tracking-wider mb-1">{t.name}</h4>
            <p className="text-xs text-muted-foreground">{t.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
