import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useState } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveCalendar } from '@nivo/calendar';
import { ResponsiveBar } from '@nivo/bar';

interface Sourced<T> {
  value: T;
  source: string;
}

interface UnifiedDay {
  date: string;
  sleepDurationMinutes: Sourced<number> | null;
  sleepScore: Sourced<number> | null;
  sleepDeepMinutes: Sourced<number> | null;
  sleepREMMinutes: Sourced<number> | null;
  sleepLightMinutes: Sourced<number> | null;
  sleepAwakeMinutes: Sourced<number> | null;
  sleepEfficiency: Sourced<number> | null;
  hrv: Sourced<number> | null;
  restingHeartRate: Sourced<number> | null;
  respiratoryRate: Sourced<number> | null;
  readinessScore: Sourced<number> | null;
  temperatureDeviation: Sourced<number> | null;
}

interface MonthlyAvg {
  monthDate: string;
  avgDuration: number | null;
  avgScore: number | null;
}

interface YearData {
  sleepData: UnifiedDay[];
  monthlyAvg: MonthlyAvg[];
}

interface Props {
  data: { all: YearData; byYear: Record<string, YearData> };
  availableYears: string[];
}

function val<T>(s: Sourced<T> | null): T | null {
  return s?.value ?? null;
}

function processDataForYear(allDays: UnifiedDay[], year: string): YearData {
  const filtered = year === 'all'
    ? allDays
    : allDays.filter(d => d.date.startsWith(year));

  const sleepData = filtered.filter(d => d.sleepDurationMinutes || d.sleepScore);

  const monthlyMap = new Map<string, UnifiedDay[]>();
  for (const day of sleepData) {
    const month = day.date.slice(0, 7);
    if (!monthlyMap.has(month)) monthlyMap.set(month, []);
    monthlyMap.get(month)!.push(day);
  }

  const monthlyAvg: MonthlyAvg[] = Array.from(monthlyMap.entries())
    .map(([month, days]) => {
      const durDays = days.filter(d => val(d.sleepDurationMinutes) !== null);
      const scoreDays = days.filter(d => val(d.sleepScore) !== null);
      return {
        monthDate: `${month}-01`,
        avgDuration: durDays.length > 0
          ? Math.round(durDays.reduce((sum, d) => sum + (val(d.sleepDurationMinutes) || 0), 0) / durDays.length)
          : null,
        avgScore: scoreDays.length > 0
          ? Math.round(scoreDays.reduce((sum, d) => sum + (val(d.sleepScore) || 0), 0) / scoreDays.length)
          : null,
      };
    })
    .sort((a, b) => a.monthDate.localeCompare(b.monthDate));

  return { sleepData, monthlyAvg };
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const unifiedPath = path.join(process.cwd(), 'DATA', 'unified', 'daily.json');

  let allDays: UnifiedDay[] = [];
  if (fs.existsSync(unifiedPath)) {
    const raw = JSON.parse(fs.readFileSync(unifiedPath, 'utf-8'));
    allDays = (raw.data || []).map((d: Record<string, unknown>) => ({
      date: d.date,
      sleepDurationMinutes: d.sleepDurationMinutes,
      sleepScore: d.sleepScore,
      sleepDeepMinutes: d.sleepDeepMinutes,
      sleepREMMinutes: d.sleepREMMinutes,
      sleepLightMinutes: d.sleepLightMinutes,
      sleepAwakeMinutes: d.sleepAwakeMinutes,
      sleepEfficiency: d.sleepEfficiency,
      hrv: d.hrv,
      restingHeartRate: d.restingHeartRate,
      respiratoryRate: d.respiratoryRate,
      readinessScore: d.readinessScore,
      temperatureDeviation: d.temperatureDeviation,
    }));
  }

  const withSleep = allDays.filter(d => d.sleepDurationMinutes || d.sleepScore);
  const availableYears = Array.from(new Set(withSleep.map(d => d.date.slice(0, 4))))
    .sort()
    .reverse();

  const byYear: Record<string, YearData> = {};
  for (const year of availableYears) {
    byYear[year] = processDataForYear(allDays, year);
  }

  return {
    props: {
      data: { all: processDataForYear(allDays, 'all'), byYear },
      availableYears,
    },
  };
};

