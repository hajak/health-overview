import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getActivities, isTokenExpired, refreshStravaToken } from '@/lib/strava/stravaClient';
import { syncActivities, updateLastSync } from '@/Helpers/stravaHelper';
import { StravaSyncResult } from '@/types/strava';

interface SyncResponse {
  result?: StravaSyncResult;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const stravaAccount = (session as any).stravaAccount;

  if (!stravaAccount?.access_token) {
    return res.status(400).json({ error: 'Strava not connected' });
  }

  try {
    let accessToken = stravaAccount.access_token;

    if (isTokenExpired(stravaAccount.expires_at)) {
      const newTokens = await refreshStravaToken(stravaAccount.refresh_token);
      accessToken = newTokens.access_token;
    }

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

    const allActivities = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const activities = await getActivities(accessToken, {
        after: thirtyDaysAgo,
        page,
        per_page: perPage,
      });

      allActivities.push(...activities);

      if (activities.length < perPage) break;
      page++;
      if (page > 5) break;
    }

    const result = await syncActivities(session.user.email, allActivities);
    await updateLastSync(session.user.email);

    return res.status(200).json({ result });
  } catch (error) {
    console.error('Error syncing Strava activities:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to sync activities',
    });
  }
}
