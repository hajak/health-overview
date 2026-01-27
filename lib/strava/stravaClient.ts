import { StravaActivity, StravaAthlete, StravaTokens } from '@/types/strava';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/token';

export async function refreshStravaToken(
  refreshToken: string
): Promise<StravaTokens> {
  const response = await fetch(STRAVA_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Strava token: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
}

export async function getAthleteProfile(
  accessToken: string
): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch athlete profile: ${error}`);
  }

  return response.json();
}

export interface GetActivitiesOptions {
  before?: number;
  after?: number;
  page?: number;
  per_page?: number;
}

export async function getActivities(
  accessToken: string,
  options: GetActivitiesOptions = {}
): Promise<StravaActivity[]> {
  const params = new URLSearchParams();

  if (options.before) params.append('before', options.before.toString());
  if (options.after) params.append('after', options.after.toString());
  if (options.page) params.append('page', options.page.toString());
  params.append('per_page', (options.per_page || 30).toString());

  const url = `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch activities: ${error}`);
  }

  return response.json();
}

export async function getActivityDetails(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch activity details: ${error}`);
  }

  return response.json();
}

export function isTokenExpired(expiresAt: number): boolean {
  const bufferSeconds = 300;
  return Date.now() / 1000 >= expiresAt - bufferSeconds;
}
