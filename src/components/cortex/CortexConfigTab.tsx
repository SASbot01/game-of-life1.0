import { motion } from "framer-motion";
import { Settings, Tag, FolderOpen, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function CortexConfigTab() {
  return (
    <div className="space-y-6">
      {/* General Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-ops/10 border border-ops/30">
            <Settings className="w-5 h-5 text-ops" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground">GENERAL SETTINGS</h3>
            <p className="text-muted-foreground text-sm">Configure your CORTEX preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <Label className="text-foreground">Auto-generate daily summary</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically calculate tasks, XP, and spending for each day
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <Label className="text-foreground">Daily reminder</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Get a notification to write in your log
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-foreground">Markdown support</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Enable markdown formatting in notes
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </motion.div>

      {/* Tags Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-ops/10 border border-ops/30">
            <Tag className="w-5 h-5 text-ops" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground">TAG MANAGEMENT</h3>
            <p className="text-muted-foreground text-sm">Organize your notes with tags</p>
          </div>
        </div>

        <div className="text-muted-foreground text-sm py-8 text-center">
          Tag management coming soon. Create tags directly in your notes.
        </div>
      </motion.div>

      {/* Backup & Export */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-ops/10 border border-ops/30">
            <FolderOpen className="w-5 h-5 text-ops" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground">BACKUP & EXPORT</h3>
            <p className="text-muted-foreground text-sm">Export your knowledge base</p>
          </div>
        </div>

        <div className="text-muted-foreground text-sm py-8 text-center">
          Export functionality coming soon. Your data is automatically saved to the cloud.
        </div>
      </motion.div>
    </div>
  );
}
