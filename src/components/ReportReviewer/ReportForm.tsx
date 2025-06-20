import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState('rd_report');
  const [reportContent, setReportContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportTitle.trim() || !reportContent.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (reportContent.length < 100) {
      setError('Please provide a more detailed report (at least 100 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Navigate to analysis page with the data
      navigate('/report-analysis', {
        state: {
          reportTitle: reportTitle.trim(),
          reportType: reportType,
          reportContent: reportContent.trim()
        }
      });
    } catch (error: any) {
      console.error('Navigation error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('text') && !file.name.match(/\.(txt|doc|docx|pdf)$/i)) {
        setError('Please upload a text file (.txt, .doc, .docx, or .pdf)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setReportContent(content);
        setError(null);
        
        // Auto-populate title if empty
        if (!reportTitle.trim()) {
          const fileName = file.name.replace(/\.[^/.]+$/, '');
          setReportTitle(fileName);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    }
  };

  const reportTypes = [
    { value: 'rd_report', label: 'R&D Tax Report' },
    { value: 'technical_report', label: 'Technical Report' },
    { value: 'project_documentation', label: 'Project Documentation' },
    { value: 'compliance_review', label: 'Compliance Review' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Report Review</h1>
            <p className="text-purple-100 mt-2">
              Paste your R&D report content for comprehensive HMRC compliance analysis
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* Report Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="reportTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Report Title *
                </label>
                <input
                  type="text"
                  id="reportTitle"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="Enter report title or name"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  id="reportType"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                                     {reportTypes.map((type: { value: string; label: string }) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Report Content Input */}
            <div>
              <label htmlFor="reportContent" className="block text-sm font-medium text-gray-700 mb-2">
                Report Content *
              </label>
              <div className="space-y-4">
                {/* File Upload Option */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload report file
                      </span>
                      <span className="mt-1 block text-sm text-gray-600">
                        or drag and drop a .txt, .doc, .docx, or .pdf file here
                      </span>
                    </label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".txt,.doc,.docx,.pdf,text/plain"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </div>
                </div>

                {/* Manual Text Input */}
                <div className="text-center">
                  <span className="text-sm text-gray-500">or paste the report content below</span>
                </div>

                <textarea
                  id="reportContent"
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-vertical font-mono text-sm"
                  placeholder="Paste or type your R&D report content here. Include technical details, project descriptions, costs, evidence, and any compliance documentation. The more detailed the content, the better the analysis..."
                  required
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Minimum 100 characters required</span>
                  <span>{reportContent.length.toLocaleString()} characters</span>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-purple-800 mb-3">📋 HMRC Compliance Checklist</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-purple-700 mb-2">Technical Requirements:</h4>
                  <ul className="text-sm text-purple-600 space-y-1">
                    <li>• Advance in science/technology</li>
                    <li>• Technical uncertainties identified</li>
                    <li>• Competent professionals named</li>
                    <li>• Systematic investigative process</li>
                    <li>• Contemporaneous evidence</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-purple-700 mb-2">Compliance & Financial:</h4>
                  <ul className="text-sm text-purple-600 space-y-1">
                    <li>• AIF alignment and consistency</li>
                    <li>• Detailed cost breakdown</li>
                    <li>• PAYE/NIC cap compliance</li>
                    <li>• Grant/subsidy treatment</li>
                    <li>• CT600 consistency</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-sm text-purple-600">
                  <strong>Pro Tip:</strong> Our AI analyzes against all 14 HMRC compliance criteria including recent tribunal lessons and esoteric considerations.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !reportTitle.trim() || !reportContent.trim() || reportContent.length < 100}
              className={`w-full py-4 px-6 rounded-lg text-white font-medium text-lg transition-colors ${
                loading || !reportTitle.trim() || !reportContent.trim() || reportContent.length < 100
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                '🔍 Analyze Report Compliance'
              )}
            </button>
          </form>

          <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-500">
            <p>This analysis is for guidance only and should be reviewed by qualified R&D tax professionals.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportForm; 