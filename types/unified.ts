/** Source identifier for tracking data provenance */
export type DataSource = 'apple_health' | 'oura' | 'strava' | 'lab_results';

/** A value with its source tracked */
export interface Sourced<T> {
  value: T;
  source: DataSource;
}

/** Unified daily health record merging all data sources */
export interface UnifiedDailyRecord {
  date: string;

  // Activity
  steps: Sourced<number> | null;
  activeCalories: Sourced<number> | null;
  distanceMeters: Sourced<number> | null;
  exerciseMinutes: Sourced<number> | null;

  // Heart
  restingHeartRate: Sourced<number> | null;
  avgHeartRate: Sourced<number> | null;
  hrv: Sourced<number> | null; // ms (SDNN)

  // Sleep
  sleepDurationMinutes: Sourced<number> | null;
  sleepScore: Sourced<number> | null; // 0-100 (Oura only)
  sleepDeepMinutes: Sourced<number> | null;
  sleepREMMinutes: Sourced<number> | null;
  sleepLightMinutes: Sourced<number> | null;
  sleepAwakeMinutes: Sourced<number> | null;
  sleepEfficiency: Sourced<number> | null; // percentage

  // Respiratory & Blood
  respiratoryRate: Sourced<number> | null;
  oxygenSaturation: Sourced<number> | null; // percentage
  breathingDisturbanceIndex: Sourced<number> | null;

  // Recovery & Readiness
  readinessScore: Sourced<number> | null; // 0-100 (Oura)
  temperatureDeviation: Sourced<number> | null; // degrees C

  // Fitness
  vo2Max: Sourced<number> | null;

  // Body
  wristTemperature: Sourced<number> | null;
}

/** Source priority configuration per metric */
export interface SourcePriority {
  metric: string;
  primary: DataSource;
  fallback: DataSource[];
  reason: string;
}

/** The source priority map used by the mapping layer */
export const SOURCE_PRIORITIES: SourcePriority[] = [
  {
    metric: 'steps',
    primary: 'apple_health',
    fallback: ['oura'],
    reason: 'Apple Watch captures all-day motion; Oura ring may undercount',
  },
  {
    metric: 'activeCalories',
    primary: 'apple_health',
    fallback: ['oura'],
    reason: 'Apple Watch has continuous HR-based calorie tracking',
  },
  {
    metric: 'distanceMeters',
    primary: 'apple_health',
    fallback: ['oura'],
    reason: 'Apple Watch has GPS for more accurate distance',
  },
  {
    metric: 'exerciseMinutes',
    primary: 'apple_health',
    fallback: ['oura'],
    reason: 'Apple Watch has dedicated exercise detection',
  },
  {
    metric: 'restingHeartRate',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura measures overnight resting HR more accurately',
  },
  {
    metric: 'avgHeartRate',
    primary: 'apple_health',
    fallback: ['oura'],
    reason: 'Apple Watch has continuous daytime HR monitoring',
  },
  {
    metric: 'hrv',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura measures HRV during sleep for consistent baseline',
  },
  {
    metric: 'sleepDurationMinutes',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura is a dedicated sleep tracker with finger PPG',
  },
  {
    metric: 'sleepScore',
    primary: 'oura',
    fallback: [],
    reason: 'Oura-exclusive composite sleep quality score',
  },
  {
    metric: 'sleepDeepMinutes',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura has validated sleep staging from finger PPG',
  },
  {
    metric: 'sleepREMMinutes',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura has validated sleep staging from finger PPG',
  },
  {
    metric: 'sleepLightMinutes',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura has validated sleep staging from finger PPG',
  },
  {
    metric: 'sleepAwakeMinutes',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura awake detection during sleep is more accurate',
  },
  {
    metric: 'sleepEfficiency',
    primary: 'oura',
    fallback: [],
    reason: 'Oura-exclusive sleep efficiency metric',
  },
  {
    metric: 'respiratoryRate',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura measures respiratory rate during sleep consistently',
  },
  {
    metric: 'oxygenSaturation',
    primary: 'oura',
    fallback: ['apple_health'],
    reason: 'Oura SpO2 measured during sleep for consistent baseline',
  },
  {
    metric: 'breathingDisturbanceIndex',
    primary: 'oura',
    fallback: [],
    reason: 'Oura-exclusive breathing disturbance metric',
  },
  {
    metric: 'readinessScore',
    primary: 'oura',
    fallback: [],
    reason: 'Oura-exclusive readiness/recovery score',
  },
  {
    metric: 'temperatureDeviation',
    primary: 'oura',
    fallback: [],
    reason: 'Oura-exclusive skin temperature deviation',
  },
  {
    metric: 'vo2Max',
    primary: 'apple_health',
    fallback: [],
    reason: 'Apple Watch VO2 Max estimation from walking/running',
  },
  {
    metric: 'wristTemperature',
    primary: 'apple_health',
    fallback: [],
    reason: 'Apple Watch sleeping wrist temperature',
  },
];
