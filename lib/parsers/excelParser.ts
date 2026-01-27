import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { LabReport, LabResultValue } from '@/types/labResults';
import { mapToLabResult, parseExcelDate } from './biomarkerMapper';

interface ParsedExcelRow {
  date: Date;
  results: LabResultValue[];
}

export async function parseExcelFile(
  file: File,
  gender?: 'male' | 'female'
): Promise<LabReport[]> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });

  if (jsonData.length === 0) {
    return [];
  }

  const headers = Object.keys(jsonData[0]);
  const dateColumnName = headers.find(
    (h) => h.toLowerCase().includes('datum') || h.toLowerCase() === 'date'
  );

  if (!dateColumnName) {
    throw new Error('Date column not found in Excel file');
  }

  const reports: LabReport[] = [];

  for (const row of jsonData) {
    const dateValue = row[dateColumnName];
    if (!dateValue) continue;

    let date: Date;
    if (typeof dateValue === 'number') {
      date = parseExcelDate(dateValue);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      continue;
    }

    if (isNaN(date.getTime())) continue;

    const results: LabResultValue[] = [];

    for (const header of headers) {
      if (header === dateColumnName) continue;

      const value = row[header];
      if (value === null || value === undefined || value === '') continue;

      const labResult = mapToLabResult(header, value as string | number, gender);
      if (labResult) {
        results.push(labResult);
      }
    }

    if (results.length > 0) {
      reports.push({
        id: uuidv4(),
        date,
        source: 'hospital',
        sourceFileName: file.name,
        results,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return reports.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function parseExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  gender?: 'male' | 'female'
): LabReport[] {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });

  if (jsonData.length === 0) {
    return [];
  }

  const headers = Object.keys(jsonData[0]);
  const dateColumnName = headers.find(
    (h) => h.toLowerCase().includes('datum') || h.toLowerCase() === 'date'
  );

  if (!dateColumnName) {
    throw new Error('Date column not found in Excel file');
  }

  const reports: LabReport[] = [];

  for (const row of jsonData) {
    const dateValue = row[dateColumnName];
    if (!dateValue) continue;

    let date: Date;
    if (typeof dateValue === 'number') {
      date = parseExcelDate(dateValue);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      continue;
    }

    if (isNaN(date.getTime())) continue;

    const results: LabResultValue[] = [];

    for (const header of headers) {
      if (header === dateColumnName) continue;

      const value = row[header];
      if (value === null || value === undefined || value === '') continue;

      const labResult = mapToLabResult(header, value as string | number, gender);
      if (labResult) {
        results.push(labResult);
      }
    }

    if (results.length > 0) {
      reports.push({
        id: uuidv4(),
        date,
        source: 'hospital',
        sourceFileName: fileName,
        results,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return reports.sort((a, b) => b.date.getTime() - a.date.getTime());
}
