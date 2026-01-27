import * as fs from 'fs';
import * as path from 'path';

const OURA_API_BASE = 'https://api.ouraring.com/v2/usercollection';

const DATA_DIR = path.join(__dirname, '..', 'DATA');
const OURA_DIR = path.join(DATA_DIR, 'oura');

async function fetchOuraData(accessToken: string, endpoint: string, startDate: string, endDate: string) {
  const url = `${OURA_API_BASE}/${endpoint}?start_date=${startDate}&end_date=${endDate}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch ${endpoint}: ${error}`);
  }

  return response.json();
}

async function fetchPersonalInfo(accessToken: string) {
  const response = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch personal info: ${error}`);
  }

  return response.json();
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(OURA_DIR)) {
    fs.mkdirSync(OURA_DIR, { recursive: true });
  }
}

function saveJson(filename: string, data: any) {
  const filepath = path.join(OURA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`Saved: ${filepath}`);
}

function getDateRange(): { startDate: string; endDate: string } {
  return {
    startDate: '2020-01-01',
    endDate: '2025-12-31',
  };
}

async function main() {
  const accessToken = process.env.OURA_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('=== Oura Setup Instructions ===\n');
    console.log('1. Go to https://cloud.ouraring.com/personal-access-tokens');
    console.log('2. Click "Create New Personal Access Token"');
    console.log('3. Give it a name (e.g., "Health Overview")');
    console.log('4. Copy the token');
    console.log('5. Add to .env.local:');
    console.log('   OURA_ACCESS_TOKEN=your_token_here');
    console.log('\n6. Run this script again: pnpm oura:download');
    process.exit(1);
  }

  ensureDirectories();

  const { startDate, endDate } = getDateRange(365);
  console.log(`\nFetching Oura data from ${startDate} to ${endDate}\n`);

  try {
    // Fetch personal info
    console.log('Fetching personal info...');
    const personalInfo = await fetchPersonalInfo(accessToken);
    saveJson('personal_info.json', personalInfo);

    // Fetch daily data
    const endpoints = [
      { name: 'daily_activity', file: 'daily_activity.json' },
      { name: 'daily_readiness', file: 'daily_readiness.json' },
      { name: 'daily_sleep', file: 'daily_sleep.json' },
      { name: 'sleep', file: 'sleep.json' },
      { name: 'heartrate', file: 'heartrate.json' },
      { name: 'workout', file: 'workouts.json' },
      { name: 'daily_spo2', file: 'daily_spo2.json' },
    ];

    for (const { name, file } of endpoints) {
      try {
        console.log(`Fetching ${name}...`);
        const data = await fetchOuraData(accessToken, name, startDate, endDate);
        saveJson(file, data);
        console.log(`  ${data.data?.length || 0} records`);
      } catch (error) {
        console.log(`  Skipped (${error instanceof Error ? error.message : 'error'})`);
      }
    }

    // Summary
    console.log('\n=== Download Complete ===');
    console.log(`Data saved to: ${OURA_DIR}`);

    // Read and summarize sleep data
    const sleepPath = path.join(OURA_DIR, 'daily_sleep.json');
    if (fs.existsSync(sleepPath)) {
      const sleepData = JSON.parse(fs.readFileSync(sleepPath, 'utf-8'));
      if (sleepData.data?.length > 0) {
        const avgScore = sleepData.data.reduce((sum: number, d: any) => sum + (d.score || 0), 0) / sleepData.data.length;
        console.log(`\nSleep data: ${sleepData.data.length} days, avg score: ${avgScore.toFixed(0)}`);
      }
    }

    // Read and summarize activity data
    const activityPath = path.join(OURA_DIR, 'daily_activity.json');
    if (fs.existsSync(activityPath)) {
      const activityData = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
      if (activityData.data?.length > 0) {
        const avgSteps = activityData.data.reduce((sum: number, d: any) => sum + (d.steps || 0), 0) / activityData.data.length;
        console.log(`Activity data: ${activityData.data.length} days, avg steps: ${Math.round(avgSteps)}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