function computeMA(points: { x: string; y: number | null }[], windowDays = 30): { x: string; y: number }[] {
  const valid = points.filter((p): p is { x: string; y: number } => p.y !== null);
  if (valid.length === 0) return [];
  const result: { x: string; y: number }[] = [];
  for (let i = 0; i < valid.length; i++) {
    const currentDate = new Date(valid[i].x).getTime();
    const cutoff = currentDate - windowDays * 86400000;
    let sum = 0, count = 0;
    for (let j = i; j >= 0; j--) {
      if (new Date(valid[j].x).getTime() < cutoff) break;
      sum += valid[j].y;
      count++;
    }
    if (count > 0) {
      result.push({ x: valid[i].x, y: Math.round(sum / count * 10) / 10 });
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

const defaultLayers = ['grid', 'markers', 'axes', 'areas', 'crosshair', 'lines', 'points', 'slices', 'mesh', 'legends'] as const;

export default function SleepPage({ data, availableYears }: Props) {
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || 'all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showMA, setShowMA] = useState(false);

  const yearData = selectedYear === 'all' ? data.all : data.byYear[selectedYear] || data.all;

  const filteredSleep = selectedMonth === 'all'
    ? yearData.sleepData
    : yearData.sleepData.filter(s => s.date.slice(5, 7) === selectedMonth);

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = selectedMonth !== 'all' && selectedYear !== 'all'
    ? new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).toISOString().slice(0, 10)
    : selectedYear === 'all' ? today : `${selectedYear}-12-31`;
  const firstDate = selectedMonth !== 'all' && selectedYear !== 'all'
    ? `${selectedYear}-${selectedMonth}-01`
    : filteredSleep[0]?.date || today;

  const formatSleep = (mins: number | null): string => {
    if (mins === null) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  // Stats
  const durDays = filteredSleep.filter(d => val(d.sleepDurationMinutes) !== null);
  const avgDuration = durDays.length > 0
    ? Math.round(durDays.reduce((sum, d) => sum + (val(d.sleepDurationMinutes) || 0), 0) / durDays.length)
    : null;

  const scoreDays = filteredSleep.filter(d => val(d.sleepScore) !== null);
  const avgScore = scoreDays.length > 0
    ? Math.round(scoreDays.reduce((sum, d) => sum + (val(d.sleepScore) || 0), 0) / scoreDays.length)
    : null;

  const deepDays = filteredSleep.filter(d => val(d.sleepDeepMinutes) !== null);
  const avgDeep = deepDays.length > 0
    ? Math.round(deepDays.reduce((sum, d) => sum + (val(d.sleepDeepMinutes) || 0), 0) / deepDays.length)
    : null;

  const remDays = filteredSleep.filter(d => val(d.sleepREMMinutes) !== null);
  const avgREM = remDays.length > 0
    ? Math.round(remDays.reduce((sum, d) => sum + (val(d.sleepREMMinutes) || 0), 0) / remDays.length)
    : null;

  const lightDays = filteredSleep.filter(d => val(d.sleepLightMinutes) !== null);
  const avgLight = lightDays.length > 0
    ? Math.round(lightDays.reduce((sum, d) => sum + (val(d.sleepLightMinutes) || 0), 0) / lightDays.length)
    : null;

  const effDays = filteredSleep.filter(d => val(d.sleepEfficiency) !== null);
  const avgEfficiency = effDays.length > 0
    ? Math.round(effDays.reduce((sum, d) => sum + (val(d.sleepEfficiency) || 0), 0) / effDays.length)
    : null;

  const hrvDays = filteredSleep.filter(d => val(d.hrv) !== null);
  const avgHRV = hrvDays.length > 0
    ? Math.round(hrvDays.reduce((sum, d) => sum + (val(d.hrv) || 0), 0) / hrvDays.length)
    : null;

  const readyDays = filteredSleep.filter(d => val(d.readinessScore) !== null);
  const avgReadiness = readyDays.length > 0
    ? Math.round(readyDays.reduce((sum, d) => sum + (val(d.readinessScore) || 0), 0) / readyDays.length)
    : null;

  const durationSource = durDays[0]?.sleepDurationMinutes?.source || '';
  const stageSource = deepDays[0]?.sleepDeepMinutes?.source || '';

  // Chart data with optional MA
  const buildLine = (id: string, extractor: (d: UnifiedDay) => number | null) => {
    const points = filteredSleep
      .filter(d => extractor(d) !== null)
      .map(d => ({ x: d.date, y: extractor(d)! }));
    const series: { id: string; data: { x: string; y: number }[] }[] = [{ id, data: points }];
    const ma = showMA ? computeMA(points) : [];
    if (ma.length > 0) series.push({ id: '30d avg', data: ma });
    const maBounds = computeMABounds(ma);
    return { series, maBounds };
  };

  const durationResult = buildLine('Sleep Duration', d => {
    const v = val(d.sleepDurationMinutes);
    return v !== null ? Math.round(v / 6) / 10 : null;
  });
  const scoreResult = buildLine('Sleep Score', d => val(d.sleepScore));
  const hrvResult = buildLine('HRV', d => val(d.hrv));

  // Monthly average lines
  const monthlyScoreData = [{
    id: 'Monthly Score',
    data: yearData.monthlyAvg.filter(m => m.avgScore !== null).map(m => ({ x: m.monthDate, y: m.avgScore })),
  }];
  const monthlyDurationData = [{
    id: 'Monthly Duration',
    data: yearData.monthlyAvg.filter(m => m.avgDuration !== null).map(m => ({
      x: m.monthDate,
      y: Math.round(m.avgDuration! / 6) / 10,
    })),
  }];
  const firstMonthDate = yearData.monthlyAvg[0]?.monthDate || today;

  // Calendar data
  const calendarData = yearData.sleepData
    .filter(d => val(d.sleepScore) !== null || val(d.sleepDurationMinutes) !== null)
    .map(d => ({
      day: d.date,
      value: val(d.sleepScore) ?? Math.min(100, Math.round((val(d.sleepDurationMinutes) || 0) / 480 * 85)),
    }));

  // Sleep stages bar
  const stagesData = avgLight !== null ? [
    { stage: 'Light', minutes: avgLight, color: '#93c5fd' },
    { stage: 'Deep', minutes: avgDeep || 0, color: '#1e40af' },
    { stage: 'REM', minutes: avgREM || 0, color: '#8b5cf6' },
  ] : [];

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  const SourceBadge = ({ source }: { source: string }) => {
    if (!source) return null;
    const label = source === 'oura' ? 'Oura' : source === 'apple_health' ? 'Apple' : source;
    const color = source === 'oura' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600';
    return <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>;
  };

  // MA chart helper
  const maLineProps = (series: { id: string; data: any[] }[], maBounds: { min: number; max: number } | null, baseColor: string, rgbaColor: string, defaultMin: number | string = 'auto', defaultMax: number | string = 'auto') => ({
    colors: showMA && series.length > 1 ? [rgbaColor, '#ef4444'] : [baseColor],
    pointSize: showMA ? 0 : 3,
    enableArea: !showMA,
    lineWidth: showMA ? 1 : 2,
    layers: showMA ? [...defaultLayers, MaLabelsLayer] as any : undefined,
    legends: showMA && series.length > 1 ? [{ anchor: 'top-right' as const, direction: 'row' as const, itemWidth: 100, itemHeight: 20, symbolSize: 10, translateY: -10 }] : [],
    yScale: {
      type: 'linear' as const,
      min: showMA && maBounds ? maBounds.min : defaultMin,
      max: showMA && maBounds ? maBounds.max : defaultMax,
    },
  });

  return (
    <div className="grow p-4">
      <Head>
        <title>Sleep - Health Overview</title>
      </Head>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sleep Analysis</h1>
            <p className="text-gray-500 text-sm">
              Unified sleep data from Oura Ring + Apple Watch
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={() => setShowMA(!showMA)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${showMA ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
            >
              30d avg
            </button>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth('all'); }}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
              disabled={selectedYear === 'all'}
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Stats Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Duration</p>
            <p className="text-3xl font-bold text-blue-500">{formatSleep(avgDuration)}</p>
            <p className="text-xs text-gray-400 mt-1">{durDays.length} nights</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Score</p>
            <p className="text-3xl font-bold text-indigo-500">{avgScore ?? '-'}</p>
            <p className="text-xs text-gray-400 mt-1">{scoreDays.length} nights</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Efficiency</p>
            <p className="text-3xl font-bold text-green-500">{avgEfficiency ?? '-'}%</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Readiness</p>
            <p className="text-3xl font-bold text-amber-500">{avgReadiness ?? '-'}</p>
          </div>
        </div>

        {/* Stats Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Deep Sleep</p>
            <p className="text-3xl font-bold text-blue-800">{formatSleep(avgDeep)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg REM Sleep</p>
            <p className="text-3xl font-bold text-purple-500">{formatSleep(avgREM)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Light Sleep</p>
            <p className="text-3xl font-bold text-blue-300">{formatSleep(avgLight)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg HRV (sleep)</p>
            <p className="text-3xl font-bold text-purple-600">{avgHRV ?? '-'} <span className="text-lg">ms</span></p>
          </div>
        </div>

        {/* Sleep Duration Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Sleep Duration
            <SourceBadge source={durationSource} />
          </h2>
          <div className="h-64">
            {durationResult.series[0].data.length > 0 ? (
              <ResponsiveLine
                data={durationResult.series}
                margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                xFormat="time:%Y-%m-%d"
                {...maLineProps(durationResult.series, durationResult.maBounds, '#3b82f6', 'rgba(59, 130, 246, 0.15)', 0, 12)}
                curve="monotoneX"
                axisBottom={{ format: '%b %y', tickRotation: -45 }}
                axisLeft={{ legend: 'Hours', legendPosition: 'middle', legendOffset: -40 }}
                areaOpacity={0.1}
                useMesh
              />
            ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
          </div>
        </div>

        {/* Score + HRV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Sleep Score <SourceBadge source="oura" /></h2>
            <div className="h-64">
              {scoreResult.series[0].data.length > 0 ? (
                <ResponsiveLine
                  data={scoreResult.series}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  {...maLineProps(scoreResult.series, scoreResult.maBounds, '#6366f1', 'rgba(99, 102, 241, 0.15)', 40, 100)}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %y', tickRotation: -45 }}
                  axisLeft={{ legend: 'Score', legendPosition: 'middle', legendOffset: -40 }}
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No score data</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Sleep HRV</h2>
            <div className="h-64">
              {hrvResult.series[0].data.length > 0 ? (
                <ResponsiveLine
                  data={hrvResult.series}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  {...maLineProps(hrvResult.series, hrvResult.maBounds, '#8b5cf6', 'rgba(139, 92, 246, 0.15)')}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %y', tickRotation: -45 }}
                  axisLeft={{ legend: 'ms', legendPosition: 'middle', legendOffset: -40 }}
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>
        </div>

        {/* Monthly Averages + Sleep Stages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Monthly Avg Duration</h2>
            <div className="h-64">
              {monthlyDurationData[0].data.length > 0 ? (
                <ResponsiveLine
                  data={monthlyDurationData}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'month', min: firstMonthDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  yScale={{ type: 'linear', min: 0, max: 12 }}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %y', tickRotation: -45 }}
                  axisLeft={{ legend: 'Hours', legendPosition: 'middle', legendOffset: -40 }}
                  colors={['#8b5cf6']}
                  pointSize={8}
                  enableArea
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">
              Average Sleep Stages
              <SourceBadge source={stageSource} />
            </h2>
            <div className="h-64">
              {stagesData.length > 0 ? (
                <ResponsiveBar
                  data={stagesData}
                  keys={['minutes']}
                  indexBy="stage"
                  margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                  padding={0.3}
                  colors={({ data }) => data.color as string}
                  borderRadius={4}
                  axisLeft={{ legend: 'Minutes', legendPosition: 'middle', legendOffset: -50 }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#fff"
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No stage data</div>}
            </div>
            {stagesData.length > 0 && (
              <div className="flex justify-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-300 rounded"></span> Light: {formatSleep(avgLight)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-800 rounded"></span> Deep: {formatSleep(avgDeep)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded"></span> REM: {formatSleep(avgREM)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Calendar + Quality Distribution */}
        {selectedYear !== 'all' && (
          <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Sleep Calendar {selectedYear}</h2>
            <div className="h-40">
              <ResponsiveCalendar
                data={calendarData}
                from={`${selectedYear}-01-01`}
                to={`${selectedYear}-12-31`}
                emptyColor="#f3f4f6"
                colors={['#fecaca', '#fde68a', '#bfdbfe', '#86efac']}
                minValue={40}
                maxValue={100}
                margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
                yearSpacing={40}
                monthBorderColor="#fff"
                dayBorderWidth={2}
                dayBorderColor="#fff"
              />
            </div>
          </div>
        )}

        {/* Quality Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-4">Sleep Quality Distribution</h2>
          <div className="space-y-3">
            {(() => {
              const withScore = filteredSleep.filter(d => val(d.sleepScore) !== null);
              if (withScore.length === 0) return <p className="text-gray-400">No score data for selected period</p>;
              const excellent = withScore.filter(d => (val(d.sleepScore) || 0) >= 85).length;
              const good = withScore.filter(d => { const s = val(d.sleepScore) || 0; return s >= 70 && s < 85; }).length;
              const fair = withScore.filter(d => { const s = val(d.sleepScore) || 0; return s >= 50 && s < 70; }).length;
              const poor = withScore.filter(d => (val(d.sleepScore) || 0) < 50).length;
              const total = withScore.length;

              const bars = [
                { label: 'Excellent (85+)', count: excellent, pct: Math.round(excellent / total * 100), color: 'green' },
                { label: 'Good (70-84)', count: good, pct: Math.round(good / total * 100), color: 'blue' },
                { label: 'Fair (50-69)', count: fair, pct: Math.round(fair / total * 100), color: 'yellow' },
                { label: 'Poor (<50)', count: poor, pct: Math.round(poor / total * 100), color: 'red' },
              ];

              return bars.map(b => (
                <div key={b.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{b.label}</span>
                    <span className={`font-semibold text-${b.color}-600`}>{b.count} nights ({b.pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className={`h-2 bg-${b.color}-500 rounded-full`} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
