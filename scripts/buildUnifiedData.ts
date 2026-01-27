import * as fs from 'fs';
import * as path from 'path';

/**
 * Builds a unified daily health dataset by merging Apple Health, Oura, and Strava data.
 *
 * Source priority per metric is defined in types/unified.ts.
 * Original data files are never modified - this script only reads and outputs.
 *
 * Output: DATA/unified/daily.json
 */

interface Sourced<T> {
  value: T;
  source: string;
}

interface UnifiedDay {
  date: string;
  steps: Sourced<number> | null;
  activeCalories: Sourced<number> | null;
  distanceMeters: Sourced<number> | null;
  exerciseMinutes: Sourced<number> | null;
  restingHeartRate: Sourced<number> | null;
  avgHeartRate: Sourced<number> | null;
  hrv: Sourced<number> | null;
  sleepDurationMinutes: Sourced<number> | null;
  sleepScore: Sourced<number> | null;
  sleepDeepMinutes: Sourced<number> | null;
  sleepREMMinutes: Sourced<number> | null;
  sleepLightMinutes: Sourced<number> | null;
  sleepAwakeMinutes: Sourced<number> | null;
  sleepEfficiency: Sourced<number> | null;
  respiratoryRate: Sourced<number> | null;
  oxygenSaturation: Sourced<number> | null;
  breathingDisturbanceIndex: Sourced<number> | null;
  readinessScore: Sourced<number> | null;
  temperatureDeviation: Sourced<number> | null;
  vo2Max: Sourced<number> | null;
  wristTemperature: Sourced<number> | null;
}

// --- Load all data sources ---

function loadJson(filePath: string): unknown {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const DATA_DIR = path.join(process.cwd(), 'DATA');

// Apple Health
interface AppleDay {
  date: string;
  steps: number;
  activeCalories: number;
  distance: number;
  exerciseMinutes: number;
  restingHeartRate: number | null;
  avgHeartRate: number | null;
  hrv: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  sleepDuration: number | null;
  sleepCore: number | null;
  sleepDeep: number | null;
  sleepREM: number | null;
  sleepAwake: number | null;
  wristTemperature: number | null;
  vo2Max: number | null;
}

// Oura Sleep (daily_sleep.json)
interface OuraDailySleep {
  day: string;
  score: number;
  contributors: {
    deep_sleep: number;
    efficiency: number;
    latency: number;
    rem_sleep: number;
    restfulness: number;
    timing: number;
    total_sleep: number;
  };
}

// Oura detailed sleep (sleep.json) - has actual durations
interface OuraSleepSession {
  day: string;
  average_breath: number | null;
  average_heart_rate: number | null;
  average_hrv: number | null;
  awake_time: number; // seconds
  deep_sleep_duration: number; // seconds
  rem_sleep_duration: number; // seconds
  light_sleep_duration: number; // seconds
  total_sleep_duration: number; // seconds
  time_in_bed: number; // seconds
  efficiency: number; // percentage
  lowest_heart_rate: number | null;
  type: string;
}

// Oura Activity (daily_activity.json)
interface OuraActivity {
  day: string;
  steps: number;
  active_calories: number;
  equivalent_walking_distance: number; // meters
  high_activity_time: number; // seconds
  medium_activity_time: number; // seconds
  low_activity_time: number; // seconds
}

// Oura Readiness (daily_readiness.json)
interface OuraReadiness {
  day: string;
  score: number;
  temperature_deviation: number | null;
  temperature_trend_deviation: number | null;
  contributors: {
    hrv_balance: number | null;
    resting_heart_rate: number | null;
    [key: string]: number | null | undefined;
  };
}

// Oura SpO2 (daily_spo2.json)
interface OuraSpO2 {
  day: string;
  spo2_percentage: { average: number };
  breathing_disturbance_index: number | null;
}

function sourced<T>(value: T | null | undefined, source: string): Sourced<T> | null {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return null;
  }
  return { value, source };
}

function pickFirst<T>(...candidates: (Sourced<T> | null)[]): Sourced<T> | null {
  for (const c of candidates) {
    if (c !== null) return c;
  }
  return null;
}

