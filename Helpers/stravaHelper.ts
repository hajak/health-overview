import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  StravaActivity,
  StravaActivityFirestore,
  StravaProfile,
  StravaSyncResult,
  convertActivityToFirestore,
} from '@/types/strava';

export async function syncActivities(
  userEmail: string,
  activities: StravaActivity[]
): Promise<StravaSyncResult> {
  const userRef = doc(db, 'users', userEmail);
  const userDoc = await getDoc(userRef);

  let existingActivities: StravaActivityFirestore[] = [];

  if (userDoc.exists()) {
    const userData = userDoc.data();
    existingActivities = userData.stravaActivities || [];
  }

  const existingIds = new Set(existingActivities.map((a) => a.id));
  const newActivities = activities.filter((a) => !existingIds.has(a.id));

  const newFirestoreActivities = newActivities.map(convertActivityToFirestore);
  const mergedActivities = [...existingActivities, ...newFirestoreActivities];

  mergedActivities.sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  await updateDoc(userRef, {
    stravaActivities: mergedActivities,
  });

  return {
    synced: newActivities.length,
    skipped: activities.length - newActivities.length,
    total: mergedActivities.length,
  };
}

export async function getStravaActivities(
  userEmail: string,
  options?: { limit?: number; type?: string }
): Promise<StravaActivityFirestore[]> {
  const userRef = doc(db, 'users', userEmail);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return [];
  }

  const userData = userDoc.data();
  let activities = (userData.stravaActivities || []) as StravaActivityFirestore[];

  if (options?.type) {
    activities = activities.filter((a) => a.type === options.type);
  }

  if (options?.limit) {
    activities = activities.slice(0, options.limit);
  }

  return activities;
}

export async function getStravaProfile(
  userEmail: string
): Promise<StravaProfile | null> {
  const userRef = doc(db, 'users', userEmail);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  const userData = userDoc.data();
  return userData.stravaProfile || null;
}

export async function saveStravaProfile(
  userEmail: string,
  profile: StravaProfile
): Promise<void> {
  const userRef = doc(db, 'users', userEmail);
  await updateDoc(userRef, {
    stravaProfile: profile,
  });
}

export async function updateLastSync(userEmail: string): Promise<void> {
  const userRef = doc(db, 'users', userEmail);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return;
  }

  const userData = userDoc.data();
  const profile = userData.stravaProfile;

  if (profile) {
    await updateDoc(userRef, {
      stravaProfile: {
        ...profile,
        last_sync: new Date().toISOString(),
      },
    });
  }
}

export async function disconnectStrava(userEmail: string): Promise<void> {
  const userRef = doc(db, 'users', userEmail);
  await updateDoc(userRef, {
    stravaProfile: null,
    stravaActivities: [],
  });
}

export interface WeeklyStats {
  totalDistance: number;
  totalDuration: number;
  activityCount: number;
  totalCalories: number;
  byType: Record<string, { distance: number; duration: number; count: number }>;
}

export function calculateWeeklyStats(
  activities: StravaActivityFirestore[]
): WeeklyStats {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekActivities = activities.filter(
    (a) => new Date(a.start_date) >= weekStart
  );

  const stats: WeeklyStats = {
    totalDistance: 0,
    totalDuration: 0,
    activityCount: weekActivities.length,
    totalCalories: 0,
    byType: {},
  };

  for (const activity of weekActivities) {
    stats.totalDistance += activity.distance;
    stats.totalDuration += activity.moving_time;
    stats.totalCalories += activity.calories || 0;

    if (!stats.byType[activity.type]) {
      stats.byType[activity.type] = { distance: 0, duration: 0, count: 0 };
    }
    stats.byType[activity.type].distance += activity.distance;
    stats.byType[activity.type].duration += activity.moving_time;
    stats.byType[activity.type].count += 1;
  }

  return stats;
}
