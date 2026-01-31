import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import * as fs from 'fs';
import * as path from 'path';

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  average_speed: number;
  average_heartrate?: number;
}

interface WeeklyData {
  week: string;
  weekDate: string;
  distance: number;
  runs: number;
  avgPace: number;
}

interface CumulativePoint {
  date: string;
  cumKm: number;
}

interface Props {
  data: {
    all: YearData;
    byYear: Record<string, YearData>;
  };
  availableYears: string[];
}

interface YearData {
  weeklyData: WeeklyData[];
  monthlyPace: { month: string; monthDate: string; pace: number }[];
  cumulativeData: CumulativePoint[];
  goalKm: number;
  projectedEndOfYear: number | null;
  behindGoalKm: number | null;
  next30dTargetKm: number | null;
  selectedYearStr: string;
  stats: {
    totalRuns: number;
    totalDistance: number;
    avgPace: string;
    longestRun: number;
    fastestPace: string;
  };
}

function formatPace(metersPerSecond: number): string {
  if (!metersPerSecond || metersPerSecond === 0) return '-';
  const minPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function paceToMinutes(metersPerSecond: number): number {
  if (!metersPerSecond || metersPerSecond === 0) return 0;
  return 1000 / metersPerSecond / 60;
}

function computeMA(points: { x: string; y: number }[], windowDays = 28): { x: string; y: number }[] {
  if (points.length === 0) return [];
  const result: { x: string; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const currentDate = new Date(points[i].x).getTime();
    const cutoff = currentDate - windowDays * 86400000;
    let sum = 0, count = 0;
    for (let j = i; j >= 0; j--) {
      if (new Date(points[j].x).getTime() < cutoff) break;
      sum += points[j].y;
      count++;
    }
    if (count > 0) {
      result.push({ x: points[i].x, y: Math.round(sum / count * 10) / 10 });
    }
  }
  return result;
}

function computeMABounds(maPoints: { y: number }[], padding = 0.15): { min: number; max: number } | null {
  if (!maPoints || maPoints.length === 0) return null;
  const vals = maPoints.map(p => p.y);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  return {
    min: Math.floor((min - range * padding) * 10) / 10,
    max: Math.ceil((max + range * padding) * 10) / 10,
  };
}

function MaLabelsLayer({ series }: { series: any[] }) {
  const maSeries = series.find((s: any) => s.id.includes('avg'));
  if (!maSeries || maSeries.data.length === 0) return null;
  const step = Math.max(1, Math.floor(maSeries.data.length / 8));
  const format = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    if (v >= 100) return Math.round(v);
    return Math.round(v * 10) / 10;
  };
  return (
    <g>
      {maSeries.data
        .filter((_: any, i: number) => i % step === 0 || i === maSeries.data.length - 1)
        .map((point: any, idx: number) => (
          <text
            key={idx}
            x={point.position.x}
            y={point.position.y - 10}
            textAnchor="middle"
            fontSize={10}
            fill="#ef4444"
            fontWeight={600}
          >
            {format(point.data.y)}
          </text>
        ))}
    </g>
  );
}

