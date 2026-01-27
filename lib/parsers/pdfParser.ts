import { v4 as uuidv4 } from 'uuid';
import { LabReport, LabResultValue, ReferenceRange, determineStatus } from '@/types/labResults';
import { findBiomarkerBySwedishName, getReferenceRange } from '@/data/biomarkers';
import { mapToLabResult } from './biomarkerMapper';

interface WerlabsResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
}

function parseReferenceRangeText(text: string): ReferenceRange {
  const trimmed = text.trim();

  const rangeMatch = trimmed.match(/^([\d.,]+)\s*[-–—]\s*([\d.,]+)$/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1].replace(',', '.')),
      max: parseFloat(rangeMatch[2].replace(',', '.')),
      operator: 'range',
      displayText: trimmed,
    };
  }

  const lessThanMatch = trimmed.match(/^[<≤]\s*([\d.,]+)$/);
  if (lessThanMatch) {
    return {
      max: parseFloat(lessThanMatch[1].replace(',', '.')),
      operator: '<',
      displayText: trimmed,
    };
  }

  const greaterThanMatch = trimmed.match(/^[>≥]\s*([\d.,]+)$/);
  if (greaterThanMatch) {
    return {
      min: parseFloat(greaterThanMatch[1].replace(',', '.')),
      operator: '>',
      displayText: trimmed,
    };
  }

  return { displayText: trimmed };
}

function extractWerlabsResults(text: string): WerlabsResult[] {
  const results: WerlabsResult[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);

  const resultPattern = /^([A-Za-zÀ-ÖØ-öø-ÿ\s\-(),0-9]+?)\s+([\d.,<>≤≥]+)\s*([^\d\s][^\d]*?)?\s*([\d.,\-–—<>≤≥]+(?:\s*[-–—]\s*[\d.,]+)?)?$/;

  for (const line of lines) {
    const match = line.match(resultPattern);
    if (match) {
      const testName = match[1].trim();
      const value = match[2].trim();
      const unit = (match[3] || '').trim();
      const refRange = (match[4] || '').trim();

      if (testName && value && !testName.match(/^(datum|date|page|sida)/i)) {
        results.push({
          testName,
          value,
          unit,
          referenceRange: refRange,
        });
      }
    }
  }

  return results;
}

function extractDateFromText(text: string): Date | null {
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})\.(\d{2})\.(\d{4})/,
    /(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i,
  ];

  const monthNames: Record<string, number> = {
    januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
    juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11,
  };

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('januari')) {
        const day = parseInt(match[1]);
        const month = monthNames[match[2].toLowerCase()];
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      } else if (match[0].includes('-')) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      }
    }
  }

  return null;
}

export async function parsePdfFile(
  file: File,
  gender?: 'male' | 'female'
): Promise<LabReport[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfParseModule = await import('pdf-parse') as any;
  const pdfParse = pdfParseModule.default || pdfParseModule;

  const pdfData = await pdfParse(Buffer.from(arrayBuffer));
  const text = pdfData.text;

  const date = extractDateFromText(text) || new Date();
  const werlabsResults = extractWerlabsResults(text);

  const results: LabResultValue[] = [];

  for (const wr of werlabsResults) {
    const biomarker = findBiomarkerBySwedishName(wr.testName);

    let value: number | string = wr.value;
    const numericMatch = wr.value.match(/^[<>]?\s*([\d.,]+)$/);
    if (numericMatch) {
      value = parseFloat(numericMatch[1].replace(',', '.'));
    }

    let referenceRange: ReferenceRange;
    if (wr.referenceRange) {
      referenceRange = parseReferenceRangeText(wr.referenceRange);
    } else if (biomarker) {
      referenceRange = getReferenceRange(biomarker, gender);
    } else {
      referenceRange = { displayText: 'N/A' };
    }

    let status: 'normal' | 'low' | 'high' | 'critical' = 'normal';
    if (typeof value === 'number' && referenceRange.min !== undefined || referenceRange.max !== undefined) {
      status = determineStatus(value as number, referenceRange);
    }

    results.push({
      id: uuidv4(),
      testName: biomarker?.englishName || wr.testName,
      standardizedName: biomarker?.standardizedName || wr.testName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      value,
      unit: wr.unit || biomarker?.defaultUnit || '',
      referenceRange,
      status,
      category: biomarker?.category || 'other',
    });
  }

  if (results.length === 0) {
    return [];
  }

  return [{
    id: uuidv4(),
    date,
    source: 'werlabs',
    sourceFileName: file.name,
    results,
    createdAt: new Date(),
    updatedAt: new Date(),
  }];
}

export async function parsePdfBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  gender?: 'male' | 'female'
): Promise<LabReport[]> {
  const pdfParseModule = await import('pdf-parse') as any;
  const pdfParse = pdfParseModule.default || pdfParseModule;

  const pdfData = await pdfParse(Buffer.from(buffer));
  const text = pdfData.text;

  const date = extractDateFromText(text) || new Date();
  const werlabsResults = extractWerlabsResults(text);

  const results: LabResultValue[] = [];

  for (const wr of werlabsResults) {
    const biomarker = findBiomarkerBySwedishName(wr.testName);

    let value: number | string = wr.value;
    const numericMatch = wr.value.match(/^[<>]?\s*([\d.,]+)$/);
    if (numericMatch) {
      value = parseFloat(numericMatch[1].replace(',', '.'));
    }

    let referenceRange: ReferenceRange;
    if (wr.referenceRange) {
      referenceRange = parseReferenceRangeText(wr.referenceRange);
    } else if (biomarker) {
      referenceRange = getReferenceRange(biomarker, gender);
    } else {
      referenceRange = { displayText: 'N/A' };
    }

    let status: 'normal' | 'low' | 'high' | 'critical' = 'normal';
    if (typeof value === 'number' && (referenceRange.min !== undefined || referenceRange.max !== undefined)) {
      status = determineStatus(value as number, referenceRange);
    }

    results.push({
      id: uuidv4(),
      testName: biomarker?.englishName || wr.testName,
      standardizedName: biomarker?.standardizedName || wr.testName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      value,
      unit: wr.unit || biomarker?.defaultUnit || '',
      referenceRange,
      status,
      category: biomarker?.category || 'other',
    });
  }

  if (results.length === 0) {
    return [];
  }

  return [{
    id: uuidv4(),
    date,
    source: 'werlabs',
    sourceFileName: fileName,
    results,
    createdAt: new Date(),
    updatedAt: new Date(),
  }];
}
