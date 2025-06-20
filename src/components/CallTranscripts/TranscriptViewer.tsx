import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface CallTranscriptAnalysis {
  id: string;
  client_name: string;
  call_date: string | null;
  call_duration: string | null;
  transcript: string;
  rd_activities_identified: string[];
  technical_challenges: string[];
  innovation_elements: string[];
  hmrc_eligibility_score: number;
  eligibility_assessment: string;
  key_findings: string[];
  recommended_actions: string[];
  documentation_needs: string[];
  estimated_claim_value: string;
  follow_up_questions: string[];
  created_at: string;
}

const TranscriptViewer: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [analysis, setAnalysis] = useState<CallTranscriptAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    if (!analysisId) {
      navigate('/call-transcript-history');
      return;
    }
    fetchAnalysis();
  }, [user, analysisId, navigate]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('call_transcript_analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', user?.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Analysis not found. It may have been deleted or you may not have access to it.');
        } else {
          throw new Error(fetchError.message);
        }
        return;
      }

      setAnalysis(data);
    } catch (error: any) {
      console.error('Error fetching analysis:', error);
      setError('Failed to load analysis. Please try again.');
    } finally {
      setLoading(false);
    }
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
              Loading Analysis
            </h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/call-transcript-history')}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Call Transcript Analysis</h1>
                <p className="text-green-100 mt-2">Analysis for {analysis.client_name}</p>
                {analysis.call_date && (
                  <p className="text-green-200 text-sm mt-1">
                    Call Date: {formatDate(analysis.call_date)}
                    {analysis.call_duration && ` • Duration: ${analysis.call_duration}`}
                  </p>
                )}
                <p className="text-green-200 text-sm">
                  Analyzed: {formatDate(analysis.created_at)}
                </p>
              </div>
              <button
                onClick={() => navigate('/call-transcript-history')}
                className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 text-sm"
              >
                ← Back to History
              </button>
            </div>
          </div>

          {/* HMRC Eligibility Score */}
          <div className={`p-6 border-b ${getScoreBg(analysis.hmrc_eligibility_score || 0)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  HMRC Eligibility Score: <span className={getScoreColor(analysis.hmrc_eligibility_score || 0)}>
                    {analysis.hmrc_eligibility_score || 0}/100
                  </span>
                </h2>
                <p className={`text-lg font-medium ${getScoreColor(analysis.hmrc_eligibility_score || 0)}`}>
                  {(analysis.hmrc_eligibility_score || 0) >= 70 ? '✅ Strong R&D Indicators' : 
                   (analysis.hmrc_eligibility_score || 0) >= 40 ? '⚠️ Some R&D Elements' : '❌ Limited R&D Evidence'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Estimated Claim Value</p>
                <p className="text-lg font-semibold text-gray-900">{analysis.estimated_claim_value}</p>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="p-8 space-y-8">
            {/* Call Transcript Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Original Call Transcript</h3>
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                >
                  {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                </button>
              </div>
              {showTranscript && (
                <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {analysis.transcript}
                  </pre>
                </div>
              )}
            </div>

            {/* R&D Activities Identified */}
            {analysis.rd_activities_identified && analysis.rd_activities_identified.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">R&D Activities Identified</h3>
                <div className="bg-green-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {analysis.rd_activities_identified.map((activity, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-600 font-bold mr-3">•</span>
                        <span className="text-gray-700">{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Technical Challenges */}
            {analysis.technical_challenges && analysis.technical_challenges.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Technical Challenges</h3>
                <div className="bg-orange-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {analysis.technical_challenges.map((challenge, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-600 font-bold mr-3">•</span>
                        <span className="text-gray-700">{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Innovation Elements */}
            {analysis.innovation_elements && analysis.innovation_elements.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Innovation Elements</h3>
                <div className="bg-purple-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {analysis.innovation_elements.map((element, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-purple-600 font-bold mr-3">•</span>
                        <span className="text-gray-700">{element}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* HMRC Eligibility Assessment */}
            {analysis.eligibility_assessment && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">HMRC Eligibility Assessment</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed">{analysis.eligibility_assessment}</p>
                </div>
              </div>
            )}

            {/* Key Findings */}
            {analysis.key_findings && analysis.key_findings.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Findings</h3>
                <div className="bg-blue-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {analysis.key_findings.map((finding, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 font-bold mr-3">•</span>
                        <span className="text-gray-700">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommended Actions</h3>
                <div className="bg-indigo-50 rounded-lg p-6">
                  <ul className="space-y-3">
                    {analysis.recommended_actions.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Documentation Needs */}
            {analysis.documentation_needs && analysis.documentation_needs.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Documentation Requirements</h3>
                <div className="bg-yellow-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {analysis.documentation_needs.map((need, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-yellow-600 font-bold mr-3">📋</span>
                        <span className="text-gray-700">{need}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Follow-up Questions */}
            {analysis.follow_up_questions && analysis.follow_up_questions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Follow-up Questions</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {analysis.follow_up_questions.map((question, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-600 font-bold mr-3">❓</span>
                        <span className="text-gray-700">{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-8 py-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/call-transcript-history')}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-medium"
            >
              Back to History
            </button>
            <button
              onClick={() => navigate('/call-transcript-form')}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium"
            >
              New Analysis
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-800">Important Notice</h4>
              <p className="text-yellow-700 mt-1">
                This analysis is based on call transcript content and should be reviewed by qualified R&D tax professionals. 
                Additional verification and documentation may be required for HMRC compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptViewer; 