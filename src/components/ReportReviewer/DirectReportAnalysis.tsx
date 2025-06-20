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
  const [isProcessing, setIsProcessing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestMadeRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reportData = location.state as DirectReportData;

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

    // Prevent multiple requests
    if (requestMadeRef.current) {
      console.log('Request already made for this component instance, skipping');
      return;
    }

    requestMadeRef.current = true;
    console.log('Making direct report analysis request for:', reportData.reportTitle);
    
    const performAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        console.log('Sending request to report-reviewer-direct-background...');

        const response = await fetch('/.netlify/functions/report-reviewer-direct-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            reportContent: reportData.reportContent,
            reportTitle: reportData.reportTitle,
            reportType: reportData.reportType
          }),
          signal: abortController.signal
        });

        if (abortController.signal.aborted) return;

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorData;
          try {
            const responseText = await response.text();
            console.log('Error response text:', responseText);
            console.log('Error response length:', responseText.length);
            if (responseText) {
              errorData = JSON.parse(responseText);
            } else {
              errorData = { error: 'Empty response from server' };
            }
          } catch (parseError: unknown) {
            console.error('Failed to parse error response:', parseError);
            errorData = { error: `Server error (${response.status})` };
          }
          
          if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a minute.');
          throw new Error(errorData.error || 'Failed to analyze report');
        }

        let data;
        try {
          const responseText = await response.text();
          console.log('Success response length:', responseText.length);
          console.log('Success response preview:', responseText.substring(0, 200));
          
          if (!responseText) {
            throw new Error('Empty response from server');
          }
          if (responseText.trim() === '') {
            throw new Error('Response contains only whitespace');
          }
          
          data = JSON.parse(responseText);
          console.log('Parsed response data keys:', Object.keys(data));
          console.log('Has analysis:', !!data.analysis);
        } catch (parseError: unknown) {
          console.error('Failed to parse response JSON:', parseError);
          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
          console.error('Parse error details:', errorMessage);
          throw new Error('Invalid response from server. Please try again.');
        }

        if (response.status === 202 && data.status === 'processing') {
          setReviewId(data.reviewId);
          setIsProcessing(true);
          startPolling(data.reviewId);
        } else if (data.analysis) {
          // Direct response (fallback)
          setResult(data.analysis);
          setReviewId(data.reviewId);
          setLoading(false);
        } else {
          throw new Error('Invalid response format: unexpected response structure');
        }

      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Analysis error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to analyze report';
        setError(errorMessage);
        setLoading(false);
        requestMadeRef.current = false;
      }
    };

    performAnalysis();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('Aborted direct report analysis request due to component unmount');
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []); // Empty dependency array since we only want this to run once

  const startPolling = (reviewId: string) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/.netlify/functions/check-review-status?reviewId=${reviewId}`);
        if (!response.ok) throw new Error('Failed to check status');
        
        let data;
        try {
          const responseText = await response.text();
          if (!responseText) {
            throw new Error('Empty response from server');
          }
          data = JSON.parse(responseText);
        } catch (parseError: unknown) {
          console.error('Failed to parse polling response:', parseError);
          throw new Error('Invalid response from server');
        }

        if (data.status === 'completed') {
          setResult(data.analysis);
          setIsProcessing(false);
          stopPolling();
          setLoading(false);
        } else if (data.status === 'error') {
          setError(data.message || 'Analysis failed');
          setIsProcessing(false);
          stopPolling();
          setLoading(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Don't stop polling on single error, but limit retries
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('Invalid response') || errorMessage.includes('Empty response')) {
          setError('Server communication error. Please try again.');
          setIsProcessing(false);
          stopPolling();
          setLoading(false);
        }
      }
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
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

  if (loading || isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isProcessing ? 'Processing Your Report' : 'Initiating Analysis'}
            </h2>
            <p className="text-gray-600">
              {isProcessing ? 'Our AI is analyzing your report. This may take up to 60 seconds.' : 'Preparing your report for analysis...'}
            </p>
            {reviewId && (
              <p className="text-sm text-gray-500 mt-2">Review ID: {reviewId}</p>
            )}
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
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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
                  {item.strengths?.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-green-700 mb-1">✅ Strengths:</h5>
                      <ul className="text-sm text-green-600 space-y-1">
                        {item.strengths.map((strength: string, idx: number) => (
                          <li key={idx}>• {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {item.weaknesses?.length > 0 && (
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
          <div className="p-8 border-b">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.detailedFeedback}</p>
            </div>
          </div>
          {result.recommendations?.length > 0 && (
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