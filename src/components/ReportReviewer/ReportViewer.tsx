import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Clock,
  User
} from 'lucide-react';

interface ReportReview {
  id: string;
  file_name: string;
  report_type: string;
  content_preview: string;
  overall_score: number;
  compliance_score: number;
  strengths: string[];
  improvements: string[];
  hmrc_compliance: {
    projectScope: { score: number; feedback: string };
    technicalAdvance: { score: number; feedback: string };
    uncertainty: { score: number; feedback: string };
    documentation: { score: number; feedback: string };
    eligibility: { score: number; feedback: string };
  };
  recommendations: string[];
  detailed_feedback: string;
  created_at: string;
}

const ReportViewer: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [review, setReview] = useState<ReportReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reviewId && user) {
      fetchReview();
    }
  }, [reviewId, user]);

  const fetchReview = async () => {
    if (!reviewId || !user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('report_reviews')
        .select('*')
        .eq('id', reviewId)
        .eq('user_id', user.id) // Ensure user can only view their own reviews
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Report analysis not found or you do not have permission to view it.');
        }
        throw fetchError;
      }

      setReview(data);
    } catch (error: any) {
      console.error('Error fetching report review:', error);
      setError(error.message || 'Failed to load report analysis. Please try again.');
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatReportType = (type: string): string => {
    const types: { [key: string]: string } = {
      'rd_report': 'R&D Technical Report',
      'hmrc_submission': 'HMRC Submission Document',
      'project_documentation': 'Project Documentation',
      'technical_specification': 'Technical Specification'
    };
    return types[type] || type;
  };

  const downloadReport = () => {
    if (!review) return;

    const reportContent = `
R&D REPORT ANALYSIS SUMMARY
===========================

File: ${review.file_name}
Type: ${formatReportType(review.report_type)}
Analysis Date: ${formatDate(review.created_at)}

OVERALL SCORES
==============
Overall Score: ${review.overall_score}/100
HMRC Compliance Score: ${review.compliance_score}/100

STRENGTHS
=========
${review.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

AREAS FOR IMPROVEMENT
====================
${review.improvements.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

HMRC COMPLIANCE BREAKDOWN
========================
Project Scope: ${review.hmrc_compliance.projectScope.score}/100
- ${review.hmrc_compliance.projectScope.feedback}

Technical Advance: ${review.hmrc_compliance.technicalAdvance.score}/100
- ${review.hmrc_compliance.technicalAdvance.feedback}

Uncertainty: ${review.hmrc_compliance.uncertainty.score}/100
- ${review.hmrc_compliance.uncertainty.feedback}

Documentation: ${review.hmrc_compliance.documentation.score}/100
- ${review.hmrc_compliance.documentation.feedback}

Eligibility: ${review.hmrc_compliance.eligibility.score}/100
- ${review.hmrc_compliance.eligibility.feedback}

RECOMMENDATIONS
===============
${review.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

DETAILED FEEDBACK
=================
${review.detailed_feedback}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${review.file_name}_analysis.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Report Analysis</h2>
              <p className="text-gray-600">Please wait while we fetch the analysis details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Analysis</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/report-history')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back to History
            </button>
            <button
              onClick={fetchReview}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-6">The requested report analysis could not be found.</p>
          <button
            onClick={() => navigate('/report-history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/report-history')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to History</span>
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{review.file_name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{formatReportType(review.report_type)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(review.created_at)}</span>
                    </span>
                  </div>
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
                {getScoreIcon(review.overall_score)}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        review.overall_score >= 80 ? 'bg-green-500' :
                        review.overall_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${review.overall_score}%` }}
                    ></div>
                  </div>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(review.overall_score)}`}>
                  {review.overall_score}
                </span>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">HMRC Compliance</h3>
                {getScoreIcon(review.compliance_score)}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        review.compliance_score >= 80 ? 'bg-green-500' :
                        review.compliance_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${review.compliance_score}%` }}
                    ></div>
                  </div>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(review.compliance_score)}`}>
                  {review.compliance_score}
                </span>
              </div>
            </div>
          </div>

          {/* Content Preview */}
          {review.content_preview && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm text-gray-700 font-mono leading-relaxed">
                  {review.content_preview}
                </p>
              </div>
            </div>
          )}

          {/* Strengths and Improvements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Strengths</h3>
              </div>
              <ul className="space-y-3">
                {review.strengths.map((strength, index) => (
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
                {review.improvements.map((improvement, index) => (
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
              {Object.entries(review.hmrc_compliance).map(([key, value]) => (
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
              {review.recommendations.map((recommendation, index) => (
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
                {review.detailed_feedback}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => navigate('/report-history')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back to History
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

export default ReportViewer; 