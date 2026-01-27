import React from 'react';
import { CategorySummary } from '@/types/labResults';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

interface CategoryCardProps {
  summary: CategorySummary;
  onClick?: () => void;
}

export default function CategoryCard({ summary, onClick }: CategoryCardProps) {
  const isAllNormal = summary.abnormalCount === 0;
  const lastTestFormatted = summary.lastTestDate
    ? new Date(summary.lastTestDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Never';

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
        isAllNormal
          ? 'bg-green-50 border border-green-200 hover:bg-green-100'
          : 'bg-orange-50 border border-orange-200 hover:bg-orange-100'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-800">{summary.displayName}</h3>
        {isAllNormal ? (
          <FiCheckCircle className="text-green-500 text-xl" />
        ) : (
          <FiAlertCircle className="text-orange-500 text-xl" />
        )}
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>
          {summary.normalCount} of {summary.totalTests} normal
        </p>
        {summary.abnormalCount > 0 && (
          <p className="text-orange-600 font-medium">
            {summary.abnormalCount} out of range
          </p>
        )}
        <p className="text-gray-400 text-xs">Last: {lastTestFormatted}</p>
      </div>
    </div>
  );
}
