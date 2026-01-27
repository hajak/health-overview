export type LabCategory =
  | 'vitamins'
  | 'bloodSugar'
  | 'lipids'
  | 'thyroid'
  | 'iron'
  | 'inflammation'
  | 'kidney'
  | 'liver'
  | 'electrolytes'
  | 'hematology'
  | 'hormones'
  | 'gastrointestinal'
  | 'coagulation'
  | 'bloodGas'
  | 'urine'
  | 'other';

export type ResultStatus = 'normal' | 'low' | 'high' | 'critical';

export type DataSource = 'werlabs' | 'hospital' | 'manual' | 'aleris';

export interface ReferenceRange {
  min?: number;
  max?: number;
  operator?: '<' | '>' | '=' | 'range';
  displayText: string;
}

export interface LabResultValue {
  id: string;
  testName: string;
  standardizedName: string;
  value: number | string;
  unit: string;
  referenceRange: ReferenceRange;
  status: ResultStatus;
  category: LabCategory;
}

export interface LabReport {
  id: string;
  date: Date;
  source: DataSource;
  sourceFileName?: string;
  results: LabResultValue[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LabReportFirestore {
  id: string;
  date: string;
  source: DataSource;
  sourceFileName?: string;
  results: LabResultValueFirestore[];
  createdAt: string;
  updatedAt: string;
}

export interface LabResultValueFirestore {
  id: string;
  testName: string;
  standardizedName: string;
  value: number | string;
  unit: string;
  referenceRange: ReferenceRange;
  status: ResultStatus;
  category: LabCategory;
}

export interface TestHistoryPoint {
  date: Date;
  value: number | string;
  unit: string;
  status: ResultStatus;
  referenceRange: ReferenceRange;
  source: DataSource;
}

export interface CategorySummary {
  category: LabCategory;
  displayName: string;
  totalTests: number;
  normalCount: number;
  abnormalCount: number;
  lastTestDate: Date | null;
}

export interface LabResultsFilter {
  startDate?: Date;
  endDate?: Date;
  categories?: LabCategory[];
  source?: DataSource;
  status?: ResultStatus[];
}

export function determineStatus(
  value: number,
  referenceRange: ReferenceRange
): ResultStatus {
  const { min, max, operator } = referenceRange;

  if (operator === '<' && max !== undefined) {
    return value < max ? 'normal' : 'high';
  }

  if (operator === '>' && min !== undefined) {
    return value > min ? 'normal' : 'low';
  }

  if (min !== undefined && max !== undefined) {
    if (value < min) {
      const percentBelow = ((min - value) / min) * 100;
      return percentBelow > 20 ? 'critical' : 'low';
    }
    if (value > max) {
      const percentAbove = ((value - max) / max) * 100;
      return percentAbove > 20 ? 'critical' : 'high';
    }
    return 'normal';
  }

  return 'normal';
}

export function convertFirestoreToLabReport(doc: LabReportFirestore): LabReport {
  return {
    ...doc,
    date: new Date(doc.date),
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

export function convertLabReportToFirestore(report: LabReport): LabReportFirestore {
  return {
    ...report,
    date: report.date.toISOString(),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export const CATEGORY_DISPLAY_NAMES: Record<LabCategory, string> = {
  vitamins: 'Vitamins',
  bloodSugar: 'Blood Sugar',
  lipids: 'Lipids',
  thyroid: 'Thyroid',
  iron: 'Iron Status',
  inflammation: 'Inflammation',
  kidney: 'Kidney Function',
  liver: 'Liver Function',
  electrolytes: 'Electrolytes',
  hematology: 'Hematology',
  hormones: 'Hormones',
  gastrointestinal: 'Gastrointestinal',
  coagulation: 'Coagulation',
  bloodGas: 'Blood Gas',
  urine: 'Urine Analysis',
  other: 'Other',
};
