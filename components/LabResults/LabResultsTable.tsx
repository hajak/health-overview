import React from 'react';
import { LabReport, LabResultValue } from '@/types/labResults';
import StatusBadge from './StatusBadge';
import ReferenceRangeIndicator from './ReferenceRangeIndicator';

interface LabResultsTableProps {
  report: LabReport;
  onSelectTest?: (result: LabResultValue) => void;
}

export default function LabResultsTable({
  report,
  onSelectTest,
}: LabResultsTableProps) {
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const sourceLabel = {
    werlabs: 'Werlabs',
    hospital: 'Hospital',
    manual: 'Manual Entry',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">{formatDate(report.date)}</h3>
          <span className="text-sm text-gray-500">
            {sourceLabel[report.source]}
            {report.sourceFileName && ` - ${report.sourceFileName}`}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {report.results.map((result) => (
          <div
            key={result.id}
            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onSelectTest?.(result)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">
                  {result.testName}
                </div>
                <div className="text-sm text-gray-500">{result.category}</div>
              </div>

              <div className="flex-shrink-0 w-48">
                {typeof result.value === 'number' ? (
                  <ReferenceRangeIndicator
                    value={result.value}
                    referenceRange={result.referenceRange}
                    status={result.status}
                    unit={result.unit}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-700">
                    {result.value} {result.unit}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <StatusBadge status={result.status} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
        {report.results.length} tests |{' '}
        {report.results.filter((r) => r.status !== 'normal').length} out of range
      </div>
    </div>
  );
}
