import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, timeMin, timeMax } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Not connected to Google Calendar" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("Access token expired, refreshing...");
      const newTokens = await refreshAccessToken(tokenData.refresh_token);
      accessToken = newTokens.access_token;

      // Update stored token
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await supabase
        .from("google_calendar_tokens")
        .update({ access_token: accessToken, expires_at: expiresAt.toISOString() })
        .eq("user_id", userId);
    }

    // Fetch calendar events
    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calendarUrl.searchParams.set("timeMin", timeMin || new Date().toISOString());
    if (timeMax) calendarUrl.searchParams.set("timeMax", timeMax);
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");
    calendarUrl.searchParams.set("maxResults", "100");

    const eventsResponse = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const eventsData = await eventsResponse.json();

    if (eventsData.error) {
      console.error("Google Calendar API error:", eventsData.error);
      throw new Error(eventsData.error.message);
    }

    // Transform events
    const events = (eventsData.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || "Untitled",
      description: event.description || null,
      start_time: event.start.dateTime || event.start.date,
      end_time: event.end.dateTime || event.end.date,
      is_all_day: !event.start.dateTime,
      origin_type: "google_calendar",
      origin_id: event.id,
    }));

    console.log(`Fetched ${events.length} events from Google Calendar`);

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
