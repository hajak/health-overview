import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiFile, FiCheck, FiLoader } from 'react-icons/fi';
import { LabReport } from '@/types/labResults';
import { parseExcelFile } from '@/lib/parsers/excelParser';
import { parsePdfFile } from '@/lib/parsers/pdfParser';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (reports: LabReport[]) => void;
  gender?: 'male' | 'female';
}

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'success' | 'error';

export default function UploadModal({
  isOpen,
  onClose,
  onUpload,
  gender,
}: UploadModalProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedReports, setParsedReports] = useState<LabReport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setStatus('parsing');

    try {
      let reports: LabReport[];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reports = await parseExcelFile(file, gender);
      } else if (file.name.endsWith('.pdf')) {
        reports = await parsePdfFile(file, gender);
      } else {
        throw new Error('Unsupported file format. Please upload an Excel (.xlsx) or PDF file.');
      }

      if (reports.length === 0) {
        throw new Error('No lab results found in the file.');
      }

      setParsedReports(reports);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    onUpload(parsedReports);
    handleClose();
  };

  const handleClose = () => {
    setStatus('idle');
    setError(null);
    setSelectedFile(null);
    setParsedReports([]);
    onClose();
  };

  const totalResults = parsedReports.reduce(
    (sum, report) => sum + report.results.length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Upload Lab Results</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          {status === 'idle' && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <FiUpload className="mx-auto text-4xl text-gray-400 mb-3" />
                <p className="text-gray-600 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-400">
                  Supports Excel (.xlsx) and PDF files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}

          {status === 'parsing' && (
            <div className="text-center py-8">
              <FiLoader className="mx-auto text-4xl text-blue-500 animate-spin mb-3" />
              <p className="text-gray-600">Parsing {selectedFile?.name}...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <FiCheck className="mx-auto text-4xl text-green-500 mb-3" />
              <p className="text-gray-800 font-medium mb-2">
                Successfully parsed!
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <FiFile className="text-gray-400" />
                  <span className="text-sm text-gray-600">{selectedFile?.name}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Found <strong>{parsedReports.length}</strong> report(s) with{' '}
                  <strong>{totalResults}</strong> test results
                </p>
                <div className="mt-2 text-sm text-gray-500">
                  Dates:{' '}
                  {parsedReports
                    .map((r) =>
                      new Date(r.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    )
                    .join(', ')}
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <div className="bg-red-50 text-red-600 rounded-lg p-4 mb-4">
                {error}
              </div>
              <button
                onClick={() => {
                  setStatus('idle');
                  setError(null);
                  setSelectedFile(null);
                }}
                className="text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {status === 'success' && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import {totalResults} Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
