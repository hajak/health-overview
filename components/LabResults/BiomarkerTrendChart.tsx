import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { TestHistoryPoint, ReferenceRange } from '@/types/labResults';

interface BiomarkerTrendChartProps {
  testName: string;
  history: TestHistoryPoint[];
  unit: string;
  referenceRange?: ReferenceRange;
  height?: number;
}

export default function BiomarkerTrendChart({
  testName,
  history,
  unit,
  referenceRange,
  height = 200,
}: BiomarkerTrendChartProps) {
  const chartData = useMemo(() => {
    const numericHistory = history.filter(
      (h) => typeof h.value === 'number'
    ) as (TestHistoryPoint & { value: number })[];

    if (numericHistory.length === 0) return null;

    return [
      {
        id: testName,
        data: numericHistory.map((h) => ({
          x: h.date.toISOString().split('T')[0],
          y: h.value,
          status: h.status,
        })),
      },
    ];
  }, [testName, history]);

  const { yMin, yMax } = useMemo(() => {
    const values = history
      .map((h) => h.value)
      .filter((v) => typeof v === 'number') as number[];

    if (values.length === 0) return { yMin: 0, yMax: 100 };

    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    const refMin = referenceRange?.min;
    const refMax = referenceRange?.max;

    const allMin = Math.min(dataMin, refMin ?? dataMin);
    const allMax = Math.max(dataMax, refMax ?? dataMax);

    const padding = (allMax - allMin) * 0.1;

    return {
      yMin: Math.max(0, allMin - padding),
      yMax: allMax + padding,
    };
  }, [history, referenceRange]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No numeric data available
      </div>
    );
  }

  const markers: Array<{
    axis: 'y';
    value: number;
    lineStyle: { stroke: string; strokeWidth: number; strokeDasharray?: string };
  }> = [];

  if (referenceRange?.min !== undefined) {
    markers.push({
      axis: 'y',
      value: referenceRange.min,
      lineStyle: { stroke: '#86efac', strokeWidth: 2, strokeDasharray: '4 4' },
    });
  }

  if (referenceRange?.max !== undefined) {
    markers.push({
      axis: 'y',
      value: referenceRange.max,
      lineStyle: { stroke: '#86efac', strokeWidth: 2, strokeDasharray: '4 4' },
    });
  }

  return (
    <div className="w-full" style={{ height }}>
      <div className="text-sm font-medium text-gray-700 mb-2">
        {testName} ({unit})
      </div>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: yMin,
          max: yMax,
          stacked: false,
          reverse: false,
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          format: (value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
            });
          },
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        colors={{ scheme: 'category10' }}
        pointSize={10}
        pointColor={(point: { data: { status?: string } }) => {
          const status = point.data.status;
          if (status === 'normal') return '#22c55e';
          if (status === 'critical') return '#ef4444';
          return '#f59e0b';
        }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        enableArea={false}
        enableGridX={false}
        enableGridY={true}
        useMesh={true}
        markers={markers}
        tooltip={({ point }) => {
          const data = point.data as unknown as { x: string; y: number; status: string };
          return (
            <div className="bg-white px-3 py-2 shadow-lg rounded-lg border">
              <div className="text-sm font-medium">{data.y} {unit}</div>
              <div className="text-xs text-gray-500">{data.x}</div>
              <div
                className={`text-xs font-medium ${
                  data.status === 'normal'
                    ? 'text-green-600'
                    : data.status === 'critical'
                    ? 'text-red-600'
                    : 'text-orange-600'
                }`}
              >
                {data.status}
              </div>
            </div>
          );
        }}
      />
      {referenceRange && (
        <div className="text-xs text-gray-500 text-center mt-1">
          Reference: {referenceRange.displayText}
        </div>
      )}
    </div>
  );
}
