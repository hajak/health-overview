import React from 'react';
import { ReferenceRange, ResultStatus } from '@/types/labResults';

interface ReferenceRangeIndicatorProps {
  value: number;
  referenceRange: ReferenceRange;
  status: ResultStatus;
  unit?: string;
}

export default function ReferenceRangeIndicator({
  value,
  referenceRange,
  status,
  unit,
}: ReferenceRangeIndicatorProps) {
  const { min, max } = referenceRange;

  if (min === undefined && max === undefined) {
    return (
      <div className="text-sm text-gray-500">
        {value} {unit}
      </div>
    );
  }

  const rangeMin = min ?? (max ? max * 0.5 : 0);
  const rangeMax = max ?? (min ? min * 2 : 100);
  const rangeSpan = rangeMax - rangeMin;
  const padding = rangeSpan * 0.2;

  const displayMin = rangeMin - padding;
  const displayMax = rangeMax + padding;
  const displaySpan = displayMax - displayMin;

  const valuePercent = Math.min(
    100,
    Math.max(0, ((value - displayMin) / displaySpan) * 100)
  );

  const rangeStartPercent = ((rangeMin - displayMin) / displaySpan) * 100;
  const rangeEndPercent = ((rangeMax - displayMin) / displaySpan) * 100;
  const rangeWidthPercent = rangeEndPercent - rangeStartPercent;

  const dotColor =
    status === 'normal'
      ? 'bg-green-500'
      : status === 'critical'
      ? 'bg-red-500'
      : 'bg-yellow-500';

  return (
    <div className="w-full">
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-green-200"
          style={{
            left: `${rangeStartPercent}%`,
            width: `${rangeWidthPercent}%`,
          }}
        />
        <div
          className={`absolute w-3 h-3 rounded-full ${dotColor} -top-0.5 transform -translate-x-1/2`}
          style={{ left: `${valuePercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min !== undefined ? min : ''}</span>
        <span className="font-medium text-gray-700">
          {value} {unit}
        </span>
        <span>{max !== undefined ? max : ''}</span>
      </div>
    </div>
  );
}
