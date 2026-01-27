import Head from 'next/head'
import { useState } from 'react'
import * as fs from 'fs'
import * as path from 'path'
import { ResponsiveLine } from '@nivo/line'

function val(sourced) {
  return sourced?.value ?? null
}

function computeMA(points, windowDays = 30) {
  if (points.length === 0) return []
  const result = []
  for (let i = 0; i < points.length; i++) {
    const currentDate = new Date(points[i].x).getTime()
    const cutoff = currentDate - windowDays * 86400000
    let sum = 0, count = 0
    for (let j = i; j >= 0; j--) {
      if (new Date(points[j].x).getTime() < cutoff) break
      sum += points[j].y
      count++
    }
    if (count > 0) {
      result.push({ x: points[i].x, y: Math.round(sum / count * 10) / 10 })
    }
  }
  return result
}

function computeMABounds(maPoints, padding = 0.15) {
  if (!maPoints || maPoints.length === 0) return null
  const vals = maPoints.map(p => p.y)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  return {
    min: Math.floor((min - range * padding) * 10) / 10,
    max: Math.ceil((max + range * padding) * 10) / 10,
  }
}

function MaLabelsLayer({ series }) {
  const maSeries = series.find(s => s.id.includes('avg'))
  if (!maSeries || maSeries.data.length === 0) return null
  const step = Math.max(1, Math.floor(maSeries.data.length / 8))
  const format = (v) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
    if (v >= 100) return Math.round(v)
    return Math.round(v * 10) / 10
  }
  return (
    <g>
      {maSeries.data
        .filter((_, i) => i % step === 0 || i === maSeries.data.length - 1)
        .map((point, idx) => (
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
  )
}

const defaultLayers = ['grid', 'markers', 'axes', 'areas', 'crosshair', 'lines', 'points', 'slices', 'mesh', 'legends']

export default function Home({ data, availableYears }) {
  const [selectedYear, setSelectedYear] = useState('all')
  const [showMA, setShowMA] = useState(false)

  const yearData = selectedYear === 'all' ? data.all : data.byYear[selectedYear] || data.all

  const today = new Date().toISOString().slice(0, 10)
  const minDate = selectedYear === 'all' ? undefined : `${selectedYear}-01-01`
  const maxDate = selectedYear === 'all' ? today : `${selectedYear}-12-31`

  const sleepPoints = yearData.recentSleep.map(s => ({ x: s.day, y: s.hours }))
  const sleepMA = showMA ? computeMA(sleepPoints) : []
  const sleepMABounds = computeMABounds(sleepMA)
  const sleepChartData = [{ id: 'Sleep Duration', data: sleepPoints }]
  if (sleepMA.length > 0) sleepChartData.push({ id: '30d avg', data: sleepMA })

  const runPoints = yearData.monthlyRuns.map(m => ({ x: m.monthDate, y: m.distance }))
  const monthlyRunData = [{ id: 'Distance', data: runPoints }]

  const stepsPoints = yearData.recentSteps.map(s => ({ x: s.date, y: s.steps }))
  const stepsMA = showMA ? computeMA(stepsPoints) : []
  const stepsMABounds = computeMABounds(stepsMA)
  const stepsChartData = [{ id: 'Steps', data: stepsPoints }]
  if (stepsMA.length > 0) stepsChartData.push({ id: '30d avg', data: stepsMA })

  const hrvPoints = yearData.recentHRV.map(s => ({ x: s.date, y: s.hrv }))
  const hrvMA = showMA ? computeMA(hrvPoints) : []
  const hrvMABounds = computeMABounds(hrvMA)
  const hrvChartData = [{ id: 'HRV', data: hrvPoints }]
  if (hrvMA.length > 0) hrvChartData.push({ id: '30d avg', data: hrvMA })

  const showCharts = selectedYear !== 'all'

  return (
    <div className="grow p-4">
      <Head>
        <title>Health Overview</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm">Your health at a glance</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            {showCharts && (
              <button
                onClick={() => setShowMA(!showMA)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${showMA ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
              >
                30d avg
              </button>
            )}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Runs</p>
            <p className="text-3xl font-bold text-orange-500">{yearData.stats.totalRuns}</p>
            <p className="text-xs text-gray-400 mt-1">{yearData.stats.totalDistance} km total</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Daily Steps</p>
            <p className="text-3xl font-bold text-green-500">{yearData.stats.avgSteps.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{yearData.stats.activityDays} days tracked</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Sleep</p>
            <p className="text-3xl font-bold text-blue-500">{yearData.stats.avgSleepHours ?? '-'}<span className="text-lg">h</span></p>
            <p className="text-xs text-gray-400 mt-1">{yearData.stats.sleepDays} nights tracked</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Lab Reports</p>
            <p className="text-3xl font-bold text-purple-500">{yearData.stats.labReports}</p>
            <p className="text-xs text-gray-400 mt-1">{yearData.stats.labTests} tests total</p>
          </div>
        </div>

        {/* Second Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Resting HR</p>
            <p className="text-3xl font-bold text-red-500">{yearData.stats.avgRestingHR ?? '-'} <span className="text-lg">bpm</span></p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg HRV</p>
            <p className="text-3xl font-bold text-purple-500">{yearData.stats.avgHRV ?? '-'} <span className="text-lg">ms</span></p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Sleep Efficiency</p>
            <p className="text-3xl font-bold text-blue-500">{yearData.stats.avgEfficiency ?? '-'}<span className="text-lg">%</span></p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Readiness</p>
            <p className="text-3xl font-bold text-emerald-500">{yearData.stats.avgReadiness ?? '-'}</p>
          </div>
        </div>

        {/* Charts - only shown when a specific year is selected */}
        {showCharts ? (
          <>
            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h2 className="font-semibold text-gray-900 mb-3">Monthly Running Distance</h2>
                <div className="h-48">
                  {monthlyRunData[0].data.length > 0 ? (
                    <ResponsiveLine
                      data={monthlyRunData}
                      margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
                      xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'month', min: minDate, max: maxDate }}
                      xFormat="time:%Y-%m-%d"
                      yScale={{ type: 'linear', min: 0, max: 'auto' }}
                      curve="monotoneX"
                      axisBottom={{ format: '%b %y', tickRotation: -45 }}
                      axisLeft={{ legend: 'km', legendPosition: 'middle', legendOffset: -35 }}
                      colors={['#f97316']}
                      pointSize={6}
                      pointColor="#f97316"
                      enableArea={true}
                      areaOpacity={0.1}
                      useMesh={true}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h2 className="font-semibold text-gray-900 mb-3">Sleep Duration</h2>
                <div className="h-48">
                  {sleepChartData[0].data.length > 0 ? (
                    <ResponsiveLine
                      data={sleepChartData}
                      margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
                      xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: minDate, max: maxDate }}
                      xFormat="time:%Y-%m-%d"
                      yScale={{
                        type: 'linear',
                        min: showMA && sleepMABounds ? sleepMABounds.min : 4,
                        max: showMA && sleepMABounds ? sleepMABounds.max : 12,
                      }}
                      curve="monotoneX"
                      axisBottom={{ format: '%b %d', tickRotation: -45 }}
                      axisLeft={{ legend: 'hours', legendPosition: 'middle', legendOffset: -35 }}
                      colors={showMA && sleepChartData.length > 1 ? ['rgba(59, 130, 246, 0.15)', '#ef4444'] : ['#3b82f6']}
                      pointSize={showMA ? 0 : 4}
                      enableArea={!showMA}
                      areaOpacity={0.1}
                      useMesh={true}
                      lineWidth={showMA ? 1 : 2}
                      legends={showMA && sleepChartData.length > 1 ? [{ anchor: 'top-right', direction: 'row', itemWidth: 100, itemHeight: 20, symbolSize: 10, translateY: -10 }] : []}
                      layers={showMA ? [...defaultLayers, MaLabelsLayer] : undefined}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data</div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h2 className="font-semibold text-gray-900 mb-3">Daily Steps</h2>
                <div className="h-48">
                  {stepsChartData[0].data.length > 0 ? (
                    <ResponsiveLine
                      data={stepsChartData}
                      margin={{ top: 10, right: 10, bottom: 40, left: 50 }}
                      xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: minDate, max: maxDate }}
                      xFormat="time:%Y-%m-%d"
                      yScale={{
                        type: 'linear',
                        min: showMA && stepsMABounds ? stepsMABounds.min : 0,
                        max: showMA && stepsMABounds ? stepsMABounds.max : 'auto',
                      }}
                      curve="monotoneX"
                      axisBottom={{ format: '%b %d', tickRotation: -45 }}
                      axisLeft={{ format: v => `${(v / 1000).toFixed(0)}k` }}
                      colors={showMA && stepsChartData.length > 1 ? ['rgba(34, 197, 94, 0.15)', '#ef4444'] : ['#22c55e']}
                      pointSize={showMA ? 0 : 3}
                      enableArea={!showMA}
                      areaOpacity={0.1}
                      useMesh={true}
                      lineWidth={showMA ? 1 : 2}
                      legends={showMA && stepsChartData.length > 1 ? [{ anchor: 'top-right', direction: 'row', itemWidth: 100, itemHeight: 20, symbolSize: 10, translateY: -10 }] : []}
                      layers={showMA ? [...defaultLayers, MaLabelsLayer] : undefined}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h2 className="font-semibold text-gray-900 mb-3">HRV Trend</h2>
                <div className="h-48">
                  {hrvChartData[0].data.length > 0 ? (
                    <ResponsiveLine
                      data={hrvChartData}
                      margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
                      xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', min: minDate, max: maxDate }}
                      xFormat="time:%Y-%m-%d"
                      yScale={{
                        type: 'linear',
                        min: showMA && hrvMABounds ? hrvMABounds.min : 'auto',
                        max: showMA && hrvMABounds ? hrvMABounds.max : 'auto',
                      }}
                      curve="monotoneX"
                      axisBottom={{ format: '%b %d', tickRotation: -45 }}
                      axisLeft={{ legend: 'ms', legendPosition: 'middle', legendOffset: -35 }}
                      colors={showMA && hrvChartData.length > 1 ? ['rgba(139, 92, 246, 0.15)', '#ef4444'] : ['#8b5cf6']}
                      pointSize={showMA ? 0 : 3}
                      enableArea={!showMA}
                      areaOpacity={0.1}
                      useMesh={true}
                      lineWidth={showMA ? 1 : 2}
                      legends={showMA && hrvChartData.length > 1 ? [{ anchor: 'top-right', direction: 'row', itemWidth: 100, itemHeight: 20, symbolSize: 10, translateY: -10 }] : []}
                      layers={showMA ? [...defaultLayers, MaLabelsLayer] : undefined}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
            <p className="text-gray-500">Select a specific year to view charts</p>
          </div>
        )}
      </main>
    </div>
  )
}

function processDataForYear(runs, unifiedDays, labReports, year) {
  const filterByYear = (date) => year === 'all' || date.startsWith(year)

  const yearRuns = runs.filter(r => filterByYear(r.start_date.slice(0, 10)))
  const yearUnified = unifiedDays.filter(d => filterByYear(d.date))
  const yearLabs = labReports.filter(l => filterByYear(l.date))

  const monthlyMap = new Map()
  for (const run of yearRuns) {
    const month = run.start_date.slice(0, 7)
    const existing = monthlyMap.get(month) || { distance: 0, count: 0 }
    existing.distance += run.distance / 1000
    existing.count += 1
    monthlyMap.set(month, existing)
  }

  const monthlyRuns = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month: month.slice(2),
      monthDate: `${month}-01`,
      distance: Math.round(data.distance),
      count: data.count
    }))
    .sort((a, b) => a.monthDate.localeCompare(b.monthDate))
    .slice(-12)

  const totalDistance = Math.round(yearRuns.reduce((sum, r) => sum + r.distance, 0) / 1000)

  const sleepDurDays = yearUnified.filter(d => d.sleepDurationMinutes?.value != null)
  const avgSleepHours = sleepDurDays.length > 0
    ? Math.round(sleepDurDays.reduce((sum, d) => sum + d.sleepDurationMinutes.value, 0) / sleepDurDays.length / 60 * 10) / 10
    : null

  const stepsDays = yearUnified.filter(d => d.steps?.value != null)
  const avgSteps = stepsDays.length > 0
    ? Math.round(stepsDays.reduce((sum, d) => sum + d.steps.value, 0) / stepsDays.length)
    : 0

  const restingHRDays = yearUnified.filter(d => d.restingHeartRate?.value != null)
  const avgRestingHR = restingHRDays.length > 0
    ? Math.round(restingHRDays.reduce((sum, d) => sum + d.restingHeartRate.value, 0) / restingHRDays.length)
    : null

  const hrvDays = yearUnified.filter(d => d.hrv?.value != null)
  const avgHRV = hrvDays.length > 0
    ? Math.round(hrvDays.reduce((sum, d) => sum + d.hrv.value, 0) / hrvDays.length)
    : null

  const effDays = yearUnified.filter(d => d.sleepEfficiency?.value != null)
  const avgEfficiency = effDays.length > 0
    ? Math.round(effDays.reduce((sum, d) => sum + d.sleepEfficiency.value, 0) / effDays.length)
    : null

  const readinessDays = yearUnified.filter(d => d.readinessScore?.value != null)
  const avgReadiness = readinessDays.length > 0
    ? Math.round(readinessDays.reduce((sum, d) => sum + d.readinessScore.value, 0) / readinessDays.length)
    : null

  let labTests = 0
  for (const lab of yearLabs) {
    labTests += lab.results.length
  }

  const recentSleep = sleepDurDays.map(d => ({
    day: d.date,
    hours: Math.round(d.sleepDurationMinutes.value / 60 * 10) / 10,
  }))
  const recentSteps = stepsDays.map(d => ({ date: d.date, steps: d.steps.value }))
  const recentHRV = hrvDays.map(d => ({ date: d.date, hrv: d.hrv.value }))

  return {
    stats: {
      totalRuns: yearRuns.length,
      totalDistance,
      avgSleepHours,
      avgSteps,
      avgRestingHR,
      avgHRV,
      avgEfficiency,
      avgReadiness,
      sleepDays: sleepDurDays.length,
      activityDays: stepsDays.length,
      labReports: yearLabs.length,
      labTests
    },
    recentSleep,
    recentSteps,
    recentHRV,
    monthlyRuns
  }
}

export async function getServerSideProps() {
  const stravaPath = path.join(process.cwd(), 'DATA', 'strava', 'activities.json')
  const unifiedPath = path.join(process.cwd(), 'DATA', 'unified', 'daily.json')
  const labPath = path.join(process.cwd(), 'DATA', 'lab_results.json')

  let runs = []
  let unifiedDays = []
  let labReports = []

  if (fs.existsSync(stravaPath)) {
    const all = JSON.parse(fs.readFileSync(stravaPath, 'utf-8'))
    runs = all.filter(a => a.type === 'Run')
  }
  if (fs.existsSync(unifiedPath)) {
    const unified = JSON.parse(fs.readFileSync(unifiedPath, 'utf-8'))
    unifiedDays = unified.data || []
  }
  if (fs.existsSync(labPath)) {
    labReports = JSON.parse(fs.readFileSync(labPath, 'utf-8')).reports || []
  }

  const allYears = new Set()
  runs.forEach(r => allYears.add(r.start_date.slice(0, 4)))
  unifiedDays.forEach(d => allYears.add(d.date.slice(0, 4)))
  labReports.forEach(l => allYears.add(l.date.slice(0, 4)))

  const availableYears = Array.from(allYears).sort().reverse()

  const byYear = {}
  for (const year of availableYears) {
    byYear[year] = processDataForYear(runs, unifiedDays, labReports, year)
  }

  return {
    props: {
      data: {
        all: processDataForYear(runs, unifiedDays, labReports, 'all'),
        byYear
      },
      availableYears
    }
  }
}
