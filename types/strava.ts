export type ActivityType =
  | 'Run'
  | 'Ride'
  | 'Swim'
  | 'Walk'
  | 'Hike'
  | 'Workout'
  | 'WeightTraining'
  | 'Yoga'
  | 'VirtualRide'
  | 'VirtualRun'
  | string;

export interface StravaActivity {
  id: number;
  name: string;
  type: ActivityType;
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
  suffer_score?: number;
  map?: {
    id: string;
    summary_polyline: string;
    polyline?: string;
  };
}

export interface StravaActivityFirestore {
  id: number;
  name: string;
  type: ActivityType;
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
  suffer_score?: number;
  summary_polyline?: string;
}

export interface StravaProfile {
  athlete_id: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  connected_at: string;
  last_sync: string;
}

export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  city?: string;
  country?: string;
  profile?: string;
  profile_medium?: string;
}

export interface StravaSyncResult {
  synced: number;
  skipped: number;
  total: number;
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function convertActivityToFirestore(
  activity: StravaActivity
): StravaActivityFirestore {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    sport_type: activity.sport_type,
    distance: activity.distance,
    moving_time: activity.moving_time,
    elapsed_time: activity.elapsed_time,
    total_elevation_gain: activity.total_elevation_gain,
    start_date: activity.start_date,
    start_date_local: activity.start_date_local,
    timezone: activity.timezone,
    average_speed: activity.average_speed,
    max_speed: activity.max_speed,
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    calories: activity.calories,
    suffer_score: activity.suffer_score,
    summary_polyline: activity.map?.summary_polyline,
  };
}

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 10 ? km.toFixed(2) : km.toFixed(1);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatPace(metersPerSecond: number, type: ActivityType): string {
  if (type === 'Ride' || type === 'VirtualRide') {
    const kmh = metersPerSecond * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  }

  if (metersPerSecond === 0) return '-';
  const minPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

export function getActivityIcon(type: ActivityType): string {
  const iconMap: Record<string, string> = {
    Run: '🏃',
    VirtualRun: '🏃',
    Ride: '🚴',
    VirtualRide: '🚴',
    Swim: '🏊',
    Walk: '🚶',
    Hike: '🥾',
    Workout: '💪',
    WeightTraining: '🏋️',
    Yoga: '🧘',
  };
  return iconMap[type] || '🏃';
}

export const ACTIVITY_TYPE_DISPLAY: Record<string, string> = {
  Run: 'Run',
  VirtualRun: 'Virtual Run',
  Ride: 'Ride',
  VirtualRide: 'Virtual Ride',
  Swim: 'Swim',
  Walk: 'Walk',
  Hike: 'Hike',
  Workout: 'Workout',
  WeightTraining: 'Weight Training',
  Yoga: 'Yoga',
};
