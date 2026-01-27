import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useState } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ResponsiveLine } from '@nivo/line';
import { LabCategory, ResultStatus, CATEGORY_DISPLAY_NAMES } from '../types/labResults';

interface LabResult {
  testName: string;
  standardizedName: string;
  value: number | string;
  unit: string;
  referenceRange: {
    min?: number;
    max?: number;
    displayText: string;
  };
  status: ResultStatus;
  category: LabCategory;
}

interface LabReport {
  date: string;
  results: LabResult[];
}

interface TestTrend {
  name: string;
  standardizedName: string;
  unit: string;
  category: LabCategory;
  referenceRange: { min?: number; max?: number; displayText: string };
  history: { date: string; value: number; status: ResultStatus }[];
  latestValue: number;
  latestStatus: ResultStatus;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface Props {
  reports: LabReport[];
  testTrends: TestTrend[];
  recentAbnormal: TestTrend[];
  availableYears: string[];
}

const STATUS_COLORS: Record<ResultStatus, string> = {
  normal: 'bg-green-100 text-green-800',
  low: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const STATUS_BG: Record<ResultStatus, string> = {
  normal: '#22c55e',
  low: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const labPath = path.join(process.cwd(), 'DATA', 'lab_results.json');

  let reports: LabReport[] = [];
  if (fs.existsSync(labPath)) {
    const data = JSON.parse(fs.readFileSync(labPath, 'utf-8'));
    reports = data.reports || [];
  }

  const testMap = new Map<string, TestTrend>();
  for (const report of reports) {
    for (const result of report.results) {
      if (typeof result.value !== 'number') continue;

      if (!testMap.has(result.standardizedName)) {
        testMap.set(result.standardizedName, {
          name: result.testName,
          standardizedName: result.standardizedName,
          unit: result.unit,
          category: result.category,
          referenceRange: result.referenceRange,
          history: [],
          latestValue: 0,
          latestStatus: 'normal',
          trend: 'stable',
          changePercent: 0,
        });
      }
      testMap.get(result.standardizedName)!.history.push({
        date: report.date,
        value: result.value,
        status: result.status,
      });
    }
  }

  const testTrends: TestTrend[] = [];
  for (const [, test] of testMap) {
    if (test.history.length < 1) continue;

    test.history.sort((a, b) => a.date.localeCompare(b.date));
    const latest = test.history[test.history.length - 1];
    test.latestValue = latest.value;
    test.latestStatus = latest.status;

    if (test.history.length >= 2) {
      const prev = test.history[test.history.length - 2];
      const change = ((latest.value - prev.value) / prev.value) * 100;
      test.changePercent = Math.round(change * 10) / 10;
      test.trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    }

    testTrends.push(test);
  }

  const recentAbnormal = testTrends
    .filter((t) => t.latestStatus !== 'normal')
    .sort((a, b) => {
      const statusOrder = { critical: 0, high: 1, low: 2, normal: 3 };
      return statusOrder[a.latestStatus] - statusOrder[b.latestStatus];
    });

  const availableYears = Array.from(new Set(reports.map((r) => r.date.slice(0, 4))))
    .sort()
    .reverse();

  return {
    props: {
      reports,
      testTrends: testTrends.sort((a, b) => a.name.localeCompare(b.name)),
      recentAbnormal,
      availableYears,
    },
  };
};

export default function LabResultsPage({
  reports,
  testTrends,
  recentAbnormal,
  availableYears,
}: Props) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(testTrends.map((t) => t.category)));

