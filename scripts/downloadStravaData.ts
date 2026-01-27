import * as fs from 'fs';
import * as path from 'path';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/token';

const DATA_DIR = path.join(__dirname, '..', 'DATA');
const STRAVA_DIR = path.join(DATA_DIR, 'strava');

interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  map?: {
    summary_polyline: string;
  };
}

async function refreshToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<StravaTokens> {
  console.log('Refreshing access token...');

  const response = await fetch(STRAVA_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  console.log('Token refreshed successfully');

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
}

async function getAthleteProfile(accessToken: string): Promise<any> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch athlete: ${await response.text()}`);
  }

  return response.json();
}

async function getActivities(
  accessToken: string,
  page: number = 1,
  perPage: number = 100
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${await response.text()}`);
  }

  return response.json();
}

async function downloadAllActivities(accessToken: string): Promise<StravaActivity[]> {
  const allActivities: StravaActivity[] = [];
  let page = 1;
  const perPage = 100;

  console.log('Downloading activities...');

  while (true) {
    const activities = await getActivities(accessToken, page, perPage);

    if (activities.length === 0) break;

    allActivities.push(...activities);
    console.log(`  Page ${page}: ${activities.length} activities (total: ${allActivities.length})`);

    if (activities.length < perPage) break;
    page++;
  }

  return allActivities;
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STRAVA_DIR)) {
    fs.mkdirSync(STRAVA_DIR, { recursive: true });
  }
}

function saveJson(filename: string, data: any) {
  const filepath = path.join(STRAVA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`Saved: ${filepath}`);
}

function loadTokens(): StravaTokens | null {
  const tokenFile = path.join(STRAVA_DIR, 'tokens.json');
  if (fs.existsSync(tokenFile)) {
    return JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
  }
  return null;
}

function saveTokens(tokens: StravaTokens) {
  saveJson('tokens.json', tokens);
}

async function main() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  let accessToken = process.env.STRAVA_ACCESS_TOKEN;
  let refreshTokenValue = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    console.error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET');
    process.exit(1);
  }

  ensureDirectories();

  // Check for saved tokens
  const savedTokens = loadTokens();
  if (savedTokens) {
    console.log('Found saved tokens');
    accessToken = savedTokens.access_token;
    refreshTokenValue = savedTokens.refresh_token;
  }

  if (!accessToken || !refreshTokenValue) {
    console.error('Missing access token or refresh token');
    console.error('Set STRAVA_ACCESS_TOKEN and STRAVA_REFRESH_TOKEN environment variables');
    process.exit(1);
  }

  try {
    // Always refresh token to ensure it's valid
    const newTokens = await refreshToken(clientId, clientSecret, refreshTokenValue);
    saveTokens(newTokens);
    accessToken = newTokens.access_token;

    // Download athlete profile
    console.log('\nFetching athlete profile...');
    const athlete = await getAthleteProfile(accessToken);
    saveJson('athlete.json', athlete);
    console.log(`Athlete: ${athlete.firstname} ${athlete.lastname}`);

    // Download all activities
    console.log('\nFetching activities...');
    const activities = await downloadAllActivities(accessToken);
    saveJson('activities.json', activities);

    // Summary
    console.log('\n=== Download Complete ===');
    console.log(`Total activities: ${activities.length}`);
    console.log(`Data saved to: ${STRAVA_DIR}`);

    // Activity type summary
    const typeCounts: Record<string, number> = {};
    for (const activity of activities) {
      typeCounts[activity.type] = (typeCounts[activity.type] || 0) + 1;
    }
    console.log('\nActivities by type:');
    for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
