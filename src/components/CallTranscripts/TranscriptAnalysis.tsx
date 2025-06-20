import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface TranscriptData {
  clientName: string;
  callDate: string | null;
  callDuration: string | null;
  transcript: string;
}

interface AnalysisResult {
  rdActivitiesIdentified: string[];
  technicalChallenges: string[];
  innovationElements: string[];
  hmrcEligibilityScore: number;
  eligibilityAssessment: string;
  keyFindings: string[];
  recommendedActions: string[];
  documentationNeeds: string[];
  estimatedClaimValue: string;
  followUpQuestions: string[];
}

const TranscriptAnalysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const requestMadeRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const transcriptData = location.state as TranscriptData;

  // Single effect that runs once when component mounts with valid data
  useEffect(() => {
    // Early validation
    if (!transcriptData?.clientName || !transcriptData?.transcript) {
      navigate('/call-transcript-form');
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
    console.log('Making call transcript analysis request for:', transcriptData.clientName);
    
    // Make the analysis request
    analyzeTranscript();

    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('Aborted call transcript analysis request due to component unmount');
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const analyzeTranscript = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Call the transcript analysis function
      console.log('Sending call transcript analysis request with userId:', user?.id);
      const response = await fetch('/.netlify/functions/call-transcript-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          transcript: transcriptData.transcript,
          clientName: transcriptData.clientName,
          callDate: transcriptData.callDate,
          callDuration: transcriptData.callDuration
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
        throw new Error('Failed to analyze call transcript');
      }

      const data = await response.json();
      
      // Parse the AI response into structured data
      const parsedResult = parseAIResponse(data.response);
      setResult(parsedResult);

      // Save to database
      await saveAnalysis(parsedResult);

    } catch (error: any) {
      // Don't show errors for aborted requests
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Call transcript analysis error:', error);
      setError(error.message || 'Failed to analyze call transcript. Please try again.');
      requestMadeRef.current = false; // Reset flag on error to allow retry
    } finally {
      setLoading(false);
      abortControllerRef.current = null; // Clear abort controller reference
    }
  };

  const parseAIResponse = (response: string): AnalysisResult => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rdActivitiesIdentified: parsed.rdActivitiesIdentified || [],
          technicalChallenges: parsed.technicalChallenges || [],
          innovationElements: parsed.innovationElements || [],
          hmrcEligibilityScore: parsed.hmrcEligibilityScore || 0,
          eligibilityAssessment: parsed.eligibilityAssessment || 'Analysis completed',
          keyFindings: parsed.keyFindings || [],
          recommendedActions: parsed.recommendedActions || [],
          documentationNeeds: parsed.documentationNeeds || [],
          estimatedClaimValue: parsed.estimatedClaimValue || 'Requires detailed analysis',
          followUpQuestions: parsed.followUpQuestions || []
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback parsing if JSON fails
    return {
      rdActivitiesIdentified: [],
      technicalChallenges: [],
      innovationElements: [],
      hmrcEligibilityScore: 0,
      eligibilityAssessment: response,
      keyFindings: [],
      recommendedActions: ['Contact an R&D tax advisor for detailed guidance'],
      documentationNeeds: [],
      estimatedClaimValue: 'Requires detailed analysis',
      followUpQuestions: []
    };
  };

  const saveAnalysis = async (analysisResult: AnalysisResult) => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('call_transcript_analyses')
        .insert({
          user_id: user.id,
          client_name: transcriptData.clientName,
          call_date: transcriptData.callDate,
          call_duration: transcriptData.callDuration,
          transcript: transcriptData.transcript,
          rd_activities_identified: analysisResult.rdActivitiesIdentified,
          technical_challenges: analysisResult.technicalChallenges,
          innovation_elements: analysisResult.innovationElements,
          hmrc_eligibility_score: analysisResult.hmrcEligibilityScore,
          eligibility_assessment: analysisResult.eligibilityAssessment,
          key_findings: analysisResult.keyFindings,
          recommended_actions: analysisResult.recommendedActions,
          documentation_needs: analysisResult.documentationNeeds,
          estimated_claim_value: analysisResult.estimatedClaimValue,
          follow_up_questions: analysisResult.followUpQuestions,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Analyzing Call Transcript
            </h2>
            <p className="text-gray-600">
              Our AI is extracting R&D-relevant information from the call with {transcriptData?.clientName}...
            </p>
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
                  navigate('/call-transcript-form');
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Call Transcript Analysis</h1>
            <p className="text-green-100 mt-2">R&D Analysis for {transcriptData.clientName}</p>
            {transcriptData.callDate && (
              <p className="text-green-200 text-sm mt-1">
                Call Date: {new Date(transcriptData.callDate).toLocaleDateString('en-GB')}
                {transcriptData.callDuration && ` • Duration: ${transcriptData.callDuration}`}
              </p>
            )}
          </div>

          {/* HMRC Eligibility Score */}
          <div className={`p-6 border-b ${getScoreBg(result.hmrcEligibilityScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  HMRC Eligibility Score: <span className={getScoreColor(result.hmrcEligibilityScore)}>
                    {result.hmrcEligibilityScore}/100
                  </span>
                </h2>
                <p className={`text-lg font-medium ${getScoreColor(result.hmrcEligibilityScore)}`}>
                  {result.hmrcEligibilityScore >= 70 ? '✅ Strong R&D Indicators' : 
                   result.hmrcEligibilityScore >= 40 ? '⚠️ Some R&D Elements' : '❌ Limited R&D Evidence'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Estimated Claim Value</p>
                <p className="text-lg font-semibold text-gray-900">{result.estimatedClaimValue}</p>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="p-8 space-y-8">
            {/* R&D Activities Identified */}
            {result.rdActivitiesIdentified.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">R&D Activities Identified</h3>
                <div className="bg-green-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {result.rdActivitiesIdentified.map((activity, index) => (
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
            {result.technicalChallenges.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Technical Challenges</h3>
                <div className="bg-orange-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {result.technicalChallenges.map((challenge, index) => (
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
            {result.innovationElements.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Innovation Elements</h3>
                <div className="bg-purple-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {result.innovationElements.map((element, index) => (
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
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">HMRC Eligibility Assessment</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">{result.eligibilityAssessment}</p>
              </div>
            </div>

            {/* Key Findings */}
            {result.keyFindings.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Findings</h3>
                <div className="bg-blue-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {result.keyFindings.map((finding, index) => (
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
            {result.recommendedActions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommended Actions</h3>
                <div className="bg-indigo-50 rounded-lg p-6">
                  <ul className="space-y-3">
                    {result.recommendedActions.map((action, index) => (
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
            {result.documentationNeeds.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Documentation Requirements</h3>
                <div className="bg-yellow-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {result.documentationNeeds.map((need, index) => (
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
            {result.followUpQuestions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Follow-up Questions</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <ul className="space-y-2">
                    {result.followUpQuestions.map((question, index) => (
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
              onClick={() => navigate('/call-transcript-form')}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium"
            >
              New Analysis
            </button>
            <button
              onClick={() => navigate('/call-transcript-history')}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-medium"
            >
              View History
            </button>
            {saving && (
              <div className="flex items-center text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Saving...
              </div>
            )}
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

export default TranscriptAnalysis; 