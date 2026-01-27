import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { LabReport, LabResultValue, LabCategory, CATEGORY_DISPLAY_NAMES } from '@/types/labResults';
import { BIOMARKERS, findBiomarkerByName, getReferenceRange } from '@/data/biomarkers';

interface ManualEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: LabReport) => void;
  gender?: 'male' | 'female';
}

interface FormValues {
  date: string;
  testName: string;
  value: string;
  unit: string;
}

interface PendingResult {
  id: string;
  testName: string;
  value: number | string;
  unit: string;
  standardizedName: string;
  category: LabCategory;
}

export default function ManualEntryForm({
  isOpen,
  onClose,
  onSubmit,
  gender,
}: ManualEntryFormProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      testName: '',
      value: '',
      unit: '',
    },
  });

  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const testName = watch('testName');

  const suggestions = testName
    ? BIOMARKERS.filter(
        (b) =>
          b.englishName.toLowerCase().includes(testName.toLowerCase()) ||
          b.standardizedName.includes(testName.toLowerCase())
      ).slice(0, 5)
    : [];

  if (!isOpen) return null;

  const handleSelectSuggestion = (biomarker: typeof BIOMARKERS[0]) => {
    setValue('testName', biomarker.englishName);
    setValue('unit', biomarker.defaultUnit);
    setShowSuggestions(false);
  };

  const handleAddResult = (data: FormValues) => {
    const biomarker = findBiomarkerByName(data.testName);
    const numericValue = parseFloat(data.value);
    const value = isNaN(numericValue) ? data.value : numericValue;

    const result: PendingResult = {
      id: uuidv4(),
      testName: biomarker?.englishName || data.testName,
      value,
      unit: data.unit || biomarker?.defaultUnit || '',
      standardizedName:
        biomarker?.standardizedName ||
        data.testName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      category: biomarker?.category || 'other',
    };

    setPendingResults([...pendingResults, result]);
    setValue('testName', '');
    setValue('value', '');
    setValue('unit', '');
  };

  const handleRemoveResult = (id: string) => {
    setPendingResults(pendingResults.filter((r) => r.id !== id));
  };

  const handleFinalSubmit = () => {
    const date = watch('date');

    const results: LabResultValue[] = pendingResults.map((pr) => {
      const biomarker = findBiomarkerByName(pr.testName);
      const referenceRange = biomarker
        ? getReferenceRange(biomarker, gender)
        : { displayText: 'N/A' };

      let status: 'normal' | 'low' | 'high' | 'critical' = 'normal';
      if (typeof pr.value === 'number' && biomarker) {
        const ref = getReferenceRange(biomarker, gender);
        if (ref.min !== undefined && pr.value < ref.min) {
          status = pr.value < ref.min * 0.8 ? 'critical' : 'low';
        } else if (ref.max !== undefined && pr.value > ref.max) {
          status = pr.value > ref.max * 1.2 ? 'critical' : 'high';
        }
      }

      return {
        id: pr.id,
        testName: pr.testName,
        standardizedName: pr.standardizedName,
        value: pr.value,
        unit: pr.unit,
        referenceRange,
        status,
        category: pr.category,
      };
    });

    const report: LabReport = {
      id: uuidv4(),
      date: new Date(date),
      source: 'manual',
      results,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onSubmit(report);
    handleClose();
  };

  const handleClose = () => {
    reset();
    setPendingResults([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Add Lab Results Manually</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Date
            </label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-800 mb-3">Add Test Result</h3>

            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm text-gray-600 mb-1">
                  Test Name
                </label>
                <input
                  {...register('testName')}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g., Hemoglobin, Vitamin D"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {suggestions.map((s) => (
                      <button
                        key={s.standardizedName}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                      >
                        <span className="font-medium">{s.englishName}</span>
                        <span className="text-gray-400 ml-2">
                          ({CATEGORY_DISPLAY_NAMES[s.category]})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Value</label>
                  <input
                    {...register('value')}
                    placeholder="e.g., 145"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Unit</label>
                  <input
                    {...register('unit')}
                    placeholder="e.g., g/L"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit(handleAddResult)}
                disabled={!testName || !watch('value')}
                className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FiPlus /> Add to List
              </button>
            </div>
          </div>

          {pendingResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                Results to Add ({pendingResults.length})
              </div>
              {pendingResults.map((result) => (
                <div
                  key={result.id}
                  className="px-4 py-2 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">{result.testName}</span>
                    <span className="text-gray-500 ml-2">
                      {result.value} {result.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveResult(result.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={pendingResults.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save {pendingResults.length} Result(s)
          </button>
        </div>
      </div>
    </div>
  );
}
