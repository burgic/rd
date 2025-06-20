import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ReportUploadProps {}

const ReportUpload: React.FC<ReportUploadProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState('rd_report');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelection = (selectedFile: File) => {
    setError(null);
    
    // Check file type
    const allowedTypes = [
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload a Word document (.doc, .docx), PDF, or text file (.txt)');
      return;
    }
    
    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'text/plain') {
        // Handle text files
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        // For PDF files, we'll need to handle them differently
        // For now, we'll reject PDFs and suggest conversion
        reject(new Error('PDF files are not yet supported. Please convert to Word or text format.'));
      } else {
        // For Word documents, we'll read as text (basic extraction)
        // Note: This is a simple approach. For production, you might want to use a proper Word parser
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          // Basic text extraction from Word files (this is simplified)
          // In production, you'd want to use a library like mammoth.js
          const text = new TextDecoder().decode(arrayBuffer);
          resolve(text);
        };
        reader.onerror = () => reject(new Error('Failed to read Word document'));
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleUpload = async () => {
    if (!file || !user) {
      setError('Please select a file and ensure you are logged in');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Extract text content from file
      let textContent: string;
      try {
        textContent = await extractTextFromFile(file);
      } catch (extractError: any) {
        throw new Error(`Failed to extract text from file: ${extractError.message}`);
      }

      // Validate content length
      if (textContent.length < 100) {
        throw new Error('The document appears to be too short or empty. Please ensure it contains R&D report content.');
      }

      if (textContent.length > 50000) {
        // Truncate very long documents
        textContent = textContent.substring(0, 50000) + '\n\n[Document truncated for analysis]';
      }

      // Navigate to analysis page with the data
      navigate('/report-analysis', {
        state: {
          reportContent: textContent,
          fileName: file.name,
          reportType,
          fileSize: file.size
        }
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to process file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <FileText className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">R&D Report Reviewer</h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Upload your R&D technical report for AI-powered analysis against HMRC criteria. 
                Get detailed feedback on compliance, strengths, and areas for improvement.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Report Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rd_report">R&D Technical Report</option>
                  <option value="hmrc_submission">HMRC Submission Document</option>
                  <option value="project_documentation">Project Documentation</option>
                  <option value="technical_specification">Technical Specification</option>
                </select>
              </div>

              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Document
                </label>
                
                {!file ? (
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">
                        Drop your file here, or{' '}
                        <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                          browse
                          <input
                            type="file"
                            className="hidden"
                            accept=".txt,.doc,.docx,.pdf"
                            onChange={handleFileInputChange}
                          />
                        </label>
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports: Word documents (.doc, .docx), Text files (.txt), PDF files
                      </p>
                      <p className="text-xs text-gray-400">
                        Maximum file size: 10MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Analysis Guidelines</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Ensure your document contains detailed technical information about R&D activities</li>
                  <li>• Include project objectives, technical challenges, and solutions attempted</li>
                  <li>• Document uncertainties faced and how they were resolved</li>
                  <li>• The more detailed your report, the more accurate the analysis will be</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <button
                  onClick={() => navigate('/overview')}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Overview
                </button>
                
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Analyze Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportUpload; 