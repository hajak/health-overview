import React, { useState, useEffect } from 'react';
import { FiUpload, FiPlus, FiTrendingUp, FiList, FiAlertCircle } from 'react-icons/fi';
import {
  LabReport,
  LabResultValue,
  CategorySummary,
  LabCategory,
  CATEGORY_DISPLAY_NAMES,
  TestHistoryPoint,
} from '@/types/labResults';
import {
  getLabResults,
  getCategorySummaries,
  getTestHistory,
  addLabReport,
  getAbnormalResults,
} from '@/Helpers/labResultsHelper';
import CategoryCard from './CategoryCard';
import LabResultsTable from './LabResultsTable';
import BiomarkerTrendChart from './BiomarkerTrendChart';
import UploadModal from './UploadModal';
import ManualEntryForm from './ManualEntryForm';
import StatusBadge from './StatusBadge';

interface LabResultsDashboardProps {
  userEmail: string;
  gender?: 'male' | 'female';
}

type ViewMode = 'overview' | 'category' | 'trend';

export default function LabResultsDashboard({
  userEmail,
  gender,
}: LabResultsDashboardProps) {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [abnormalReports, setAbnormalReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedCategory, setSelectedCategory] = useState<LabCategory | null>(null);
  const [selectedTest, setSelectedTest] = useState<LabResultValue | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistoryPoint[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [labReports, summaries, abnormal] = await Promise.all([
        getLabResults(userEmail),
        getCategorySummaries(userEmail),
        getAbnormalResults(userEmail),
      ]);
      setReports(labReports);
      setCategorySummaries(summaries);
      setAbnormalReports(abnormal);
    } catch (err) {
      console.error('Failed to load lab results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userEmail]);

  const handleUpload = async (newReports: LabReport[]) => {
    for (const report of newReports) {
      await addLabReport(userEmail, report);
    }
    await loadData();
  };

  const handleManualSubmit = async (report: LabReport) => {
    await addLabReport(userEmail, report);
    await loadData();
  };

  const handleSelectCategory = (category: LabCategory) => {
    setSelectedCategory(category);
    setViewMode('category');
  };

  const handleSelectTest = async (result: LabResultValue) => {
    setSelectedTest(result);
    const history = await getTestHistory(userEmail, result.standardizedName);
    setTestHistory(history);
    setViewMode('trend');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedCategory(null);
    setSelectedTest(null);
    setTestHistory([]);
  };

  const filteredReports = selectedCategory
    ? reports
        .map((r) => ({
          ...r,
          results: r.results.filter((res) => res.category === selectedCategory),
        }))
        .filter((r) => r.results.length > 0)
    : reports;

  const totalAbnormal = abnormalReports.reduce(
    (sum, r) => sum + r.results.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lab Results</h1>
          <p className="text-gray-500">
            {reports.length} reports | {categorySummaries.length} categories tracked
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManualEntry(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiPlus /> Manual Entry
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiUpload /> Upload File
          </button>
        </div>
      </div>

      {viewMode !== 'overview' && (
        <button
          onClick={handleBackToOverview}
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          &larr; Back to Overview
        </button>
      )}

      {viewMode === 'overview' && (
        <>
          {totalAbnormal > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <FiAlertCircle className="text-orange-500 text-2xl flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-800">
                  {totalAbnormal} results out of range
                </p>
                <p className="text-sm text-orange-600">
                  Review your recent lab results for values that need attention
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorySummaries.map((summary) => (
              <CategoryCard
                key={summary.category}
                summary={summary}
                onClick={() => handleSelectCategory(summary.category)}
              />
            ))}
          </div>

          {reports.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Recent Results
              </h2>
              <div className="space-y-4">
                {reports.slice(0, 3).map((report) => (
                  <LabResultsTable
                    key={report.id}
                    report={report}
                    onSelectTest={handleSelectTest}
                  />
                ))}
              </div>
            </div>
          )}

          {reports.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <FiList className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">No lab results yet</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Results
                </button>
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Add Manually
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'category' && selectedCategory && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {CATEGORY_DISPLAY_NAMES[selectedCategory]}
          </h2>
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <LabResultsTable
                key={report.id}
                report={report}
                onSelectTest={handleSelectTest}
              />
            ))}
          </div>
        </div>
      )}

      {viewMode === 'trend' && selectedTest && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedTest.testName}
            </h2>
            <StatusBadge status={selectedTest.status} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <BiomarkerTrendChart
              testName={selectedTest.testName}
              history={testHistory}
              unit={selectedTest.unit}
              referenceRange={selectedTest.referenceRange}
              height={300}
            />
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              All Measurements
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
              {testHistory.map((point, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">
                      {point.value} {point.unit}
                    </span>
                    <span className="text-gray-400 ml-2">
                      ({point.referenceRange.displayText})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={point.status} size="sm" />
                    <span className="text-sm text-gray-500">
                      {new Date(point.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        gender={gender}
      />

      <ManualEntryForm
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={handleManualSubmit}
        gender={gender}
      />
    </div>
  );
}
