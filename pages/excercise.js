import Head from 'next/head'
import { useState } from 'react'
import * as fs from 'fs'
import * as path from 'path'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'

export default function Exercise({ data, availableYears }) {
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || 'all')
  const [selectedMonth, setSelectedMonth] = useState('all')

  const yearData = selectedYear === 'all' ? data.all : data.byYear[selectedYear] || data.all

  const filteredActivities = selectedMonth === 'all'
    ? yearData.activities
    : yearData.activities.filter(a => a.start_date.slice(5, 7) === selectedMonth)

  const filteredOuraActivity = selectedMonth === 'all'
    ? yearData.ouraActivity
    : yearData.ouraActivity.filter(a => a.day.slice(5, 7) === selectedMonth)

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

  const totalDistance = Math.round(filteredActivities.reduce((sum, a) => sum + a.distance, 0) / 1000)
  const totalTime = filteredActivities.reduce((sum, a) => sum + a.moving_time, 0)
  const avgSteps = filteredOuraActivity.length > 0
    ? Math.round(filteredOuraActivity.reduce((sum, a) => sum + (a.steps || 0), 0) / filteredOuraActivity.length)
    : 0
  const totalCalories = filteredOuraActivity.reduce((sum, a) => sum + (a.active_calories || 0), 0)

  const monthlyBarData = yearData.monthlyDistance.map(m => ({
    month: m.month,
    distance: m.distance,
  }))

  const typeMap = new Map()
  for (const activity of filteredActivities) {
    const type = activity.type
    const existing = typeMap.get(type) || { count: 0, distance: 0, time: 0 }
    existing.count += 1
    existing.distance += activity.distance / 1000
    existing.time += activity.moving_time
    typeMap.set(type, existing)
  }

  const activityTypes = Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      distance: Math.round(data.distance),
      time: data.time
    }))
    .sort((a, b) => b.count - a.count)

  const pieData = activityTypes.slice(0, 6).map((t, i) => ({
    id: t.type,
    label: t.type,
    value: t.count,
    color: ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#14b8a6'][i]
  }))

  return (
    <div className="grow p-4">
      <Head>
        <title>Exercise - Health Overview</title>
      </Head>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exercise</h1>
            <p className="text-gray-500 text-sm">Strava activities + Oura daily activity</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth('all'); }}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="all">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
              disabled={selectedYear === 'all'}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Activities</p>
            <p className="text-3xl font-bold text-orange-500">{filteredActivities.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Distance</p>
            <p className="text-3xl font-bold text-orange-500">{totalDistance} km</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Time</p>
            <p className="text-3xl font-bold text-green-500">{formatTime(totalTime)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Avg Daily Steps</p>
            <p className="text-3xl font-bold text-blue-500">{avgSteps.toLocaleString()}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Monthly Distance Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Monthly Distance (km)</h2>
            <div className="h-64">
              {monthlyBarData.length > 0 ? (
                <ResponsiveBar
                  data={monthlyBarData}
                  keys={['distance']}
                  indexBy="month"
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  padding={0.3}
                  colors={['#f97316']}
                  borderRadius={4}
                  axisBottom={{ tickRotation: -45 }}
                  axisLeft={{ legend: 'km', legendPosition: 'middle', legendOffset: -40 }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#fff"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No data</div>
              )}
            </div>
          </div>

          {/* Activity Types Pie */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Activity Types</h2>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsivePie
                  data={pieData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  colors={{ datum: 'data.color' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor="#fff"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No data</div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Types List + Recent Activities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Activity Breakdown</h2>
            <div className="space-y-3">
              {activityTypes.map(({ type, count, distance, time }) => (
                <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{type}</span>
                    <span className="text-gray-500 text-sm ml-2">{count} activities</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-orange-500">{distance} km</span>
                    <span className="text-gray-500 text-sm ml-2">{formatTime(time)}</span>
                  </div>
                </div>
              ))}
              {activityTypes.length === 0 && (
                <p className="text-gray-400 text-center py-4">No activities</p>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Activities</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredActivities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{activity.name}</p>
                    <p className="text-xs text-gray-500">
                      {activity.type} • {new Date(activity.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-500">
                      {(activity.distance / 1000).toFixed(1)} km
                    </p>
                    <p className="text-xs text-gray-500">{formatTime(activity.moving_time)}</p>
                  </div>
                </div>
              ))}
              {filteredActivities.length === 0 && (
                <p className="text-gray-400 text-center py-4">No activities</p>
              )}
            </div>
          </div>
        </div>

        {/* Daily Activity Stats */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-4">Daily Activity Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">Days Tracked</p>
              <p className="text-2xl font-bold text-blue-600">{filteredOuraActivity.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">Total Steps</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredOuraActivity.reduce((sum, a) => sum + (a.steps || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">Active Calories</p>
              <p className="text-2xl font-bold text-orange-600">{totalCalories.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">Best Step Day</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredOuraActivity.length > 0
                  ? Math.max(...filteredOuraActivity.map(a => a.steps || 0)).toLocaleString()
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function processDataForYear(activities, ouraActivity, year) {
  const filterByYear = (date) => year === 'all' || date.startsWith(year)

  const filtered = activities.filter(a => filterByYear(a.start_date.slice(0, 10)))
  const filteredOura = ouraActivity.filter(a => filterByYear(a.day))

  const monthlyMap = new Map()
  for (const activity of filtered) {
    const month = activity.start_date.slice(0, 7)
    const existing = monthlyMap.get(month) || { distance: 0 }
    existing.distance += activity.distance / 1000
    monthlyMap.set(month, existing)
  }

  const monthlyDistance = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month: month.slice(2),
      distance: Math.round(data.distance * 10) / 10,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    activities: filtered,
    ouraActivity: filteredOura,
    monthlyDistance
  }
}

export async function getServerSideProps() {
  const stravaPath = path.join(process.cwd(), 'DATA', 'strava', 'activities.json')
  const ouraActivityPath = path.join(process.cwd(), 'DATA', 'oura', 'daily_activity.json')

  let activities = []
  let ouraActivity = []

  if (fs.existsSync(stravaPath)) {
    activities = JSON.parse(fs.readFileSync(stravaPath, 'utf-8'))
  }
  if (fs.existsSync(ouraActivityPath)) {
    ouraActivity = JSON.parse(fs.readFileSync(ouraActivityPath, 'utf-8')).data || []
  }

  const allYears = new Set()
  activities.forEach(a => allYears.add(a.start_date.slice(0, 4)))
  ouraActivity.forEach(a => allYears.add(a.day.slice(0, 4)))

  const availableYears = Array.from(allYears).sort().reverse()

  const byYear = {}
  for (const year of availableYears) {
    byYear[year] = processDataForYear(activities, ouraActivity, year)
  }

  return {
    props: {
      data: {
        all: processDataForYear(activities, ouraActivity, 'all'),
        byYear
      },
      availableYears
    }
  }
}
