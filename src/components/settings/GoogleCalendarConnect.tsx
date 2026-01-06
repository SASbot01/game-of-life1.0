import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Check, Loader2, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function GoogleCalendarConnect() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if connected
  const { data: connectionStatus, isLoading: checkingConnection } = useQuery({
    queryKey: ["google-calendar-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_tokens")
        .select("id, expires_at")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return { isConnected: !!data, expiresAt: data?.expires_at };
    },
    enabled: !!user?.id,
  });

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && state === "google-calendar-oauth" && user?.id) {
      handleCallback(code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.id]);

  const handleCallback = async (code: string) => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      
      const response = await supabase.functions.invoke("google-calendar-callback", {
        body: { code, redirectUri, userId: user?.id },
      });

      if (response.error) throw new Error(response.error.message);

      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
      toast.success("Google Calendar connected successfully!");
    } catch (error: any) {
      console.error("Callback error:", error);
      toast.error("Failed to connect: " + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/settings`;

      const response = await supabase.functions.invoke("google-calendar-auth", {
        body: { redirectUri },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data.authUrl;
    },
    onSuccess: (authUrl) => {
      // Add state parameter to URL for security
      const url = new URL(authUrl);
      url.searchParams.set("state", "google-calendar-oauth");
      window.location.href = url.toString();
    },
    onError: (error: any) => {
      toast.error("Failed to initiate connection: " + error.message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
      toast.success("Google Calendar disconnected");
    },
    onError: () => {
      toast.error("Failed to disconnect");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const timeMin = new Date();
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 1);

      const response = await supabase.functions.invoke("google-calendar-sync", {
        body: {
          userId: user?.id,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.events?.length || 0} events from Google Calendar`);
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (error: any) => {
      toast.error("Sync failed: " + error.message);
    },
  });

  if (checkingConnection) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking connection...
      </div>
    );
  }

  const isConnected = connectionStatus?.isConnected;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-background border border-border">
        <div className={`p-2 rounded-lg ${isConnected ? "bg-green-500/20" : "bg-muted"}`}>
          <Calendar className={`w-6 h-6 ${isConnected ? "text-green-500" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Google Calendar</span>
            {isConnected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-xs text-green-500"
              >
                <Check className="w-3 h-3" />
                Connected
              </motion.div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isConnected
              ? "Your calendar events are synced with Chronos"
              : "Connect to sync your calendar events"}
          </p>
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-3">
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || isConnecting}
            className="w-full bg-ops text-ops-foreground hover:bg-ops/90"
          >
            {(connectMutation.isPending || isConnecting) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Google Calendar
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              You'll need to configure OAuth credentials in Google Cloud Console first.
              Add <code className="text-xs bg-muted px-1 rounded">{window.location.origin}/settings</code> as an authorized redirect URI.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            variant="outline"
            className="flex-1"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync Now
          </Button>
          <Button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            variant="destructive"
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Disconnect"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
