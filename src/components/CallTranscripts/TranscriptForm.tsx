import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TranscriptForm: React.FC = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [callDate, setCallDate] = useState('');
  const [callDuration, setCallDuration] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim() || !transcript.trim()) {
      setError('Please fill in the client name and transcript');
      return;
    }

    if (transcript.length < 100) {
      setError('Please provide a more detailed transcript (at least 100 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Navigate to analysis page with the data
      navigate('/call-transcript-analysis', {
        state: {
          clientName: clientName.trim(),
          callDate: callDate || null,
          callDuration: callDuration || null,
          transcript: transcript.trim()
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
      if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        setError('Please upload a text file (.txt)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTranscript(content);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Call Transcript Analysis</h1>
            <p className="text-green-100 mt-2">
              Analyze client calls to extract R&D-relevant information and assess HMRC compliance
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* Client Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter client name"
                  required
                />
              </div>

              <div>
                <label htmlFor="callDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Call Date
                </label>
                <input
                  type="date"
                  id="callDate"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="callDuration" className="block text-sm font-medium text-gray-700 mb-2">
                Call Duration
              </label>
              <input
                type="text"
                id="callDuration"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="e.g., 45 minutes, 1 hour 15 minutes"
              />
            </div>

            {/* Transcript Input */}
            <div>
              <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-2">
                Call Transcript *
              </label>
              <div className="space-y-4">
                {/* File Upload Option */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload transcript file
                      </span>
                      <span className="mt-1 block text-sm text-gray-600">
                        or drag and drop a .txt file here
                      </span>
                    </label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".txt,text/plain"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </div>
                </div>

                {/* Manual Text Input */}
                <div className="text-center">
                  <span className="text-sm text-gray-500">or type/paste the transcript below</span>
                </div>

                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-vertical"
                  placeholder="Paste or type the call transcript here. Include as much detail as possible about technical discussions, challenges, and R&D activities mentioned during the call..."
                  required
                />
                <div className="text-sm text-gray-500 text-right">
                  {transcript.length} characters (minimum 100 required)
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Tips for Better Analysis</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Include technical discussions and challenges mentioned</li>
                <li>• Note any development work, research activities, or innovations discussed</li>
                <li>• Include specific processes, technologies, or methodologies mentioned</li>
                <li>• Capture any uncertainties or problem-solving approaches discussed</li>
                <li>• Include cost estimates, timelines, or resource allocations if mentioned</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !clientName.trim() || !transcript.trim() || transcript.length < 100}
              className={`w-full py-4 px-6 rounded-lg text-white font-medium text-lg transition-colors ${
                loading || !clientName.trim() || !transcript.trim() || transcript.length < 100
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Analyze Call Transcript'
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

export default TranscriptForm; 