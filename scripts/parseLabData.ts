import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { BIOMARKERS, findBiomarkerBySwedishName } from '../data/biomarkers';
import { LabCategory, ResultStatus, ReferenceRange, determineStatus } from '../types/labResults';

interface ParsedLabResult {
  testName: string;
  standardizedName: string;
  value: number | string;
  unit: string;
  referenceRange: ReferenceRange;
  status: ResultStatus;
  category: LabCategory;
}

interface ParsedLabReport {
  date: string;
  results: ParsedLabResult[];
}

function parseValue(raw: unknown): { value: number | string; isLessThan: boolean } {
  if (raw === null || raw === undefined || raw === '') {
    return { value: NaN, isLessThan: false };
  }

  const str = String(raw).trim();

  if (str === 'NaN' || str === 'SAKNA' || str === 'KOMM') {
    return { value: NaN, isLessThan: false };
  }

  if (str.startsWith('<')) {
    const num = parseFloat(str.slice(1));
    return { value: num, isLessThan: true };
  }

  if (str.startsWith('>')) {
    const num = parseFloat(str.slice(1));
    return { value: num, isLessThan: false };
  }

  const num = parseFloat(str);
  return { value: isNaN(num) ? str : num, isLessThan: false };
}

function extractUnitFromColumnName(colName: string): string {
  const match = colName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : '';
}

function extractTestNameFromColumnName(colName: string): string {
  return colName.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

function main() {
  const excelPath = path.join(process.cwd(), 'DATA', 'FILES', 'Provsvar.xlsx');
  const outputPath = path.join(process.cwd(), 'DATA', 'lab_results.json');

  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  const reports: ParsedLabReport[] = [];

  for (const row of data as Record<string, unknown>[]) {
    const dateRaw = row['Datum'];
    if (!dateRaw) continue;

    let dateStr: string;
    if (typeof dateRaw === 'number') {
      const date = XLSX.SSF.parse_date_code(dateRaw);
      dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    } else {
      const d = new Date(dateRaw as string);
      dateStr = d.toISOString().split('T')[0];
    }

    const results: ParsedLabResult[] = [];

    for (const [colName, rawValue] of Object.entries(row)) {
      if (colName === 'Datum') continue;

      const { value, isLessThan } = parseValue(rawValue);
      if (typeof value === 'number' && isNaN(value)) continue;
      if (typeof value === 'string' && value === '') continue;

      const testName = extractTestNameFromColumnName(colName);
      const unit = extractUnitFromColumnName(colName);

      const biomarker = findBiomarkerBySwedishName(testName);

      let status: ResultStatus = 'normal';
      let referenceRange: ReferenceRange = { displayText: 'N/A' };
      let category: LabCategory = 'other';
      let standardizedName = testName.toLowerCase().replace(/[^a-z0-9]/g, '_');

      if (biomarker) {
        standardizedName = biomarker.standardizedName;
        category = biomarker.category;
        const range = biomarker.referenceRange.male || biomarker.referenceRange.general;
        if (range) {
          referenceRange = range;
          if (typeof value === 'number') {
            if (isLessThan) {
              status = range.max !== undefined && value < range.max ? 'normal' : 'low';
            } else {
              status = determineStatus(value, range);
            }
          }
        }
      }

      results.push({
        testName,
        standardizedName,
        value: isLessThan ? `<${value}` : value,
        unit,
        referenceRange,
        status,
        category,
      });
    }

    if (results.length > 0) {
      reports.push({ date: dateStr, results });
    }
  }

  reports.sort((a, b) => b.date.localeCompare(a.date));

  fs.writeFileSync(outputPath, JSON.stringify({ reports }, null, 2));
  console.log(`Parsed ${reports.length} lab reports to ${outputPath}`);

  const allTests = new Set<string>();
  for (const report of reports) {
    for (const result of report.results) {
      allTests.add(result.standardizedName);
    }
  }
  console.log(`Found ${allTests.size} unique tests`);
}

main();
