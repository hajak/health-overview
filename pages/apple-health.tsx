import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useState } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';

interface Sourced<T> {
  value: T;
  source: string;
}

interface UnifiedDay {
  date: string;
  steps: Sourced<number> | null;
  activeCalories: Sourced<number> | null;
  distanceMeters: Sourced<number> | null;
  exerciseMinutes: Sourced<number> | null;
  restingHeartRate: Sourced<number> | null;
  avgHeartRate: Sourced<number> | null;
  hrv: Sourced<number> | null;
  sleepDurationMinutes: Sourced<number> | null;
  sleepScore: Sourced<number> | null;
  sleepDeepMinutes: Sourced<number> | null;
  sleepREMMinutes: Sourced<number> | null;
  sleepLightMinutes: Sourced<number> | null;
  sleepAwakeMinutes: Sourced<number> | null;
  sleepEfficiency: Sourced<number> | null;
  respiratoryRate: Sourced<number> | null;
  oxygenSaturation: Sourced<number> | null;
  readinessScore: Sourced<number> | null;
  temperatureDeviation: Sourced<number> | null;
  vo2Max: Sourced<number> | null;
  wristTemperature: Sourced<number> | null;
}

interface YearData {
  dailyData: UnifiedDay[];
  stats: {
    avgSteps: number;
    avgCalories: number;
    avgDistance: number;
    avgRestingHR: number | null;
    avgHRV: number | null;
    avgSleepHours: number | null;
    avgSpO2: number | null;
    avgVO2Max: number | null;
    totalDays: number;
  };
}

interface Props {
  data: {
    all: YearData;
    byYear: Record<string, YearData>;
  };
  availableYears: string[];
}

function val<T>(s: Sourced<T> | null): T | null {
  return s?.value ?? null;
}

