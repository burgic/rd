import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

interface DirectReportData {
  reportTitle: string;
  reportType: string;
  reportContent: string;
}

interface ChecklistItem {
  score: number;
  strengths: string[];
  weaknesses: string[];
}

interface ChecklistFeedback {
  advance: ChecklistItem;
  uncertainty: ChecklistItem;
  professionals: ChecklistItem;
  process: ChecklistItem;
  aifAlignment: ChecklistItem;
  costs: ChecklistItem;
  payeCap: ChecklistItem;
  grants: ChecklistItem;
  ct600: ChecklistItem;
  evidence: ChecklistItem;
  conduct: ChecklistItem;
  fraudTribunal: ChecklistItem;
  esoteric: ChecklistItem;
}

interface AnalysisResult {
  overallScore: number;
  complianceScore: number;
  checklistFeedback: ChecklistFeedback;
  recommendations: string[];
  detailedFeedback: string;
}

const DirectReportAnalysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const requestMadeRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reportData = location.state as DirectReportData;

  // Single effect that runs once when component mounts with valid data
  useEffect(() => {
    // Early validation
    if (!reportData?.reportTitle || !reportData?.reportContent) {
      navigate('/direct-report-form');
      return;
    }

    if (!user?.id) {
      navigate('/');
      return;
    }

    // Prevent multiple requests - only make request once per component lifecycle
    if (requestMadeRef.current) {
      console.log('Request already made for this component instance, skipping');
      return;
    }

    // Mark that we're making a request
    requestMadeRef.current = true;
    console.log('Making direct report analysis request for:', reportData.reportTitle);
    
    // Make the analysis request
    analyzeReport();

    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('Aborted direct report analysis request due to component unmount');
      }
    };
  }, []);

  const analyzeReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Call the direct report reviewer function
      console.log('Sending direct report analysis request with userId:', user?.id);
      const response = await fetch('/.netlify/functions/report-reviewer-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          reportContent: reportData.reportContent,
          reportTitle: reportData.reportTitle,
          reportType: reportData.reportType
        }),
        signal: abortController.signal, // Add abort signal
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        console.log('Request was aborted');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a minute before submitting another report.');
        }
        throw new Error(errorData.error || 'Failed to analyze report');
      }

      const data = await response.json();
      setResult(data.analysis);
      setReviewId(data.reviewId);

    } catch (error: any) {
      // Don't show errors for aborted requests
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Direct Report Analysis error:', error);
      setError(error.message || 'Failed to analyze report. Please try again.');
      requestMadeRef.current = false; // Reset flag on error to allow retry
    } finally {
      setLoading(false);
      abortControllerRef.current = null; // Clear abort controller reference
    }
  };

  const handleNewAnalysis = () => {
    navigate('/direct-report-form');
  };

  const handleViewHistory = () => {
    navigate('/report-history');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const checklistLabels = {
    advance: 'Advance in Science/Technology',
    uncertainty: 'Technical Uncertainties',
    professionals: 'Competent Professionals',
    process: 'Systematic Process',
    aifAlignment: 'AIF Alignment',
    costs: 'Cost Breakdown',
    payeCap: 'PAYE/NIC Cap',
    grants: 'Grant Treatment',
    ct600: 'CT600 Consistency',
    evidence: 'Evidence',
    conduct: 'Professional Conduct',
    fraudTribunal: 'Fraud/Tribunal Lessons',
    esoteric: 'Esoteric Analysis'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Analyzing Your R&D Report
            </h2>
            <p className="text-gray-600">
              Our AI is reviewing your report against HMRC's 14-point compliance criteria...
            </p>
            <div className="mt-4 text-sm text-purple-600">
              This may take up to 30 seconds
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              {error?.includes('Rate limit') ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  Please wait a minute before trying again. This helps us maintain service quality for all users.
                </div>
              ) : null}
              <button
                onClick={() => {
                  requestMadeRef.current = false;
                  setError(null);
                  navigate('/direct-report-form');
                }}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">R&D Report Analysis</h1>
            <p className="text-purple-100 mt-2">HMRC Compliance Review for "{reportData.reportTitle}"</p>
            <div className="flex items-center mt-3 text-purple-200 text-sm">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Analysis completed • {reviewId && `Review ID: ${reviewId}`}
            </div>
          </div>

          {/* Overall Scores */}
          <div className="p-8 border-b">
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-lg border ${getScoreBg(result.overallScore)}`}>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Overall Score</h2>
                <div className={`text-4xl font-bold ${getScoreColor(result.overallScore)} mb-2`}>
                  {result.overallScore}/100
                </div>
                <p className="text-sm text-gray-600">
                  {result.overallScore >= 80 ? 'Excellent compliance' : 
                   result.overallScore >= 60 ? 'Good with improvements needed' :
                   result.overallScore >= 40 ? 'Fair - requires attention' : 'Poor - significant issues'}
                </p>
              </div>
              
              <div className={`p-6 rounded-lg border ${getScoreBg(result.complianceScore)}`}>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">HMRC Compliance</h2>
                <div className={`text-4xl font-bold ${getScoreColor(result.complianceScore)} mb-2`}>
                  {result.complianceScore}/100
                </div>
                <p className="text-sm text-gray-600">
                  {result.complianceScore >= 80 ? 'Strong compliance indicators' : 
                   result.complianceScore >= 60 ? 'Compliant with minor gaps' :
                   result.complianceScore >= 40 ? 'Compliance concerns present' : 'Major compliance issues'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Checklist Results */}
          <div className="p-8 border-b">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">14-Point HMRC Compliance Checklist</h3>
            <div className="grid lg:grid-cols-2 gap-6">
              {Object.entries(result.checklistFeedback).map(([key, item]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">{checklistLabels[key as keyof typeof checklistLabels]}</h4>
                    <span className={`font-bold text-lg ${getScoreColor(item.score)}`}>
                      {item.score}/100
                    </span>
                  </div>
                  
                                     {item.strengths && item.strengths.length > 0 && (
                     <div className="mb-3">
                       <h5 className="text-sm font-medium text-green-700 mb-1">✅ Strengths:</h5>
                       <ul className="text-sm text-green-600 space-y-1">
                         {item.strengths.map((strength: string, idx: number) => (
                           <li key={idx}>• {strength}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                   
                   {item.weaknesses && item.weaknesses.length > 0 && (
                     <div>
                       <h5 className="text-sm font-medium text-red-700 mb-1">⚠️ Areas for Improvement:</h5>
                       <ul className="text-sm text-red-600 space-y-1">
                         {item.weaknesses.map((weakness: string, idx: number) => (
                           <li key={idx}>• {weakness}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="p-8 border-b">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.detailedFeedback}</p>
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="p-8 border-b">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Actionable Recommendations</h3>
              <div className="bg-blue-50 rounded-lg p-6">
                <ul className="space-y-3">
                                     {result.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-gray-50 px-8 py-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleNewAnalysis}
              className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 font-medium transition-colors"
            >
              🔍 Analyze Another Report
            </button>
            <button
              onClick={handleViewHistory}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-medium transition-colors"
            >
              📋 View Report History
            </button>
          </div>
        </div>

        {/* Professional Disclaimer */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-800">Professional Review Required</h4>
              <p className="text-yellow-700 mt-1">
                This AI analysis is for guidance only and should not replace professional tax advice. 
                R&D tax credit compliance is complex and requires expert review. Always consult with a 
                qualified R&D tax advisor before finalizing any claims or submissions to HMRC.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectReportAnalysis; 