import React from 'react';

interface TimePeriodFilterProps {
  selectedYear: string;
  selectedMonth: string;
  availableYears: string[];
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
}

const MONTHS = [
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
];

export default function TimePeriodFilter({
  selectedYear,
  selectedMonth,
  availableYears,
  onYearChange,
  onMonthChange,
}: TimePeriodFilterProps) {
  return (
    <div className="flex gap-3 items-center">
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Years</option>
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <select
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={selectedYear === 'all'}
      >
        {MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function filterByTimePeriod<T extends { date: string }>(
  data: T[],
  year: string,
  month: string
): T[] {
  return data.filter((item) => {
    if (year === 'all') return true;
    const itemYear = item.date.slice(0, 4);
    if (itemYear !== year) return false;
    if (month === 'all') return true;
    const itemMonth = item.date.slice(5, 7);
    return itemMonth === month;
  });
}

export function getAvailableYears(dates: string[]): string[] {
  const years = new Set(dates.map((d) => d.slice(0, 4)));
  return Array.from(years).sort().reverse();
}
