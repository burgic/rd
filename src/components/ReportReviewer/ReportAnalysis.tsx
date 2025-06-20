import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Award,
  AlertCircle,
  ArrowLeft,
  Download,
  RefreshCw
} from 'lucide-react';

interface ReportAnalysisData {
  reportContent: string;
  fileName: string;
  reportType: string;
  fileSize: number;
  documentId?: string;
  storagePath?: string;
}

interface AnalysisResult {
  overallScore: number;
  complianceScore: number;
  checklistFeedback?: {
    [key: string]: {
      score: number;
      strengths: string[];
      weaknesses: string[];
    };
  };
  // Legacy format support
  strengths?: string[];
  improvements?: string[];
  hmrcCompliance?: {
    [key: string]: { score: number; feedback: string };
  };
  recommendations: string[];
  detailedFeedback: string;
}

const ReportAnalysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analyzing, setAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestMadeRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reportData = location.state as ReportAnalysisData;

  // Single effect that runs once when component mounts with valid data
  useEffect(() => {
    // Early validation
    if (!reportData?.fileName || !reportData?.reportContent) {
      navigate('/report-form');
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
    console.log('Making report analysis request for:', reportData.fileName);
    
    // Make the analysis request
    analyzeReport();

    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('Aborted report analysis request due to component unmount');
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const analyzeReport = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Call the report analysis function
      console.log('Sending report analysis request with userId:', user?.id);
      const response = await fetch('/.netlify/functions/report-reviewer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          reportContent: reportData.reportContent,
          fileName: reportData.fileName,
          reportType: reportData.reportType,
          documentId: reportData.documentId || null
        }),
        signal: abortController.signal, // Add abort signal
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        console.log('Request was aborted');
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a minute before submitting another analysis.');
        }
        throw new Error('Failed to analyze report');
      }

      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse success response JSON:', parseError);
        console.log('Response text that failed to parse:', responseText);
        throw new Error('Invalid response format from server. Please try again.');
      }
      
      // Parse the AI response into structured data
      const parsedResult = parseAIResponse(data.response || data);
      setAnalysis(parsedResult);
      setReviewId(data.reviewId);

      // Save to database
      await saveAnalysis(parsedResult, data.reviewId);

      // If we have a document ID, update the document with the analysis link
      if (reportData.documentId && data.reviewId) {
        try {
          await supabase
            .from('documents')
            .update({ 
              related_report_review_id: data.reviewId,
              processing_status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', reportData.documentId);
        } catch (updateError) {
          console.error('Failed to update document with analysis link:', updateError);
          // Don't fail the whole process if this update fails
        }
      }

    } catch (error: any) {
      // Don't show errors for aborted requests
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Report analysis error:', error);
      setError(error.message || 'Failed to analyze report. Please try again.');
      requestMadeRef.current = false; // Reset flag on error to allow retry
    } finally {
      setAnalyzing(false);
      abortControllerRef.current = null; // Clear abort controller reference
    }
  };

  const parseAIResponse = (response: any): AnalysisResult => {
    try {
      // If response is already an object, use it directly
      if (typeof response === 'object' && response !== null) {
        return {
          overallScore: response.overallScore || 0,
          complianceScore: response.complianceScore || 0,
          checklistFeedback: response.checklistFeedback,
          strengths: response.strengths,
          improvements: response.improvements,
          hmrcCompliance: response.hmrcCompliance,
          recommendations: response.recommendations || [],
          detailedFeedback: response.detailedFeedback || 'Analysis completed'
        };
      }

      // Try to extract JSON from string response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallScore: parsed.overallScore || 0,
          complianceScore: parsed.complianceScore || 0,
          checklistFeedback: parsed.checklistFeedback,
          strengths: parsed.strengths,
          improvements: parsed.improvements,
          hmrcCompliance: parsed.hmrcCompliance,
          recommendations: parsed.recommendations || [],
          detailedFeedback: parsed.detailedFeedback || 'Analysis completed'
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback parsing if JSON fails
    return {
      overallScore: 0,
      complianceScore: 0,
      recommendations: ['Contact an R&D tax advisor for detailed guidance'],
      detailedFeedback: typeof response === 'string' ? response : 'Analysis completed'
    };
  };

  const saveAnalysis = async (analysisResult: AnalysisResult, reviewId?: string) => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('report_reviews')
        .insert({
          id: reviewId,
          user_id: user.id,
          file_name: reportData.fileName,
          report_type: reportData.reportType,
          file_size: reportData.fileSize,
          report_content: reportData.reportContent,
          overall_score: analysisResult.overallScore,
          compliance_score: analysisResult.complianceScore,
          strengths: getStrengths(analysisResult),
          improvements: getImprovements(analysisResult),
          recommendations: analysisResult.recommendations,
          detailed_feedback: analysisResult.detailedFeedback,
          hmrc_compliance: getHmrcCompliance(analysisResult),
          document_id: reportData.documentId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving analysis:', error);
      }
    } catch (error) {
      console.error('Save analysis error:', error);
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper functions to extract data from new API format
  const getStrengths = (analysis: AnalysisResult): string[] => {
    if (analysis.strengths) return analysis.strengths;
    if (analysis.checklistFeedback) {
      return Object.values(analysis.checklistFeedback)
        .flatMap(item => item.strengths || []);
    }
    return [];
  };

  const getImprovements = (analysis: AnalysisResult): string[] => {
    if (analysis.improvements) return analysis.improvements;
    if (analysis.checklistFeedback) {
      return Object.values(analysis.checklistFeedback)
        .flatMap(item => item.weaknesses || []);
    }
    return [];
  };

  const getHmrcCompliance = (analysis: AnalysisResult) => {
    if (analysis.hmrcCompliance) return analysis.hmrcCompliance;
    if (analysis.checklistFeedback) {
      const compliance: { [key: string]: { score: number; feedback: string } } = {};
      Object.entries(analysis.checklistFeedback).forEach(([key, value]) => {
        compliance[key] = {
          score: value.score,
          feedback: `Strengths: ${value.strengths.join(', ')}. Weaknesses: ${value.weaknesses.join(', ')}`
        };
      });
      return compliance;
    }
    return {};
  };

  const downloadReport = () => {
    if (!analysis) return;

    const reportContent = `
R&D REPORT ANALYSIS SUMMARY
===========================

File: ${reportData.fileName}
Type: ${reportData.reportType}
Analysis Date: ${new Date().toLocaleDateString()}

OVERALL SCORES
==============
Overall Score: ${analysis.overallScore}/100
HMRC Compliance Score: ${analysis.complianceScore}/100

STRENGTHS
=========
${getStrengths(analysis).map((s, i) => `${i + 1}. ${s}`).join('\n')}

AREAS FOR IMPROVEMENT
====================
${getImprovements(analysis).map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

HMRC COMPLIANCE BREAKDOWN
========================
${Object.entries(getHmrcCompliance(analysis)).map(([key, value]) => 
`${key.replace(/([A-Z])/g, ' $1').trim()}: ${value.score}/100
- ${value.feedback}`
).join('\n\n')}

RECOMMENDATIONS
===============
${(analysis.recommendations || []).map((r, i) => `${i + 1}. ${r}`).join('\n')}

DETAILED FEEDBACK
=================
${analysis.detailedFeedback}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.fileName}_analysis.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Analyzing Report
            </h2>
            <p className="text-gray-600">
              Our AI is reviewing {reportData?.fileName} against HMRC criteria...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
                  navigate('/report-form');
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Report Data</h2>
          <p className="text-gray-600 mb-4">Please upload a report first.</p>
          <button
            onClick={() => navigate('/report-upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Upload Report
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/report-upload')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Upload</span>
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Report Analysis</h1>
                  <p className="text-gray-600">{reportData.fileName} • {formatFileSize(reportData.fileSize)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadReport}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Report</span>
                </button>
                <button
                  onClick={() => {
                    requestMadeRef.current = false;
                    analyzeReport();
                  }}
                  disabled={analyzing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
                  <span>Re-analyze</span>
                </button>
                {saving && (
                  <div className="flex items-center text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Saving...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Overall Score</h3>
                {getScoreIcon(analysis.overallScore)}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        analysis.overallScore >= 80 ? 'bg-green-500' :
                        analysis.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${analysis.overallScore}%` }}
                    ></div>
                  </div>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}
                </span>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">HMRC Compliance</h3>
                {getScoreIcon(analysis.complianceScore)}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        analysis.complianceScore >= 80 ? 'bg-green-500' :
                        analysis.complianceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${analysis.complianceScore}%` }}
                    ></div>
                  </div>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(analysis.complianceScore)}`}>
                  {analysis.complianceScore}
                </span>
              </div>
            </div>
          </div>

          {/* Strengths and Improvements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Strengths</h3>
              </div>
              <ul className="space-y-3">
                {getStrengths(analysis).map((strength, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Areas for Improvement</h3>
              </div>
              <ul className="space-y-3">
                {getImprovements(analysis).map((improvement, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* HMRC Compliance Breakdown */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Award className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">HMRC Compliance Breakdown</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(getHmrcCompliance(analysis)).map(([key, value]) => (
                <div key={key} className={`p-4 rounded-lg ${getScoreBgColor(value.score)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <span className={`font-bold ${getScoreColor(value.score)}`}>
                      {value.score}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{value.feedback}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <ul className="space-y-3">
              {(analysis.recommendations || []).map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <span className="text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Detailed Feedback */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {analysis.detailedFeedback}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => navigate('/report-history')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              View Report History
            </button>
            <button
              onClick={() => navigate('/report-upload')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Analyze Another Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportAnalysis;