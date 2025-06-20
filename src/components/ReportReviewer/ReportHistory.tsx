import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { 
  FileText, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Plus
} from 'lucide-react';

interface ReportReview {
  id: string;
  file_name: string;
  report_type: string;
  overall_score: number;
  compliance_score: number;
  created_at: string;
  content_preview: string;
}

const ReportHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReportReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('report_reviews')
        .select('id, file_name, report_type, overall_score, compliance_score, created_at, content_preview')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setReviews(data || []);
    } catch (error: any) {
      console.error('Error fetching report reviews:', error);
      setError('Failed to load report history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this report analysis? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(reviewId);
      setError(null);

      const { error: deleteError } = await supabase
        .from('report_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user?.id); // Ensure user can only delete their own reviews

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setReviews(reviews.filter(review => review.id !== reviewId));
    } catch (error: any) {
      console.error('Error deleting review:', error);
      setError('Failed to delete report analysis. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatReportType = (type: string): string => {
    const types: { [key: string]: string } = {
      'rd_report': 'R&D Technical Report',
      'hmrc_submission': 'HMRC Submission',
      'project_documentation': 'Project Documentation',
      'technical_specification': 'Technical Specification'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Report History</h2>
              <p className="text-gray-600">Please wait while we fetch your reports...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Report Analysis History</h1>
                <p className="text-gray-600 mt-1">
                  View and manage your analyzed R&D reports
                </p>
              </div>
              <button
                onClick={() => navigate('/report-upload')}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Analyze New Report</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          {reviews.length > 0 && (
            <div className="px-6 py-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
                  <div className="text-sm text-gray-600">Total Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {reviews.filter(r => r.overall_score >= 80).length}
                  </div>
                  <div className="text-sm text-gray-600">High Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(reviews.reduce((sum, r) => sum + r.overall_score, 0) / reviews.length) || 0}
                  </div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Report List */}
        {reviews.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-12">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Reports Analyzed Yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start by uploading your first R&D report to get AI-powered analysis and feedback on HMRC compliance.
              </p>
              <button
                onClick={() => navigate('/report-upload')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Upload Your First Report
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              💡 <strong>Tip:</strong> Click on any report card to view the full analysis details
            </div>
            
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white shadow-sm rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/report-viewer/${review.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {review.file_name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {formatReportType(review.report_type)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>

                      {review.content_preview && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {review.content_preview}
                        </p>
                      )}

                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          {getScoreIcon(review.overall_score)}
                          <span className="text-sm font-medium text-gray-700">Overall:</span>
                          <span className={`text-sm font-bold ${getScoreColor(review.overall_score)}`}>
                            {review.overall_score}/100
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {getScoreIcon(review.compliance_score)}
                          <span className="text-sm font-medium text-gray-700">HMRC:</span>
                          <span className={`text-sm font-bold ${getScoreColor(review.compliance_score)}`}>
                            {review.compliance_score}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/report-viewer/${review.id}`);
                        }}
                        className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View full analysis"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteReview(review.id);
                        }}
                        disabled={deleting === review.id}
                        className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Delete analysis"
                      >
                        {deleting === review.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hover hint */}
                <div className="px-6 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Click to view full analysis details and recommendations
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => navigate('/overview')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Overview
          </button>
          
          {reviews.length > 0 && (
            <button
              onClick={() => navigate('/report-upload')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Analyze Another Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportHistory; 