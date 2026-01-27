import { WeeklyStats } from '@/Helpers/stravaHelper';
import { formatDistance, formatDuration, ACTIVITY_TYPE_DISPLAY } from '@/types/strava';

interface ActivityStatsProps {
  stats: WeeklyStats;
  isLoading?: boolean;
}

export default function ActivityStats({ stats, isLoading }: ActivityStatsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-gray-200 rounded"></div>
              <div className="h-6 w-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">This Week</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Activities</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activityCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Distance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDistance(stats.totalDistance)} km
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDuration(stats.totalDuration)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Calories</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalCalories.toLocaleString()} kcal
          </p>
        </div>
      </div>

      {Object.keys(stats.byType).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Activity Type</h4>
          <div className="space-y-2">
            {Object.entries(stats.byType).map(([type, data]) => (
              <div
                key={type}
                className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-gray-700">
                  {ACTIVITY_TYPE_DISPLAY[type] || type}
                </span>
                <div className="flex items-center gap-4 text-gray-500">
                  <span>{data.count}x</span>
                  <span>{formatDistance(data.distance)} km</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
