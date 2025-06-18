import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
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

const AssessmentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchAssessments();
  }, [user, navigate]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rd_assessments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAssessments(data || []);
    } catch (error: any) {
      console.error('Error fetching assessments:', error);
      setError('Failed to load assessment history');
    } finally {
      setLoading(false);
    }
  };

  const deleteAssessment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rd_assessments')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setAssessments(assessments.filter(a => a.id !== id));
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      setError('Failed to delete assessment');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assessment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Assessment History</h1>
                <p className="text-blue-100 mt-1">Your R&D tax credits assessments</p>
              </div>
              <button
                onClick={() => navigate('/rd-form')}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50"
              >
                New Assessment
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {assessments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-6">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Click on any assessment to view full details and recommendations</span>
                </div>
              </div>
            )}

            {assessments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
                <p className="text-gray-600 mb-6">You haven't completed any R&D tax credits assessments.</p>
                <button
                  onClick={() => navigate('/rd-form')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Your First Assessment
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {assessments.map((assessment) => (
                  <div 
                    key={assessment.id} 
                    className="group border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => navigate(`/rd-assessment/${assessment.id}`)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                            {assessment.company_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(assessment.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view full assessment details
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(assessment.eligibility_score)}`}>
                            <span className={getScoreColor(assessment.eligibility_score)}>
                              {assessment.eligibility_score}/100
                            </span>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            assessment.eligible 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {assessment.eligible ? 'Eligible' : 'Not Eligible'}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(assessment.id);
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete assessment"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Company Description</h4>
                          <p className="text-gray-600 text-sm line-clamp-3">
                            {assessment.company_description}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Assessment Reasoning</h4>
                          <p className="text-gray-600 text-sm line-clamp-3">
                            {assessment.reasoning}
                          </p>
                        </div>
                      </div>

                      {assessment.estimated_value && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Estimated Value:</span> {assessment.estimated_value}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex space-x-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/rd-assessment', {
                              state: {
                                companyName: assessment.company_name,
                                companyDescription: assessment.company_description
                              }
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Re-assess →
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/rd-assessment/${assessment.id}`);
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Assessment</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this assessment? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAssessment(deleteConfirm)}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentHistory; 