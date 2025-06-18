import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface AssessmentData {
  companyName: string;
  companyDescription: string;
}

interface AssessmentResult {
  eligibilityScore: number;
  eligible: boolean;
  reasoning: string;
  recommendations: string[];
  nextSteps: string[];
  estimatedValue: string;
}

const AssessmentResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [saving, setSaving] = useState(false);
  const requestMadeRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const assessmentData = location.state as AssessmentData;

  // Single effect that runs once when component mounts with valid data
  useEffect(() => {
    // Early validation
    if (!assessmentData?.companyName || !assessmentData?.companyDescription) {
      navigate('/rd-form');
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
    console.log('Making R&D assessment request for:', assessmentData.companyName);
    
    // Make the assessment request
    assessRDEligibility();

    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('Aborted R&D assessment request due to component unmount');
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const assessRDEligibility = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Create the R&D assessment prompt
      const prompt = createRDAssessmentPrompt(assessmentData);

      // Call the R&D assessment function
      console.log('Sending R&D assessment request with userId:', user?.id);
      const response = await fetch('/.netlify/functions/rd-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          query: prompt,
          companyName: assessmentData.companyName,
          companyDescription: assessmentData.companyDescription
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
          throw new Error('Rate limit exceeded. Please wait a minute before submitting another assessment.');
        }
        throw new Error('Failed to assess R&D eligibility');
      }

      const data = await response.json();
      
      // Parse the AI response into structured data
      const parsedResult = parseAIResponse(data.response);
      setResult(parsedResult);

      // Save to database
      await saveAssessment(parsedResult);

    } catch (error: any) {
      // Don't show errors for aborted requests
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('R&D Assessment error:', error);
      setError(error.message || 'Failed to assess R&D eligibility. Please try again.');
      requestMadeRef.current = false; // Reset flag on error to allow retry
    } finally {
      setLoading(false);
      abortControllerRef.current = null; // Clear abort controller reference
    }
  };

  const createRDAssessmentPrompt = (data: AssessmentData): string => {
    return `
You are an expert R&D tax credits advisor. Analyze the following company description and provide a detailed assessment of their eligibility for HMRC R&D tax credits.

Company: ${data.companyName}
Description: ${data.companyDescription}

Please provide your assessment in the following JSON format:
{
  "eligibilityScore": [0-100 score],
  "eligible": [true/false],
  "reasoning": "[Detailed explanation of why they are/aren't eligible]",
  "recommendations": ["[List of specific recommendations]"],
  "nextSteps": ["[List of actionable next steps]"],
  "estimatedValue": "[Estimated potential claim value or range]"
}

Consider HMRC's key R&D criteria:
- Advance in science or technology
- Technical uncertainty
- Technical challenges overcome
- Systematic investigation
- Novelty and innovation
- Process improvements

Base your assessment on current HMRC guidelines and provide practical, actionable advice.
`;
  };

  const parseAIResponse = (response: string): AssessmentResult => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          eligibilityScore: parsed.eligibilityScore || 0,
          eligible: parsed.eligible || false,
          reasoning: parsed.reasoning || 'Assessment completed',
          recommendations: parsed.recommendations || [],
          nextSteps: parsed.nextSteps || [],
          estimatedValue: parsed.estimatedValue || 'Contact advisor for estimate'
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback parsing if JSON fails
    return {
      eligibilityScore: response.toLowerCase().includes('eligible') ? 75 : 25,
      eligible: response.toLowerCase().includes('eligible'),
      reasoning: response,
      recommendations: [],
      nextSteps: ['Contact an R&D tax advisor for detailed guidance'],
      estimatedValue: 'Contact advisor for estimate'
    };
  };

  const saveAssessment = async (assessmentResult: AssessmentResult) => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('rd_assessments')
        .insert({
          user_id: user.id,
          company_name: assessmentData.companyName,
          company_description: assessmentData.companyDescription,
          eligibility_score: assessmentResult.eligibilityScore,
          eligible: assessmentResult.eligible,
          reasoning: assessmentResult.reasoning,
          recommendations: assessmentResult.recommendations,
          next_steps: assessmentResult.nextSteps,
          estimated_value: assessmentResult.estimatedValue,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving assessment:', error);
      }
    } catch (error) {
      console.error('Save assessment error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNewAssessment = () => {
    navigate('/rd-form');
  };

  const handleViewHistory = () => {
    navigate('/rd-history');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Analyzing Your R&D Activities
            </h2>
            <p className="text-gray-600">
              Our AI is reviewing your company description against HMRC R&D criteria...
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Failed</h2>
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
                  navigate('/rd-form');
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

  if (!result) return null;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">R&D Tax Credits Assessment</h1>
            <p className="text-blue-100 mt-2">Results for {assessmentData.companyName}</p>
          </div>

          {/* Eligibility Score */}
          <div className={`p-6 border-b ${getEligibilityBg(result.eligibilityScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Eligibility Score: <span className={getEligibilityColor(result.eligibilityScore)}>
                    {result.eligibilityScore}/100
                  </span>
                </h2>
                <p className={`text-lg font-medium ${getEligibilityColor(result.eligibilityScore)}`}>
                  {result.eligible ? '✅ Likely Eligible' : '❌ Unlikely to Qualify'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Estimated Value</p>
                <p className="text-lg font-semibold text-gray-900">{result.estimatedValue}</p>
              </div>
            </div>
          </div>

          {/* Assessment Details */}
          <div className="p-8 space-y-8">
            {/* Reasoning */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Assessment Reasoning</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">{result.reasoning}</p>
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h3>
                <div className="bg-blue-50 rounded-lg p-6">
                  <ul className="space-y-3">
                    {result.recommendations.map((rec, index) => (
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
            {result.nextSteps.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h3>
                <div className="bg-green-50 rounded-lg p-6">
                  <ul className="space-y-3">
                    {result.nextSteps.map((step, index) => (
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
              onClick={handleNewAssessment}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium"
            >
              New Assessment
            </button>
            <button
              onClick={handleViewHistory}
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

export default AssessmentResults; 