function sourceName(s: Sourced<unknown> | null): string | null {
  return s?.source ?? null;
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const colors: Record<string, string> = {
    oura: 'bg-teal-100 text-teal-700',
    apple_health: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    oura: 'Oura',
    apple_health: 'Apple',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[source] || 'bg-gray-100 text-gray-600'}`}>
      {labels[source] || source}
    </span>
  );
}

function avgSourced(days: UnifiedDay[], extractor: (d: UnifiedDay) => Sourced<number> | null): number | null {
  const values = days.map(d => val(extractor(d))).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
}

function processDataForYear(allDays: UnifiedDay[], year: string): YearData {
  const filtered = year === 'all'
    ? allDays.slice(-90)
    : allDays.filter(d => d.date.startsWith(year));

  const stepsVals = filtered.map(d => val(d.steps)).filter((v): v is number => v !== null);
  const calVals = filtered.map(d => val(d.activeCalories)).filter((v): v is number => v !== null);
  const distVals = filtered.map(d => val(d.distanceMeters)).filter((v): v is number => v !== null);

  return {
    dailyData: filtered,
    stats: {
      avgSteps: stepsVals.length > 0 ? Math.round(stepsVals.reduce((a, b) => a + b, 0) / stepsVals.length) : 0,
      avgCalories: calVals.length > 0 ? Math.round(calVals.reduce((a, b) => a + b, 0) / calVals.length) : 0,
      avgDistance: distVals.length > 0 ? Math.round(distVals.reduce((a, b) => a + b, 0) / distVals.length) : 0,
      avgRestingHR: avgSourced(filtered, d => d.restingHeartRate),
      avgHRV: avgSourced(filtered, d => d.hrv),
      avgSleepHours: (() => {
        const sleepVals = filtered.map(d => val(d.sleepDurationMinutes)).filter((v): v is number => v !== null);
        return sleepVals.length > 0 ? Math.round(sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length / 60 * 10) / 10 : null;
      })(),
      avgSpO2: avgSourced(filtered, d => d.oxygenSaturation),
      avgVO2Max: avgSourced(filtered, d => d.vo2Max),
      totalDays: filtered.length,
    },
  };
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const unifiedPath = path.join(process.cwd(), 'DATA', 'unified', 'daily.json');

  let allDays: UnifiedDay[] = [];
  if (fs.existsSync(unifiedPath)) {
    const raw = JSON.parse(fs.readFileSync(unifiedPath, 'utf-8'));
    allDays = raw.data || [];
  }

  const availableYears = Array.from(new Set(allDays.map(d => d.date.slice(0, 4))))
    .sort()
    .reverse();

  const byYear: Record<string, YearData> = {};
  for (const year of availableYears) {
    byYear[year] = processDataForYear(allDays, year);
  }

  return {
    props: {
      data: {
        all: processDataForYear(allDays, 'all'),
        byYear,
      },
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

export default function AppleHealthPage({ data, availableYears }: Props) {
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || 'all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showMA, setShowMA] = useState(false);

  const yearData = selectedYear === 'all' ? data.all : data.byYear[selectedYear] || data.all;

  const filteredDaily = selectedMonth === 'all'
    ? yearData.dailyData
    : yearData.dailyData.filter(d => d.date.slice(5, 7) === selectedMonth);

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = selectedYear === 'all' ? today : `${selectedYear}-12-31`;
  const firstDate = filteredDaily[0]?.date || today;

  // Recalculate stats for filtered period
  const avgSteps = (() => {
    const vals = filteredDaily.map(d => val(d.steps)).filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  })();
  const avgCalories = (() => {
    const vals = filteredDaily.map(d => val(d.activeCalories)).filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  })();
  const avgRestingHR = avgSourced(filteredDaily, d => d.restingHeartRate);
  const avgHRV = avgSourced(filteredDaily, d => d.hrv);
  const avgSleepMins = (() => {
    const vals = filteredDaily.map(d => val(d.sleepDurationMinutes)).filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();
  const avgSpO2 = avgSourced(filteredDaily, d => d.oxygenSaturation);
  const avgVO2Max = avgSourced(filteredDaily, d => d.vo2Max);

  // Sleep stages averages
  const sleepStageDays = filteredDaily.filter(d => val(d.sleepDeepMinutes) !== null);
  const avgSleepDeep = sleepStageDays.length > 0
    ? Math.round(sleepStageDays.reduce((sum, d) => sum + (val(d.sleepDeepMinutes) || 0), 0) / sleepStageDays.length)
    : null;
  const avgSleepREM = sleepStageDays.length > 0
    ? Math.round(sleepStageDays.reduce((sum, d) => sum + (val(d.sleepREMMinutes) || 0), 0) / sleepStageDays.length)
    : null;
  const avgSleepLight = sleepStageDays.length > 0
    ? Math.round(sleepStageDays.reduce((sum, d) => sum + (val(d.sleepLightMinutes) || 0), 0) / sleepStageDays.length)
    : null;

  // Dominant source for each metric (from most recent day with data)
  const latestWithSteps = filteredDaily.filter(d => d.steps).slice(-1)[0];
  const latestWithHR = filteredDaily.filter(d => d.restingHeartRate).slice(-1)[0];
  const latestWithHRV = filteredDaily.filter(d => d.hrv).slice(-1)[0];
  const latestWithSleep = filteredDaily.filter(d => d.sleepDurationMinutes).slice(-1)[0];
  const latestWithSpO2 = filteredDaily.filter(d => d.oxygenSaturation).slice(-1)[0];
  const latestWithVO2 = filteredDaily.filter(d => d.vo2Max).slice(-1)[0];
  const latestWithStages = filteredDaily.filter(d => d.sleepDeepMinutes).slice(-1)[0];

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  // Chart data builders with optional MA
  const buildLineData = (id: string, extractor: (d: UnifiedDay) => Sourced<number> | null) => {
    const points = filteredDaily
      .filter(d => val(extractor(d)) !== null)
      .map(d => ({ x: d.date, y: val(extractor(d))! }));
    const series: { id: string; data: { x: string; y: number }[] }[] = [{ id, data: points }];
    const ma = showMA ? computeMA(points) : [];
    if (ma.length > 0) series.push({ id: '30d avg', data: ma });
    const maBounds = computeMABounds(ma);
    return { series, maBounds };
  };

  const stepsResult = buildLineData('Steps', d => d.steps);
  const restingHRResult = buildLineData('Resting HR', d => d.restingHeartRate);
  const hrvResult = buildLineData('HRV', d => d.hrv);
  const sleepResult = buildLineData('Sleep', d =>
    d.sleepDurationMinutes ? { value: d.sleepDurationMinutes.value / 60, source: d.sleepDurationMinutes.source } : null
  );
  const spO2Result = buildLineData('SpO2', d => d.oxygenSaturation);
  const vo2MaxResult = buildLineData('VO2 Max', d => d.vo2Max);

  // Sleep stages bar data
  const sleepStagesData = avgSleepDeep !== null ? [
    { stage: 'Light', minutes: avgSleepLight || 0, color: '#93c5fd' },
    { stage: 'Deep', minutes: avgSleepDeep, color: '#1e40af' },
    { stage: 'REM', minutes: avgSleepREM || 0, color: '#8b5cf6' },
  ] : [];

  const formatSleep = (mins: number | null) => {
    if (mins === null) return '-';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  };

  // MA chart helper
  const maProps = (series: { id: string; data: any[] }[], maBounds: { min: number; max: number } | null, baseColor: string, rgbaColor: string, defaultMin: number | string = 'auto', defaultMax: number | string = 'auto') => ({
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
        <title>Health Metrics - Health Overview</title>
      </Head>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Health Metrics</h1>
            <p className="text-gray-500 text-sm">Unified daily metrics from all sources</p>
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

        {/* Stats Row 1: Activity */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">Avg Daily Steps</p>
              <SourceBadge source={sourceName(latestWithSteps?.steps ?? null)} />
            </div>
            <p className="text-3xl font-bold text-green-500">{avgSteps.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">Avg Active Cal</p>
            </div>
            <p className="text-3xl font-bold text-orange-500">{avgCalories}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">Avg Resting HR</p>
              <SourceBadge source={sourceName(latestWithHR?.restingHeartRate ?? null)} />
            </div>
            <p className="text-3xl font-bold text-red-500">{avgRestingHR ?? '-'} <span className="text-lg">bpm</span></p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">Avg HRV</p>
              <SourceBadge source={sourceName(latestWithHRV?.hrv ?? null)} />
            </div>
            <p className="text-3xl font-bold text-purple-500">{avgHRV ?? '-'} <span className="text-lg">ms</span></p>
          </div>
        </div>

        {/* Stats Row 2: Health */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">Avg Sleep</p>
              <SourceBadge source={sourceName(latestWithSleep?.sleepDurationMinutes ?? null)} />
            </div>
            <p className="text-3xl font-bold text-blue-500">{formatSleep(avgSleepMins)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">Avg SpO2</p>
              <SourceBadge source={sourceName(latestWithSpO2?.oxygenSaturation ?? null)} />
            </div>
            <p className="text-3xl font-bold text-cyan-500">{avgSpO2 ?? '-'}<span className="text-lg">%</span></p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">Avg VO2 Max</p>
              <SourceBadge source={sourceName(latestWithVO2?.vo2Max ?? null)} />
            </div>
            <p className="text-3xl font-bold text-emerald-500">{avgVO2Max ?? '-'}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Days Tracked</p>
            <p className="text-3xl font-bold text-gray-700">{filteredDaily.length}</p>
          </div>
        </div>

        {/* Steps Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Daily Steps</h2>
          <div className="h-56">
            {stepsResult.series[0].data.length > 0 ? (
              <ResponsiveLine
                data={stepsResult.series}
                margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                xFormat="time:%Y-%m-%d"
                {...maProps(stepsResult.series, stepsResult.maBounds, '#22c55e', 'rgba(34, 197, 94, 0.15)', 0, 'auto')}
                curve="monotoneX"
                axisBottom={{ format: '%b %d', tickRotation: -45 }}
                axisLeft={{ format: (v: number) => `${(v / 1000).toFixed(0)}k` }}
                areaOpacity={0.1}
                useMesh
              />
            ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
          </div>
        </div>

        {/* Heart Rate & HRV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Resting Heart Rate</h2>
              <SourceBadge source={sourceName(latestWithHR?.restingHeartRate ?? null)} />
            </div>
            <div className="h-56">
              {restingHRResult.series[0].data.length > 0 ? (
                <ResponsiveLine
                  data={restingHRResult.series}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  {...maProps(restingHRResult.series, restingHRResult.maBounds, '#ef4444', 'rgba(239, 68, 68, 0.15)')}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %d', tickRotation: -45 }}
                  axisLeft={{ legend: 'BPM', legendPosition: 'middle', legendOffset: -40 }}
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Heart Rate Variability (HRV)</h2>
              <SourceBadge source={sourceName(latestWithHRV?.hrv ?? null)} />
            </div>
            <div className="h-56">
              {hrvResult.series[0].data.length > 0 ? (
                <ResponsiveLine
                  data={hrvResult.series}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  {...maProps(hrvResult.series, hrvResult.maBounds, '#8b5cf6', 'rgba(139, 92, 246, 0.15)')}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %d', tickRotation: -45 }}
                  axisLeft={{ legend: 'ms', legendPosition: 'middle', legendOffset: -40 }}
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>
        </div>

        {/* Sleep Duration & Stages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Sleep Duration</h2>
              <SourceBadge source={sourceName(latestWithSleep?.sleepDurationMinutes ?? null)} />
            </div>
            <div className="h-56">
              {sleepResult.series[0].data.length > 0 ? (
                <ResponsiveLine
                  data={sleepResult.series}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  {...maProps(sleepResult.series, sleepResult.maBounds, '#3b82f6', 'rgba(59, 130, 246, 0.15)', 0, 12)}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %d', tickRotation: -45 }}
                  axisLeft={{ legend: 'Hours', legendPosition: 'middle', legendOffset: -40 }}
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Average Sleep Stages</h2>
              <SourceBadge source={sourceName(latestWithStages?.sleepDeepMinutes ?? null)} />
            </div>
            <div className="h-56">
              {sleepStagesData.length > 0 ? (
                <ResponsiveBar
                  data={sleepStagesData}
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
              ) : <div className="h-full flex items-center justify-center text-gray-400">No sleep stage data</div>}
            </div>
            {sleepStagesData.length > 0 && (
              <div className="flex justify-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-300 rounded"></span> Light: {formatSleep(avgSleepLight)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-800 rounded"></span> Deep: {formatSleep(avgSleepDeep)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded"></span> REM: {formatSleep(avgSleepREM)}</span>
              </div>
            )}
          </div>
        </div>

        {/* SpO2 & VO2 Max */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Blood Oxygen (SpO2)</h2>
              <SourceBadge source={sourceName(latestWithSpO2?.oxygenSaturation ?? null)} />
            </div>
            <div className="h-56">
              {spO2Result.series[0].data.length > 0 ? (
                <ResponsiveLine
                  data={spO2Result.series}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  {...maProps(spO2Result.series, spO2Result.maBounds, '#06b6d4', 'rgba(6, 182, 212, 0.15)', 90, 100)}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %d', tickRotation: -45 }}
                  axisLeft={{ legend: '%', legendPosition: 'middle', legendOffset: -40 }}
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">VO2 Max (Cardio Fitness)</h2>
              <SourceBadge source={sourceName(latestWithVO2?.vo2Max ?? null)} />
            </div>
            <div className="h-56">
              {vo2MaxResult.series[0].data.length > 0 ? (
                <ResponsiveLine
                  data={vo2MaxResult.series}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: firstDate, max: maxDate }}
                  xFormat="time:%Y-%m-%d"
                  {...maProps(vo2MaxResult.series, vo2MaxResult.maBounds, '#10b981', 'rgba(16, 185, 129, 0.15)')}
                  curve="monotoneX"
                  axisBottom={{ format: '%b %d', tickRotation: -45 }}
                  axisLeft={{ legend: 'mL/kg/min', legendPosition: 'middle', legendOffset: -45 }}
                  areaOpacity={0.1}
                  useMesh
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400">No VO2 Max data</div>}
            </div>
          </div>
        </div>

        {/* Activity Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-4">Daily Steps Distribution</h2>
          <div className="space-y-3">
            {(() => {
              const withSteps = filteredDaily.filter(d => val(d.steps) !== null);
              const veryActive = withSteps.filter(d => val(d.steps)! >= 15000).length;
              const active = withSteps.filter(d => val(d.steps)! >= 10000 && val(d.steps)! < 15000).length;
              const moderate = withSteps.filter(d => val(d.steps)! >= 5000 && val(d.steps)! < 10000).length;
              const low = withSteps.filter(d => val(d.steps)! < 5000).length;
              const total = withSteps.length || 1;

              return (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Very Active (15k+)</span>
                      <span className="font-semibold text-green-700">{veryActive} days ({Math.round(veryActive / total * 100)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-green-700 rounded-full" style={{ width: `${veryActive / total * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Active (10k-15k)</span>
                      <span className="font-semibold text-green-500">{active} days ({Math.round(active / total * 100)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: `${active / total * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Moderate (5k-10k)</span>
                      <span className="font-semibold text-yellow-500">{moderate} days ({Math.round(moderate / total * 100)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-yellow-500 rounded-full" style={{ width: `${moderate / total * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Low (&lt;5k)</span>
                      <span className="font-semibold text-red-500">{low} days ({Math.round(low / total * 100)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-red-500 rounded-full" style={{ width: `${low / total * 100}%` }} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
