import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface GoogleTokens {
    access_token: string;
    refresh_token: string;
    expires_at: string;
}

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    htmlLink?: string;
    location?: string;
}

/**
 * Exchange OAuth code for tokens
 */
export async function exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
): Promise<GoogleTokens> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';

    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt.toISOString(),
    };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
): Promise<{ access_token: string; expires_at: string }> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';

    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    return {
        access_token: data.access_token,
        expires_at: expiresAt.toISOString(),
    };
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
    supabaseClient: any,
    userId: string,
    clientId: string,
    clientSecret: string
): Promise<string> {
    // Get stored tokens
    const { data: tokenData, error } = await supabaseClient
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !tokenData) {
        throw new Error('No Google Calendar connection found');
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    // Refresh if expired or expiring in next 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        const refreshed = await refreshAccessToken(
            tokenData.refresh_token,
            clientId,
            clientSecret
        );

        // Update stored token
        await supabaseClient
            .from('google_calendar_tokens')
            .update({
                access_token: refreshed.access_token,
                expires_at: refreshed.expires_at,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        return refreshed.access_token;
    }

    return tokenData.access_token;
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(
    accessToken: string,
    timeMin: string,
    timeMax: string
): Promise<GoogleCalendarEvent[]> {
    const calendarId = 'primary';
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);

    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch calendar events: ${error}`);
    }

    const data = await response.json();
    return data.items || [];
}
