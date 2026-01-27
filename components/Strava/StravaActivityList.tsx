import { StravaActivityFirestore } from '@/types/strava';
import ActivityCard from './ActivityCard';

interface StravaActivityListProps {
  activities: StravaActivityFirestore[];
  isLoading?: boolean;
}

export default function StravaActivityList({
  activities,
  isLoading,
}: StravaActivityListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-12 bg-gray-200 rounded"></div>
                  <div className="h-5 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">No activities found.</p>
        <p className="text-sm text-gray-400 mt-1">
          Sync your Strava account to see your activities here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
