import {
  findBiomarkerBySwedishName,
  getReferenceRange,
  BiomarkerDefinition,
} from '@/data/biomarkers';
import {
  LabResultValue,
  ReferenceRange,
  ResultStatus,
  LabCategory,
  determineStatus,
} from '@/types/labResults';
import { v4 as uuidv4 } from 'uuid';

interface ParsedValue {
  value: number | string;
  unit: string;
  operator?: '<' | '>' | '=';
}

function parseValueWithOperator(rawValue: string | number): ParsedValue {
  if (typeof rawValue === 'number') {
    return { value: rawValue, unit: '' };
  }

  const trimmed = rawValue.trim();

  const operatorMatch = trimmed.match(/^([<>]=?)\s*([\d.,]+)\s*(.*)$/);
  if (operatorMatch) {
    const operator = operatorMatch[1] as '<' | '>' | '=';
    const numValue = parseFloat(operatorMatch[2].replace(',', '.'));
    const unit = operatorMatch[3].trim();
    return { value: numValue, unit, operator };
  }

  const numericMatch = trimmed.match(/^([\d.,]+)\s*(.*)$/);
  if (numericMatch) {
    const numValue = parseFloat(numericMatch[1].replace(',', '.'));
    const unit = numericMatch[2].trim();
    return { value: numValue, unit };
  }

  return { value: trimmed, unit: '' };
}

function extractUnitFromHeader(header: string): string {
  const unitMatch = header.match(/\(([^)]+)\)\s*$/);
  return unitMatch ? unitMatch[1] : '';
}

function determineStatusFromValue(
  parsedValue: ParsedValue,
  referenceRange: ReferenceRange
): ResultStatus {
  if (typeof parsedValue.value !== 'number') {
    const strValue = String(parsedValue.value).toLowerCase();
    if (strValue === 'neg' || strValue === 'negative' || strValue === 'negativ') {
      return 'normal';
    }
    if (strValue === 'pos' || strValue === 'positive' || strValue === 'positiv') {
      return 'high';
    }
    return 'normal';
  }

  if (parsedValue.operator === '<') {
    return determineStatus(parsedValue.value, referenceRange);
  }

  return determineStatus(parsedValue.value, referenceRange);
}

export function mapToLabResult(
  testName: string,
  rawValue: string | number,
  gender?: 'male' | 'female'
): LabResultValue | null {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const biomarker = findBiomarkerBySwedishName(testName);
  const parsedValue = parseValueWithOperator(rawValue);

  let unit = parsedValue.unit || extractUnitFromHeader(testName);
  let referenceRange: ReferenceRange;
  let category: LabCategory = 'other';
  let standardizedName: string;
  let englishName: string;

  if (biomarker) {
    unit = unit || biomarker.defaultUnit;
    referenceRange = getReferenceRange(biomarker, gender);
    category = biomarker.category;
    standardizedName = biomarker.standardizedName;
    englishName = biomarker.englishName;
  } else {
    referenceRange = { displayText: 'N/A' };
    standardizedName = testName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    englishName = testName;
  }

  const status = determineStatusFromValue(parsedValue, referenceRange);

  return {
    id: uuidv4(),
    testName: englishName,
    standardizedName,
    value: parsedValue.value,
    unit,
    referenceRange,
    status,
    category,
  };
}

export function cleanColumnName(columnName: string): string {
  return columnName
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[—–-]/g, '-')
    .trim();
}

export function parseExcelDate(excelDate: number): Date {
  const excelEpoch = new Date(1899, 11, 30);
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + excelDate * msPerDay);
}
