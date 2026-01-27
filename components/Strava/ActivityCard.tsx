import {
  StravaActivityFirestore,
  formatDistance,
  formatDuration,
  formatPace,
  getActivityIcon,
  ACTIVITY_TYPE_DISPLAY,
} from '@/types/strava';

interface ActivityCardProps {
  activity: StravaActivityFirestore;
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const date = new Date(activity.start_date_local);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const activityTypeName =
    ACTIVITY_TYPE_DISPLAY[activity.type] || activity.type;

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getActivityIcon(activity.type)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {activity.name}
            </h3>
            <p className="text-sm text-gray-500">
              {activityTypeName} • {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Distance</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDistance(activity.distance)} km
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDuration(activity.moving_time)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pace</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatPace(activity.average_speed, activity.type)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Elevation</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(activity.total_elevation_gain)} m
          </p>
        </div>
      </div>

      {(activity.average_heartrate || activity.calories) && (
        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          {activity.average_heartrate && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg HR</p>
              <p className="text-lg font-semibold text-gray-900">
                {Math.round(activity.average_heartrate)} bpm
              </p>
            </div>
          )}
          {activity.max_heartrate && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Max HR</p>
              <p className="text-lg font-semibold text-gray-900">
                {Math.round(activity.max_heartrate)} bpm
              </p>
            </div>
          )}
          {activity.calories && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Calories</p>
              <p className="text-lg font-semibold text-gray-900">
                {activity.calories} kcal
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