  const filteredTests = testTrends.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    return true;
  });

  const selectedTestData = selectedTest
    ? testTrends.find((t) => t.standardizedName === selectedTest)
    : null;

  const today = new Date().toISOString().slice(0, 10);

  // Calculate days since last test
  const lastTestDate = selectedTestData?.history[selectedTestData.history.length - 1]?.date;
  const daysSinceLastTest = lastTestDate
    ? Math.floor((new Date().getTime() - new Date(lastTestDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Build chart data for time-proportional line chart
  const lineChartData = selectedTestData
    ? [{
        id: selectedTestData.name,
        data: [
          ...selectedTestData.history.map((h) => ({
            x: h.date,
            y: h.value,
            status: h.status,
          })),
          // Add today as endpoint (null value, just extends x-axis)
          {
            x: today,
            y: null,
            status: 'normal' as ResultStatus,
          },
        ].filter(d => d.y !== null),
      }]
    : [];

  // Get date range for x-axis
  const firstDate = selectedTestData?.history[0]?.date || today;

  const latestReport = reports[0];

  return (
    <div className="grow p-4">
      <Head>
        <title>Lab Results - Health Overview</title>
      </Head>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
            <p className="text-gray-500 text-sm">
              {reports.length} reports • Latest: {latestReport?.date || 'None'}
            </p>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="mt-4 md:mt-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_DISPLAY_NAMES[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Alerts - Recent Abnormal Results */}
        {recentAbnormal.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-orange-800 mb-3">
              Recent Abnormal Results ({recentAbnormal.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentAbnormal.map((test) => (
                <button
                  key={test.standardizedName}
                  onClick={() => setSelectedTest(test.standardizedName)}
                  className="flex justify-between items-center p-3 bg-white rounded-lg border border-orange-200 hover:shadow-md transition-shadow text-left"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{test.name}</p>
                    <p className="text-xs text-gray-500">{test.referenceRange.displayText}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${STATUS_COLORS[test.latestStatus]}`}>
                      {test.latestValue} {test.unit}
                    </span>
                    {test.trend !== 'stable' && (
                      <p className={`text-xs mt-1 ${test.trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                        {test.trend === 'up' ? '↑' : '↓'} {Math.abs(test.changePercent)}%
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Test Chart */}
        {selectedTestData && (
          <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">{selectedTestData.name}</h2>
                <p className="text-sm text-gray-500">
                  Reference: {selectedTestData.referenceRange.displayText}
                </p>
                <div className="flex gap-4 mt-2">
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${STATUS_COLORS[selectedTestData.latestStatus]}`}>
                    Latest: {selectedTestData.latestValue} {selectedTestData.unit}
                  </span>
                  {selectedTestData.trend !== 'stable' && (
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      selectedTestData.trend === 'up' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedTestData.trend === 'up' ? '↑' : '↓'} {Math.abs(selectedTestData.changePercent)}% from previous
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div className="h-64">
              <ResponsiveLine
                data={lineChartData}
                margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
                xScale={{
                  type: 'time',
                  format: '%Y-%m-%d',
                  precision: 'day',
                  min: firstDate,
                  max: today,
                }}
                xFormat="time:%Y-%m-%d"
                yScale={{
                  type: 'linear',
                  min: 'auto',
                  max: 'auto',
                }}
                axisBottom={{
                  format: '%b %y',
                  tickRotation: -45,
                  legend: 'Date',
                  legendPosition: 'middle',
                  legendOffset: 50,
                }}
                axisLeft={{
                  legend: selectedTestData.unit,
                  legendPosition: 'middle',
                  legendOffset: -50,
                }}
                colors={(d) => STATUS_BG[selectedTestData.latestStatus] || '#6b7280'}
                pointSize={10}
                pointColor={(d) => STATUS_BG[(d.data as any).status] || '#6b7280'}
                pointBorderWidth={2}
                pointBorderColor="#fff"
                enableArea={true}
                areaOpacity={0.1}
                useMesh={true}
                markers={[
                  ...(selectedTestData.referenceRange.min !== undefined
                    ? [{
                        axis: 'y' as const,
                        value: selectedTestData.referenceRange.min,
                        lineStyle: { stroke: '#22c55e', strokeWidth: 2, strokeDasharray: '4 4' },
                        legend: 'Min',
                        legendPosition: 'right' as const,
                      }]
                    : []),
                  ...(selectedTestData.referenceRange.max !== undefined
                    ? [{
                        axis: 'y' as const,
                        value: selectedTestData.referenceRange.max,
                        lineStyle: { stroke: '#22c55e', strokeWidth: 2, strokeDasharray: '4 4' },
                        legend: 'Max',
                        legendPosition: 'right' as const,
                      }]
                    : []),
                ]}
              />
            </div>
            <div className="mt-4 text-sm text-gray-500 flex justify-between">
              <p>{selectedTestData.history.length} measurements from {selectedTestData.history[0]?.date} to {selectedTestData.history[selectedTestData.history.length - 1]?.date}</p>
              {daysSinceLastTest > 0 && (
                <p className="text-orange-600 font-medium">{daysSinceLastTest} days since last test</p>
              )}
            </div>
          </div>
        )}

        {/* All Tests Grid */}
        <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            All Biomarkers ({filteredTests.length})
          </h2>
          <p className="text-sm text-gray-500 mb-4">Click any test to see its history over time</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTests.map((test) => (
              <button
                key={test.standardizedName}
                onClick={() => setSelectedTest(test.standardizedName)}
                className={`flex justify-between items-center p-3 rounded-lg border transition-all text-left ${
                  selectedTest === test.standardizedName
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{test.name}</p>
                  <p className="text-xs text-gray-500">
                    {CATEGORY_DISPLAY_NAMES[test.category]} • {test.history.length} tests
                  </p>
                </div>
                <div className="text-right ml-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[test.latestStatus]}`}>
                    {test.latestValue}
                  </span>
                  {test.trend !== 'stable' && (
                    <p className={`text-xs mt-1 ${test.trend === 'up' ? 'text-orange-500' : 'text-blue-500'}`}>
                      {test.trend === 'up' ? '↑' : '↓'}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Reports Timeline */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-4">Report Timeline</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {reports.slice(0, 20).map((report) => {
              const abnormal = report.results.filter((r) => r.status !== 'normal');
              return (
                <div
                  key={report.date}
                  className="flex items-center justify-between p-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(report.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">{report.results.length} tests</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {abnormal.length > 0 && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        {abnormal.length} abnormal
                      </span>
                    )}
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      {report.results.length - abnormal.length} normal
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
