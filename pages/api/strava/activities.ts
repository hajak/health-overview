import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getActivities, isTokenExpired, refreshStravaToken } from '@/lib/strava/stravaClient';
import { StravaActivity } from '@/types/strava';

interface ActivitiesResponse {
  activities?: StravaActivity[];
  error?: string;
  connected?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActivitiesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const stravaAccount = (session as any).stravaAccount;

  if (!stravaAccount?.access_token) {
    return res.status(200).json({ connected: false, activities: [] });
  }

  try {
    let accessToken = stravaAccount.access_token;

    if (isTokenExpired(stravaAccount.expires_at)) {
      const newTokens = await refreshStravaToken(stravaAccount.refresh_token);
      accessToken = newTokens.access_token;
    }

    const { after, before, page, per_page } = req.query;

    const activities = await getActivities(accessToken, {
      after: after ? parseInt(after as string) : undefined,
      before: before ? parseInt(before as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      per_page: per_page ? parseInt(per_page as string) : 30,
    });

    return res.status(200).json({ connected: true, activities });
  } catch (error) {
    console.error('Error fetching Strava activities:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch activities',
    });
  }
}
