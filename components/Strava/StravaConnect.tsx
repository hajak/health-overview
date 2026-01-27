import { signIn } from 'next-auth/react';
import { useState } from 'react';

interface StravaConnectProps {
  isConnected: boolean;
  athleteName?: string;
  onDisconnect: () => void;
}

export default function StravaConnect({
  isConnected,
  athleteName,
  onDisconnect,
}: StravaConnectProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    await signIn('strava', { callbackUrl: '/strava' });
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    await onDisconnect();
    setIsLoading(false);
  };

  if (isConnected) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Strava Connected</h3>
              {athleteName && (
                <p className="text-sm text-gray-500">Logged in as {athleteName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-gray-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Connect Strava</h3>
            <p className="text-sm text-gray-500">
              Sync your running, cycling, and other activities
            </p>
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="px-4 py-2 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  );
}
