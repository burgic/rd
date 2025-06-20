import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface CallTranscriptAnalysis {
  id: string;
  client_name: string;
  call_date: string | null;
  call_duration: string | null;
  hmrc_eligibility_score: number;
  estimated_claim_value: string;
  rd_activities_identified: string[];
  created_at: string;
}

const TranscriptHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [analyses, setAnalyses] = useState<CallTranscriptAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchAnalyses();
  }, [user, navigate]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('call_transcript_analyses')
        .select(`
          id,
          client_name,
          call_date,
          call_duration,
          hmrc_eligibility_score,
          estimated_claim_value,
          rd_activities_identified,
          created_at
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setAnalyses(data || []);
    } catch (error: any) {
      console.error('Error fetching call analyses:', error);
      setError('Failed to load call analysis history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when deleting
    
    if (!window.confirm('Are you sure you want to delete this call analysis?')) {
      return;
    }

    try {
      setDeletingId(id);
      const { error } = await supabase
        .from('call_transcript_analyses')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      setAnalyses(prev => prev.filter(analysis => analysis.id !== id));
    } catch (error: any) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCardClick = (id: string) => {
    navigate(`/call-transcript/${id}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-50 border-green-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Call Analysis History
            </h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading History</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchAnalyses}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Call Transcript Analysis History</h1>
            <p className="text-green-100 mt-2">
              View and manage your previous call transcript analyses
            </p>
          </div>

          <div className="p-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="text-blue-600 mr-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Click to View Analysis</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Click on any analysis card to view the complete R&D assessment details, findings, and recommendations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-gray-600">
                {analyses.length > 0 
                  ? `Showing ${analyses.length} analysis${analyses.length !== 1 ? 'es' : ''}`
                  : 'No analyses found'
                }
              </p>
              <button
                onClick={() => navigate('/call-transcript-form')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                New Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Analyses Grid */}
        {analyses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Call Analyses Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start by analyzing your first client call transcript to extract R&D-relevant information.
            </p>
            <button
              onClick={() => navigate('/call-transcript-form')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
            >
              Analyze First Call
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => handleCardClick(analysis.id)}
                className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-green-300"
                title="Click to view full analysis details"
              >
                {/* Score Header */}
                <div className={`p-4 border-b-2 ${getScoreBg(analysis.hmrc_eligibility_score || 0)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {analysis.client_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {analysis.call_date 
                          ? `Call: ${formatDate(analysis.call_date)}`
                          : 'Call date not specified'
                        }
                        {analysis.call_duration && ` • ${analysis.call_duration}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(analysis.hmrc_eligibility_score || 0)}`}>
                        {analysis.hmrc_eligibility_score || 0}
                      </div>
                      <div className="text-xs text-gray-500">HMRC Score</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="space-y-3">
                    {/* R&D Activities Preview */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">R&D Activities Found:</p>
                      <p className="text-sm text-gray-600">
                        {analysis.rd_activities_identified && analysis.rd_activities_identified.length > 0
                          ? `${analysis.rd_activities_identified.length} activities identified`
                          : 'No specific activities identified'
                        }
                      </p>
                    </div>

                    {/* Estimated Value */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Estimated Claim Value:</p>
                      <p className="text-sm text-gray-600">{analysis.estimated_claim_value || 'Not specified'}</p>
                    </div>

                    {/* Analysis Date */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Analyzed:</p>
                      <p className="text-sm text-gray-600">{formatDate(analysis.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                  <div className="text-xs text-gray-500 hover:text-green-600 transition-colors">
                    Click to view full assessment details
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/call-transcript/${analysis.id}`);
                      }}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => handleDelete(analysis.id, e)}
                      disabled={deletingId === analysis.id}
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === analysis.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptHistory; 