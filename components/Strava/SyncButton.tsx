import { useState } from 'react';
import { StravaSyncResult } from '@/types/strava';

interface SyncButtonProps {
  onSync: () => Promise<StravaSyncResult | null>;
  lastSync?: string;
}

export default function SyncButton({ onSync, lastSync }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<StravaSyncResult | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    const syncResult = await onSync();
    setResult(syncResult);
    setIsSyncing(false);

    if (syncResult) {
      setTimeout(() => setResult(null), 5000);
    }
  };

  const formatLastSync = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-4">
      {lastSync && (
        <p className="text-sm text-gray-500">
          Last synced: {formatLastSync(lastSync)}
        </p>
      )}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {isSyncing ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Sync Activities
          </>
        )}
      </button>
      {result && (
        <span className="text-sm text-green-600">
          Synced {result.synced} new activities
        </span>
      )}
    </div>
  );
}