function roundVal(v: number | null | undefined, decimals = 1): number | null {
  if (v === null || v === undefined || isNaN(v)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(v * factor) / factor;
}

function main(): void {
  console.log('Building unified health dataset...\n');

  // Load Apple Health
  const appleRaw = loadJson(path.join(DATA_DIR, 'apple_health', 'daily_data.json')) as { data: AppleDay[] } | null;
  const appleDays = appleRaw?.data || [];
  const appleMap = new Map<string, AppleDay>();
  for (const d of appleDays) appleMap.set(d.date, d);
  console.log(`Apple Health: ${appleDays.length} days`);

  // Load Oura daily sleep
  const ouraSleepDailyRaw = loadJson(path.join(DATA_DIR, 'oura', 'daily_sleep.json')) as { data: OuraDailySleep[] } | null;
  const ouraSleepDaily = ouraSleepDailyRaw?.data || [];
  const ouraSleepDailyMap = new Map<string, OuraDailySleep>();
  for (const d of ouraSleepDaily) ouraSleepDailyMap.set(d.day, d);
  console.log(`Oura Daily Sleep: ${ouraSleepDaily.length} days`);

  // Load Oura detailed sleep sessions
  const ouraSleepDetailRaw = loadJson(path.join(DATA_DIR, 'oura', 'sleep.json')) as { data: OuraSleepSession[] } | null;
  const ouraSleepSessions = ouraSleepDetailRaw?.data || [];
  // Aggregate by day: pick the longest "sleep" type session per night
  const ouraSleepMap = new Map<string, OuraSleepSession>();
  for (const session of ouraSleepSessions) {
    if (session.type !== 'long_sleep' && session.type !== 'sleep') continue;
    const existing = ouraSleepMap.get(session.day);
    if (!existing || session.total_sleep_duration > existing.total_sleep_duration) {
      ouraSleepMap.set(session.day, session);
    }
  }
  console.log(`Oura Sleep Sessions: ${ouraSleepMap.size} nights (from ${ouraSleepSessions.length} sessions)`);

  // Load Oura activity
  const ouraActivityRaw = loadJson(path.join(DATA_DIR, 'oura', 'daily_activity.json')) as { data: OuraActivity[] } | null;
  const ouraActivityArr = ouraActivityRaw?.data || [];
  const ouraActivityMap = new Map<string, OuraActivity>();
  for (const d of ouraActivityArr) ouraActivityMap.set(d.day, d);
  console.log(`Oura Activity: ${ouraActivityArr.length} days`);

  // Load Oura readiness
  const ouraReadinessRaw = loadJson(path.join(DATA_DIR, 'oura', 'daily_readiness.json')) as { data: OuraReadiness[] } | null;
  const ouraReadinessArr = ouraReadinessRaw?.data || [];
  const ouraReadinessMap = new Map<string, OuraReadiness>();
  for (const d of ouraReadinessArr) ouraReadinessMap.set(d.day, d);
  console.log(`Oura Readiness: ${ouraReadinessArr.length} days`);

  // Load Oura SpO2
  const ouraSpO2Raw = loadJson(path.join(DATA_DIR, 'oura', 'daily_spo2.json')) as { data: OuraSpO2[] } | null;
  const ouraSpO2Arr = ouraSpO2Raw?.data || [];
  const ouraSpO2Map = new Map<string, OuraSpO2>();
  for (const d of ouraSpO2Arr) ouraSpO2Map.set(d.day, d);
  console.log(`Oura SpO2: ${ouraSpO2Arr.length} days`);

  // Collect all unique dates
  const allDates = new Set<string>();
  appleMap.forEach((_, d) => allDates.add(d));
  ouraSleepDailyMap.forEach((_, d) => allDates.add(d));
  ouraSleepMap.forEach((_, d) => allDates.add(d));
  ouraActivityMap.forEach((_, d) => allDates.add(d));
  ouraReadinessMap.forEach((_, d) => allDates.add(d));
  ouraSpO2Map.forEach((_, d) => allDates.add(d));

  const sortedDates = Array.from(allDates).sort();
  console.log(`\nTotal unique dates: ${sortedDates.length}`);
  console.log(`Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}\n`);

  // Build unified records
  const unified: UnifiedDay[] = [];
  const sourceCounters: Record<string, Record<string, number>> = {};

  function track(metric: string, source: string): void {
    if (!sourceCounters[metric]) sourceCounters[metric] = {};
    sourceCounters[metric][source] = (sourceCounters[metric][source] || 0) + 1;
  }

  for (const date of sortedDates) {
    const apple = appleMap.get(date);
    const ouraSleepD = ouraSleepDailyMap.get(date);
    const ouraSleep = ouraSleepMap.get(date);
    const ouraAct = ouraActivityMap.get(date);
    const ouraReady = ouraReadinessMap.get(date);
    const ouraSpO2 = ouraSpO2Map.get(date);

    // --- Steps: Apple primary, Oura fallback ---
    const steps = pickFirst(
      sourced(apple?.steps && apple.steps > 0 ? apple.steps : null, 'apple_health'),
      sourced(ouraAct?.steps && ouraAct.steps > 0 ? ouraAct.steps : null, 'oura'),
    );

    // --- Active Calories: Apple primary ---
    const activeCalories = pickFirst(
      sourced(apple?.activeCalories && apple.activeCalories > 0 ? Math.round(apple.activeCalories) : null, 'apple_health'),
      sourced(ouraAct?.active_calories && ouraAct.active_calories > 0 ? ouraAct.active_calories : null, 'oura'),
    );

    // --- Distance: Apple primary ---
    const distanceMeters = pickFirst(
      sourced(apple?.distance && apple.distance > 0 ? apple.distance : null, 'apple_health'),
      sourced(ouraAct?.equivalent_walking_distance && ouraAct.equivalent_walking_distance > 0 ? Math.round(ouraAct.equivalent_walking_distance) : null, 'oura'),
    );

    // --- Exercise Minutes: Apple primary ---
    const exerciseMinutes = pickFirst(
      sourced(apple?.exerciseMinutes && apple.exerciseMinutes > 0 ? apple.exerciseMinutes : null, 'apple_health'),
      sourced(ouraAct ? Math.round((ouraAct.high_activity_time + ouraAct.medium_activity_time) / 60) : null, 'oura'),
    );

    // --- Resting Heart Rate: Oura primary (overnight), Apple fallback ---
    const restingHeartRate = pickFirst(
      sourced(ouraSleep?.lowest_heart_rate ? roundVal(ouraSleep.lowest_heart_rate) : null, 'oura'),
      sourced(roundVal(apple?.restingHeartRate), 'apple_health'),
    );

    // --- Average Heart Rate: Apple primary (all-day), Oura fallback (sleep only) ---
    const avgHeartRate = pickFirst(
      sourced(roundVal(apple?.avgHeartRate), 'apple_health'),
      sourced(ouraSleep?.average_heart_rate ? roundVal(ouraSleep.average_heart_rate) : null, 'oura'),
    );

    // --- HRV: Oura primary (sleep-measured), Apple fallback ---
    const hrv = pickFirst(
      sourced(ouraSleep?.average_hrv ? roundVal(ouraSleep.average_hrv) : null, 'oura'),
      sourced(roundVal(apple?.hrv), 'apple_health'),
    );

    // --- Sleep Duration: Oura primary (seconds->minutes), Apple fallback ---
    const sleepDurationMinutes = pickFirst(
      sourced(
        ouraSleep?.total_sleep_duration && ouraSleep.total_sleep_duration > 0
          ? Math.round(ouraSleep.total_sleep_duration / 60)
          : null,
        'oura',
      ),
      sourced(apple?.sleepDuration && apple.sleepDuration > 0 ? apple.sleepDuration : null, 'apple_health'),
    );

    // --- Sleep Score: Oura only ---
    const sleepScore = sourced(ouraSleepD?.score ?? null, 'oura');

    // --- Sleep Stages: Oura primary (seconds->minutes), Apple fallback ---
    const sleepDeepMinutes = pickFirst(
      sourced(
        ouraSleep?.deep_sleep_duration && ouraSleep.deep_sleep_duration > 0
          ? Math.round(ouraSleep.deep_sleep_duration / 60)
          : null,
        'oura',
      ),
      sourced(apple?.sleepDeep && apple.sleepDeep > 0 ? apple.sleepDeep : null, 'apple_health'),
    );

    const sleepREMMinutes = pickFirst(
      sourced(
        ouraSleep?.rem_sleep_duration && ouraSleep.rem_sleep_duration > 0
          ? Math.round(ouraSleep.rem_sleep_duration / 60)
          : null,
        'oura',
      ),
      sourced(apple?.sleepREM && apple.sleepREM > 0 ? apple.sleepREM : null, 'apple_health'),
    );

    const sleepLightMinutes = pickFirst(
      sourced(
        ouraSleep?.light_sleep_duration && ouraSleep.light_sleep_duration > 0
          ? Math.round(ouraSleep.light_sleep_duration / 60)
          : null,
        'oura',
      ),
      sourced(apple?.sleepCore && apple.sleepCore > 0 ? apple.sleepCore : null, 'apple_health'),
    );

    const sleepAwakeMinutes = pickFirst(
      sourced(
        ouraSleep?.awake_time && ouraSleep.awake_time > 0
          ? Math.round(ouraSleep.awake_time / 60)
          : null,
        'oura',
      ),
      sourced(apple?.sleepAwake && apple.sleepAwake > 0 ? apple.sleepAwake : null, 'apple_health'),
    );

    // --- Sleep Efficiency: Oura only ---
    const sleepEfficiency = sourced(
      ouraSleep?.efficiency && ouraSleep.efficiency > 0 ? ouraSleep.efficiency : null,
      'oura',
    );

    // --- Respiratory Rate: Oura primary (sleep), Apple fallback ---
    const respiratoryRate = pickFirst(
      sourced(ouraSleep?.average_breath ? roundVal(ouraSleep.average_breath) : null, 'oura'),
      sourced(roundVal(apple?.respiratoryRate), 'apple_health'),
    );

    // --- SpO2: Oura primary, Apple fallback ---
    const oxygenSaturation = pickFirst(
      sourced(ouraSpO2?.spo2_percentage?.average ? roundVal(ouraSpO2.spo2_percentage.average) : null, 'oura'),
      sourced(roundVal(apple?.oxygenSaturation), 'apple_health'),
    );

    // --- Breathing Disturbance: Oura only ---
    const breathingDisturbanceIndex = sourced(ouraSpO2?.breathing_disturbance_index ?? null, 'oura');

    // --- Readiness: Oura only ---
    const readinessScore = sourced(ouraReady?.score ?? null, 'oura');

    // --- Temperature Deviation: Oura only ---
    const temperatureDeviation = sourced(
      ouraReady?.temperature_deviation !== null && ouraReady?.temperature_deviation !== undefined
        ? roundVal(ouraReady.temperature_deviation, 2)
        : null,
      'oura',
    );

    // --- VO2 Max: Apple only ---
    const vo2Max = sourced(roundVal(apple?.vo2Max), 'apple_health');

    // --- Wrist Temperature: Apple only ---
    const wristTemperature = sourced(roundVal(apple?.wristTemperature, 2), 'apple_health');

    // Track source usage
    const metrics: [string, Sourced<unknown> | null][] = [
      ['steps', steps], ['activeCalories', activeCalories], ['distanceMeters', distanceMeters],
      ['exerciseMinutes', exerciseMinutes], ['restingHeartRate', restingHeartRate],
      ['avgHeartRate', avgHeartRate], ['hrv', hrv], ['sleepDurationMinutes', sleepDurationMinutes],
      ['sleepScore', sleepScore], ['sleepDeepMinutes', sleepDeepMinutes],
      ['sleepREMMinutes', sleepREMMinutes], ['sleepLightMinutes', sleepLightMinutes],
      ['sleepAwakeMinutes', sleepAwakeMinutes], ['sleepEfficiency', sleepEfficiency],
      ['respiratoryRate', respiratoryRate], ['oxygenSaturation', oxygenSaturation],
      ['breathingDisturbanceIndex', breathingDisturbanceIndex],
      ['readinessScore', readinessScore], ['temperatureDeviation', temperatureDeviation],
      ['vo2Max', vo2Max], ['wristTemperature', wristTemperature],
    ];

    for (const [name, val] of metrics) {
      if (val) track(name, val.source);
    }

    unified.push({
      date,
      steps, activeCalories, distanceMeters, exerciseMinutes,
      restingHeartRate, avgHeartRate, hrv,
      sleepDurationMinutes, sleepScore, sleepDeepMinutes, sleepREMMinutes,
      sleepLightMinutes, sleepAwakeMinutes, sleepEfficiency,
      respiratoryRate, oxygenSaturation, breathingDisturbanceIndex,
      readinessScore, temperatureDeviation,
      vo2Max, wristTemperature,
    });
  }

  // Output
  const outputDir = path.join(DATA_DIR, 'unified');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'daily.json');
  fs.writeFileSync(outputPath, JSON.stringify({ data: unified }, null, 2));

  console.log(`Saved ${unified.length} unified daily records to ${outputPath}\n`);

  // Print source usage report
  console.log('=== Source Usage Report ===\n');
  const metricOrder = [
    'steps', 'activeCalories', 'distanceMeters', 'exerciseMinutes',
    'restingHeartRate', 'avgHeartRate', 'hrv',
    'sleepDurationMinutes', 'sleepScore', 'sleepDeepMinutes', 'sleepREMMinutes',
    'sleepLightMinutes', 'sleepAwakeMinutes', 'sleepEfficiency',
    'respiratoryRate', 'oxygenSaturation', 'breathingDisturbanceIndex',
    'readinessScore', 'temperatureDeviation',
    'vo2Max', 'wristTemperature',
  ];

  for (const metric of metricOrder) {
    const counts = sourceCounters[metric] || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) {
      console.log(`  ${metric}: no data`);
      continue;
    }
    const parts = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([src, n]) => `${src}: ${n} (${Math.round(n / total * 100)}%)`);
    console.log(`  ${metric}: ${total} days — ${parts.join(', ')}`);
  }
}

main();
