import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  LabReport,
  LabReportFirestore,
  LabResultsFilter,
  TestHistoryPoint,
  CategorySummary,
  convertFirestoreToLabReport,
  convertLabReportToFirestore,
  CATEGORY_DISPLAY_NAMES,
  LabCategory,
} from '@/types/labResults';

export async function addLabReport(
  userEmail: string,
  report: LabReport
): Promise<void> {
  const userRef = doc(db, 'users', userEmail);
  const firestoreReport = convertLabReportToFirestore(report);

  await updateDoc(userRef, {
    labResults: arrayUnion(firestoreReport),
  });
}

export async function getLabResults(
  userEmail: string,
  filters?: LabResultsFilter
): Promise<LabReport[]> {
  const userRef = doc(db, 'users', userEmail);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return [];
  }

  const userData = userDoc.data();
  const labResultsRaw = (userData.labResults || []) as LabReportFirestore[];

  let labReports = labResultsRaw.map(convertFirestoreToLabReport);

  if (filters) {
    labReports = applyFilters(labReports, filters);
  }

  return labReports.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function applyFilters(
  reports: LabReport[],
  filters: LabResultsFilter
): LabReport[] {
  let filtered = reports;

  if (filters.startDate) {
    filtered = filtered.filter((r) => r.date >= filters.startDate!);
  }

  if (filters.endDate) {
    filtered = filtered.filter((r) => r.date <= filters.endDate!);
  }

  if (filters.source) {
    filtered = filtered.filter((r) => r.source === filters.source);
  }

  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.map((report) => ({
      ...report,
      results: report.results.filter((result) =>
        filters.categories!.includes(result.category)
      ),
    })).filter((report) => report.results.length > 0);
  }

  if (filters.status && filters.status.length > 0) {
    filtered = filtered.map((report) => ({
      ...report,
      results: report.results.filter((result) =>
        filters.status!.includes(result.status)
      ),
    })).filter((report) => report.results.length > 0);
  }

  return filtered;
}

export async function getTestHistory(
  userEmail: string,
  testName: string
): Promise<TestHistoryPoint[]> {
  const reports = await getLabResults(userEmail);
  const history: TestHistoryPoint[] = [];

  for (const report of reports) {
    const matchingResult = report.results.find(
      (r) =>
        r.standardizedName === testName ||
        r.testName.toLowerCase().includes(testName.toLowerCase())
    );

    if (matchingResult) {
      history.push({
        date: report.date,
        value: matchingResult.value,
        unit: matchingResult.unit,
        status: matchingResult.status,
        referenceRange: matchingResult.referenceRange,
        source: report.source,
      });
    }
  }

  return history.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getCategorySummaries(
  userEmail: string
): Promise<CategorySummary[]> {
  const reports = await getLabResults(userEmail);
  const categoryMap = new Map<LabCategory, CategorySummary>();

  for (const category of Object.keys(CATEGORY_DISPLAY_NAMES) as LabCategory[]) {
    categoryMap.set(category, {
      category,
      displayName: CATEGORY_DISPLAY_NAMES[category],
      totalTests: 0,
      normalCount: 0,
      abnormalCount: 0,
      lastTestDate: null,
    });
  }

  for (const report of reports) {
    for (const result of report.results) {
      const summary = categoryMap.get(result.category);
      if (summary) {
        summary.totalTests++;
        if (result.status === 'normal') {
          summary.normalCount++;
        } else {
          summary.abnormalCount++;
        }
        if (!summary.lastTestDate || report.date > summary.lastTestDate) {
          summary.lastTestDate = report.date;
        }
      }
    }
  }

  return Array.from(categoryMap.values()).filter((s) => s.totalTests > 0);
}

export async function getLatestResults(
  userEmail: string
): Promise<LabReport | null> {
  const reports = await getLabResults(userEmail);
  return reports.length > 0 ? reports[0] : null;
}

export async function getAbnormalResults(
  userEmail: string
): Promise<LabReport[]> {
  const reports = await getLabResults(userEmail);
  return reports.map((report) => ({
    ...report,
    results: report.results.filter((r) => r.status !== 'normal'),
  })).filter((report) => report.results.length > 0);
}

export async function deleteLabReport(
  userEmail: string,
  reportId: string
): Promise<void> {
  const userRef = doc(db, 'users', userEmail);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  const labResults = (userData.labResults || []) as LabReportFirestore[];
  const updatedResults = labResults.filter((r) => r.id !== reportId);

  await updateDoc(userRef, {
    labResults: updatedResults,
  });
}

export async function getAllUniqueTestNames(
  userEmail: string
): Promise<string[]> {
  const reports = await getLabResults(userEmail);
  const testNames = new Set<string>();

  for (const report of reports) {
    for (const result of report.results) {
      testNames.add(result.standardizedName);
    }
  }

  return Array.from(testNames).sort();
}
