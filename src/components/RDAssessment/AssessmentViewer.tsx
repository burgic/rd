import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface Assessment {
  id: string;
  company_name: string;
  company_description: string;
  eligibility_score: number;
  eligible: boolean;
  reasoning: string;
  recommendations: string[];
  next_steps: string[];
  estimated_value: string;
  created_at: string;
}

const AssessmentViewer: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/rd-history');
      return;
    }

    if (!user) {
      navigate('/');
      return;
    }

    fetchAssessment();
  }, [assessmentId, user]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rd_assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Assessment not found');
      }

      setAssessment(data);
    } catch (error: any) {
      console.error('Error fetching assessment:', error);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleReassess = () => {
    if (!assessment) return;
    
    navigate('/rd-assessment', {
      state: {
        companyName: assessment.company_name,
        companyDescription: assessment.company_description
      }
    });
  };

  const getEligibilityColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEligibilityBg = (score: number) => {
    if (score >= 70) return 'bg-green-50 border-green-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The requested assessment could not be found.'}</p>
            <button
              onClick={() => navigate('/rd-history')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">R&D Tax Credits Assessment</h1>
                <p className="text-blue-100 mt-2">Results for {assessment.company_name}</p>
                <p className="text-blue-200 text-sm mt-1">
                  Assessed on {new Date(assessment.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => navigate('/rd-history')}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                ← Back to History
              </button>
            </div>
          </div>

          {/* Eligibility Score */}
          <div className={`p-6 border-b ${getEligibilityBg(assessment.eligibility_score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Eligibility Score: <span className={getEligibilityColor(assessment.eligibility_score)}>
                    {assessment.eligibility_score}/100
                  </span>
                </h2>
                <p className={`text-lg font-medium ${getEligibilityColor(assessment.eligibility_score)}`}>
                  {assessment.eligible ? '✅ Likely Eligible' : '❌ Unlikely to Qualify'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Estimated Value</p>
                <p className="text-lg font-semibold text-gray-900">{assessment.estimated_value}</p>
              </div>
            </div>
          </div>

          {/* Assessment Details */}
          <div className="p-8 space-y-8">
            {/* Company Information */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-2">Company Description</h4>
                <p className="text-gray-700 leading-relaxed">{assessment.company_description}</p>
              </div>
            </div>

            {/* Reasoning */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Assessment Reasoning</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">{assessment.reasoning}</p>
              </div>
            </div>

            {/* Recommendations */}
            {assessment.recommendations && assessment.recommendations.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h3>
                <div className="bg-blue-50 rounded-lg p-6">
                  <ul className="space-y-3">
                    {assessment.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 font-bold mr-3">•</span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Next Steps */}
            {assessment.next_steps && assessment.next_steps.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h3>
                <div className="bg-green-50 rounded-lg p-6">
                  <ul className="space-y-3">
                    {assessment.next_steps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
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
              onClick={() => navigate('/rd-form')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium"
            >
              New Assessment
            </button>
            <button
              onClick={handleReassess}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-medium"
            >
              Re-assess This Company
            </button>
            <button
              onClick={() => navigate('/rd-history')}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 font-medium"
            >
              View All History
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
              <h4 className="font-semibold text-yellow-800">Important Disclaimer</h4>
              <p className="text-yellow-700 mt-1">
                This assessment is for guidance only and should not be considered as professional tax advice. 
                R&D tax credit eligibility depends on many factors and requires detailed analysis. 
                Always consult with a qualified R&D tax advisor before making any claims.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentViewer; 