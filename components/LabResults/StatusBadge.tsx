import React from 'react';
import { ResultStatus } from '@/types/labResults';

interface StatusBadgeProps {
  status: ResultStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusStyles: Record<ResultStatus, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-100', text: 'text-green-800', label: 'Normal' },
  low: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Low' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { bg, text, label } = statusStyles[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${bg} ${text} ${sizeStyles[size]}`}
    >
      {label}
    </span>
  );
}