const defaultLayers: readonly string[] = ['grid', 'markers', 'axes', 'areas', 'crosshair', 'lines', 'points', 'slices', 'mesh', 'legends'];

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const stravaPath = path.join(process.cwd(), 'DATA', 'strava', 'activities.json');

  let stravaActivities: StravaActivity[] = [];
  if (fs.existsSync(stravaPath)) {
    stravaActivities = JSON.parse(fs.readFileSync(stravaPath, 'utf-8'));
  }

  const runs = stravaActivities.filter((a) => a.type === 'Run');
  const GOAL_KM = 1000;

  function processYear(year: string): YearData {
    const filterByYear = (date: string) => year === 'all' || date.startsWith(year);
    const yearRuns = runs.filter((r) => filterByYear(r.start_date.slice(0, 10)));

    // Weekly data
    const weeklyMap = new Map<string, { distance: number; runs: number; speeds: number[] }>();
    for (const run of yearRuns) {
      const week = getWeekNumber(new Date(run.start_date));
      const existing = weeklyMap.get(week) || { distance: 0, runs: 0, speeds: [] };
      existing.distance += run.distance / 1000;
      existing.runs += 1;
      if (run.average_speed) existing.speeds.push(run.average_speed);
      weeklyMap.set(week, existing);
    }

    const weeklyData = Array.from(weeklyMap.entries())
      .map(([week, wd]) => ({
        week,
        weekDate: getWeekStartDate(week),
        distance: Math.round(wd.distance * 10) / 10,
        runs: wd.runs,
        avgPace: wd.speeds.length > 0
          ? paceToMinutes(wd.speeds.reduce((a, b) => a + b, 0) / wd.speeds.length)
          : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-52);

    // Monthly pace
    const monthlyPaceMap = new Map<string, number[]>();
    for (const run of yearRuns) {
      if (!run.average_speed) continue;
      const month = run.start_date.slice(0, 7);
      if (!monthlyPaceMap.has(month)) monthlyPaceMap.set(month, []);
      monthlyPaceMap.get(month)!.push(run.average_speed);
    }

    const monthlyPace = Array.from(monthlyPaceMap.entries())
      .map(([month, speeds]) => ({
        month,
        monthDate: `${month}-01`,
        pace: paceToMinutes(speeds.reduce((a, b) => a + b, 0) / speeds.length),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Cumulative distance (per day with a run)
    const sortedRuns = [...yearRuns].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const cumulativeData: CumulativePoint[] = [];
    let cumKm = 0;

    const dailyDistMap = new Map<string, number>();
    for (const run of sortedRuns) {
      const date = run.start_date.slice(0, 10);
      dailyDistMap.set(date, (dailyDistMap.get(date) || 0) + run.distance / 1000);
    }

    for (const [date, dist] of Array.from(dailyDistMap.entries()).sort()) {
      cumKm += dist;
      cumulativeData.push({ date, cumKm: Math.round(cumKm * 10) / 10 });
    }

    // Projection for year view
    let projectedEndOfYear: number | null = null;
    let behindGoalKm: number | null = null;
    let next30dTargetKm: number | null = null;

    if (year !== 'all' && cumulativeData.length > 1) {
      const lastPoint = cumulativeData[cumulativeData.length - 1];
      const lastDate = new Date(lastPoint.date);
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31`);
      const totalDaysInYear = (yearEnd.getTime() - yearStart.getTime()) / 86400000;
      const daysSoFar = (lastDate.getTime() - yearStart.getTime()) / 86400000;

      if (daysSoFar > 0) {
        const ratePerDay = lastPoint.cumKm / daysSoFar;
        projectedEndOfYear = Math.round(ratePerDay * totalDaysInYear);

        const expectedByNow = GOAL_KM * (daysSoFar / totalDaysInYear);
        behindGoalKm = Math.round((lastPoint.cumKm - expectedByNow) * 10) / 10;

        const remainingKm = GOAL_KM - lastPoint.cumKm;
        const remainingDays = (yearEnd.getTime() - lastDate.getTime()) / 86400000;
        if (remainingDays > 0) {
          next30dTargetKm = Math.round(remainingKm / remainingDays * 30 * 10) / 10;
        }
      }
    }

    // Stats
    const totalDistance = Math.round(yearRuns.reduce((sum, r) => sum + r.distance, 0) / 1000);
    const allSpeeds = yearRuns.filter((r) => r.average_speed).map((r) => r.average_speed);
    const avgSpeed = allSpeeds.length > 0 ? allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length : 0;
    const maxSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 0;

    return {
      weeklyData,
      monthlyPace,
      cumulativeData,
      goalKm: GOAL_KM,
      projectedEndOfYear,
      behindGoalKm,
      next30dTargetKm,
      selectedYearStr: year,
      stats: {
        totalRuns: yearRuns.length,
        totalDistance,
        avgPace: formatPace(avgSpeed),
        longestRun: yearRuns.length > 0 ? Math.round(Math.max(...yearRuns.map((r) => r.distance)) / 1000 * 10) / 10 : 0,
        fastestPace: formatPace(maxSpeed),
      },
    };
  }

  const allYears = new Set<string>();
  runs.forEach((r) => allYears.add(r.start_date.slice(0, 4)));
  const availableYears = Array.from(allYears).sort().reverse();

  const byYear: Record<string, YearData> = {};
  for (const year of availableYears) {
    byYear[year] = processYear(year);
  }

  return {
    props: {
      data: { all: processYear('all'), byYear },
      availableYears,
    },
  };
};

function getWeekNumber(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getWeekStartDate(weekStr: string): string {
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekPart);
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7;
  const dayOfWeek = jan1.getDay() || 7;
  const weekStart = new Date(year, 0, 1 + daysOffset - dayOfWeek + 1);
  return weekStart.toISOString().slice(0, 10);
}

export default function ActivityOverview({ data, availableYears }: Props) {
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || 'all');
  const [showMA, setShowMA] = useState(false);

  const yearData = selectedYear === 'all' ? data.all : data.byYear[selectedYear] || data.all;

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = selectedYear === 'all' ? today : `${selectedYear}-12-31`;

  // Weekly distance chart
  const distPoints = yearData.weeklyData.map((w) => ({ x: w.weekDate, y: w.distance }));
  const distMA = showMA ? computeMA(distPoints) : [];
  const distMABounds = computeMABounds(distMA);
  const distanceLineData: { id: string; data: { x: string; y: number }[] }[] = [{ id: 'Distance', data: distPoints }];
  if (distMA.length > 0) distanceLineData.push({ id: '4w avg', data: distMA });
  const firstWeekDate = yearData.weeklyData[0]?.weekDate || today;

  // Pace chart
  const pacePoints = yearData.monthlyPace.map((m) => ({ x: m.monthDate, y: m.pace }));
  const paceMA = showMA ? computeMA(pacePoints, 3) : [];
  const paceMABounds = computeMABounds(paceMA);
  const paceLineData: { id: string; data: { x: string; y: number }[] }[] = [{ id: 'Pace', data: pacePoints }];
  if (paceMA.length > 0) paceLineData.push({ id: '3m avg', data: paceMA });
  const firstMonthDate = yearData.monthlyPace[0]?.monthDate || today;

  // Cumulative burn chart
  const isYearView = selectedYear !== 'all';
  const currentYear = new Date().getFullYear().toString();
  const isCurrentYear = selectedYear === currentYear;
  const cumPoints = yearData.cumulativeData.map((c) => ({ x: c.date, y: c.cumKm }));

  const burnChartData: { id: string; data: { x: string; y: number }[] }[] = [
    { id: 'Actual', data: cumPoints },
  ];

  if (isYearView) {
    const goalLine = [];
    for (let m = 0; m < 12; m++) {
      const monthStr = `${selectedYear}-${String(m + 1).padStart(2, '0')}-01`;
      const dayOfYear = Math.round((new Date(monthStr).getTime() - new Date(`${selectedYear}-01-01`).getTime()) / 86400000);
      goalLine.push({ x: monthStr, y: Math.round(yearData.goalKm * dayOfYear / 365) });
    }
    goalLine.push({ x: `${selectedYear}-12-31`, y: yearData.goalKm });
    burnChartData.push({ id: '1000k Goal', data: goalLine });

    if (isCurrentYear && yearData.projectedEndOfYear !== null && cumPoints.length > 0) {
      const lastActual = cumPoints[cumPoints.length - 1];
      burnChartData.push({
        id: 'Projected',
        data: [
          { x: lastActual.x, y: lastActual.y },
          { x: `${selectedYear}-12-31`, y: yearData.projectedEndOfYear },
        ],
      });
    }
  }

  const burnFirstDate = isYearView ? `${selectedYear}-01-01` : (cumPoints[0]?.x || today);
  const projMax = isCurrentYear ? (yearData.projectedEndOfYear || 0) : 0;
  const burnMaxY = isYearView ? Math.max(yearData.goalKm, projMax, cumPoints[cumPoints.length - 1]?.y || 0) + 50 : 'auto';

  return (
    <div className="grow p-4">
      <Head>
        <title>Running & Activity - Health Overview</title>
      </Head>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Running & Activity</h1>
            <p className="text-gray-500 text-sm">Running performance and distance tracking</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={() => setShowMA(!showMA)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${showMA ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
            >
              Avg line
            </button>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="all">All Time</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Runs</p>
            <p className="text-2xl font-bold text-orange-500">{yearData.stats.totalRuns}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Distance</p>
            <p className="text-2xl font-bold text-orange-500">{yearData.stats.totalDistance} km</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Avg Pace</p>
            <p className="text-2xl font-bold text-green-500">{yearData.stats.avgPace}/km</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Longest Run</p>
            <p className="text-2xl font-bold text-blue-500">{yearData.stats.longestRun} km</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Fastest Pace</p>
            <p className="text-2xl font-bold text-purple-500">{yearData.stats.fastestPace}/km</p>
          </div>
        </div>

        {/* Goal Tracking Banner */}
        {/* Current year: full goal tracking with projection */}
        {isCurrentYear && yearData.behindGoalKm !== null && (
          <div className={`rounded-xl p-4 mb-6 border ${yearData.behindGoalKm >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  1000k Goal Progress: {yearData.stats.totalDistance} / {yearData.goalKm} km
                </p>
                <p className={`text-sm ${yearData.behindGoalKm >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {yearData.behindGoalKm >= 0
                    ? `${yearData.behindGoalKm} km ahead of schedule`
                    : `${Math.abs(yearData.behindGoalKm)} km behind schedule`
                  }
                </p>
                {yearData.next30dTargetKm !== null && (
                  <p className="text-sm text-gray-600 mt-1">
                    Next 30 days target: <span className="font-semibold">{yearData.next30dTargetKm} km</span>
                    {' '}({Math.round(yearData.next30dTargetKm / 4 * 10) / 10} km/week)
                  </p>
                )}
              </div>
              <div className="mt-2 md:mt-0 text-right">
                <p className="text-sm text-gray-500">Projected year-end</p>
                <p className="text-xl font-bold text-gray-900">{yearData.projectedEndOfYear} km</p>
              </div>
            </div>
            <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-3 rounded-full ${yearData.behindGoalKm >= 0 ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${Math.min(100, yearData.stats.totalDistance / yearData.goalKm * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              {Math.round(yearData.stats.totalDistance / yearData.goalKm * 100)}% complete
            </p>
          </div>
        )}
        {/* Past years: simple total vs goal summary */}
        {isYearView && !isCurrentYear && (
          <div className="rounded-xl p-4 mb-6 border bg-gray-50 border-gray-200">
            <p className="font-semibold text-gray-900">
              {selectedYear} Total: {yearData.stats.totalDistance} km
              {yearData.stats.totalDistance >= yearData.goalKm
                ? ` — 1000k goal reached!`
                : ` / ${yearData.goalKm} km goal`
              }
            </p>
          </div>
        )}

        {/* Cumulative Distance Burn Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {isYearView ? `Cumulative Distance ${selectedYear} (1000k Goal)` : 'Cumulative Distance'}
          </h2>
          <div className="h-72">
            {cumPoints.length > 0 ? (
              <ResponsiveLine
                data={burnChartData}
                margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                xScale={{
                  type: 'time',
                  format: '%Y-%m-%d',
                  precision: 'day',
                  min: burnFirstDate,
                  max: maxDate,
                }}
                xFormat="time:%Y-%m-%d"
                yScale={{ type: 'linear', min: 0, max: burnMaxY }}
                axisBottom={{ format: '%b', tickRotation: -45 }}
                axisLeft={{ legend: 'km', legendPosition: 'middle', legendOffset: -50 }}
                colors={isYearView ? (isCurrentYear ? ['#f97316', '#94a3b8', '#22c55e'] : ['#f97316', '#94a3b8']) : ['#f97316']}
                lineWidth={2}
                pointSize={0}
                enableArea={false}
                curve="monotoneX"
                legends={isYearView ? [{
                  anchor: 'top-left',
                  direction: 'row',
                  itemWidth: 100,
                  itemHeight: 20,
                  symbolSize: 10,
                  translateY: -15,
                }] : []}
                enableSlices="x"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No run data</div>
            )}
          </div>
        </div>

        {/* Weekly Distance */}
        <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Weekly Running Distance</h2>
          <div className="h-64">
            {distanceLineData[0].data.length > 0 ? (
              <ResponsiveLine
                data={distanceLineData}
                margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstWeekDate, max: maxDate }}
                xFormat="time:%Y-%m-%d"
                yScale={{
                  type: 'linear',
                  min: showMA && distMABounds ? distMABounds.min : 0,
                  max: showMA && distMABounds ? distMABounds.max : 'auto',
                }}
                axisBottom={{ format: '%b %y', tickRotation: -45 }}
                axisLeft={{ legend: 'km', legendPosition: 'middle', legendOffset: -40 }}
                colors={showMA && distanceLineData.length > 1 ? ['rgba(249, 115, 22, 0.15)', '#ef4444'] : ['#f97316']}
                pointSize={showMA ? 0 : 6}
                pointColor="#f97316"
                enableArea={!showMA}
                areaOpacity={0.2}
                useMesh={true}
                curve="monotoneX"
                lineWidth={showMA ? 1 : 2}
                legends={showMA && distanceLineData.length > 1 ? [{ anchor: 'top-right', direction: 'row' as const, itemWidth: 100, itemHeight: 20, symbolSize: 10, translateY: -10 }] : []}
                layers={showMA ? [...defaultLayers, MaLabelsLayer] as any : undefined}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        {/* Monthly Pace Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Pace Trend</h2>
          <p className="text-xs text-gray-500 mb-2">Lower is faster (min/km)</p>
          <div className="h-64">
            {paceLineData[0].data.length > 0 ? (
              <ResponsiveLine
                data={paceLineData}
                margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'month', min: firstMonthDate, max: maxDate }}
                xFormat="time:%Y-%m-%d"
                yScale={{
                  type: 'linear',
                  min: showMA && paceMABounds ? paceMABounds.min : 'auto',
                  max: showMA && paceMABounds ? paceMABounds.max : 'auto',
                  reverse: true,
                }}
                curve="monotoneX"
                axisBottom={{ format: '%b %y', tickRotation: -45 }}
                axisLeft={{ legend: 'min/km', legendPosition: 'middle', legendOffset: -40 }}
                colors={showMA && paceLineData.length > 1 ? ['rgba(34, 197, 94, 0.15)', '#ef4444'] : ['#22c55e']}
                pointSize={showMA ? 0 : 8}
                pointColor="#22c55e"
                enableArea={!showMA}
                areaOpacity={0.1}
                useMesh={true}
                lineWidth={showMA ? 1 : 2}
                legends={showMA && paceLineData.length > 1 ? [{ anchor: 'top-right', direction: 'row' as const, itemWidth: 100, itemHeight: 20, symbolSize: 10, translateY: -10 }] : []}
                layers={showMA ? [...defaultLayers, MaLabelsLayer] as any : undefined}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
