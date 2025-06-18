// src/components/Client/Risk/RiskAssessmentForm.tsx
import React, { useMemo, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';
import FinancialForm from '../BaseForm';
import { riskProfileQuestions } from '../../../utils/riskAssessment';
import { calculateFinancialMetricsForRisk,  } from '../../../utils/riskAssessment/riskCalculations';
import type { FormField, RiskAssessmentEntry } from '../../../@types/financial';
import { AuthContext } from '../../../context/AuthContext';
import { financialCalculations } from '../../../utils/financialcalculationMetrics';
import { calculateRiskScores } from '../../../utils/riskAssessment/riskCalculations';
import { useFinancialData } from '../../../hooks/useFinancialData';

const RiskAssessmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { data: financialData } = useFinancialData();
  const [initialResponses, setInitialResponses] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const fetchLatestRiskAssessment = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('risk_assessments')
          .select('responses')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching latest risk assessment:', error);
        }

        if (data?.responses) {
          setInitialResponses(data.responses);
        }
      } catch (error) {
        console.error('Fetch latest risk assessment failed:', error);
      }
    };

    fetchLatestRiskAssessment();
  }, [user]);

  // Transform risk profile questions into form fields format
  const fields: FormField[] = riskProfileQuestions.map(question => ({
    name: question.id,
    type: 'select' as const,
    label: question.question,
    options: question.answers.map(answer => ({
      value: answer.score.toString(),
      label: answer.text
    }))
  }));


  const handleSubmit = async (entries: Record<string, any>) => {
    if (!user) {
      alert('No user found. Please log in again.');
      return;
    }

    try {
      
      // Fetch all necessary data for risk calculations
      const { 
        data: profileData, 
        error: profileError 
      } = await supabase
        .from('profiles')
        .select(`
          id,
          incomes(*),
          expenditures(*),
          assets(*),
          liabilities(*),
          goals(*)
        `)
        .eq('id', user.id)
        .single();
  
      console.log('Profile query result:', { 
        profileData, 
        profileError,
        profileId: profileData?.id,
        incomesCount: profileData?.incomes?.length,
        expendituresCount: profileData?.expenditures?.length
      });
  
      if (profileError) {
        console.error('Profile query error details:', profileError);
        throw new Error('Failed to retrieve user profile data: ' + profileError.message);
      }
  
      // Calculate metrics
      const metrics = calculateFinancialMetricsForRisk(
        profileData.incomes || [],
        profileData.expenditures || [],
        profileData.assets || [],
        profileData.liabilities || [],
        profileData.goals || []
      );
  
  
      // Calculate risk scores
      const calculatedScores = calculateRiskScores(entries, metrics);
  
     // Remove existing entries before inserting new one
     await supabase
      .from('risk_assessments')
      .delete()
      .eq('client_id', user.id);

  
      const { data, error } = await supabase
        .from('risk_assessments')
        .upsert({
          client_id: user.id,
          responses: entries,
          calculated_scores: calculatedScores
        })
        .select();

      if (error) throw error;

      navigate('/client/client-dashboard');
  
    } catch (error) {
      console.error('Failed to submit risk assessment:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      alert('Failed to save risk assessment. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-semibold mb-6">Risk Assessment Questionnaire</h1>
      <FinancialForm
        formType="risk_assessments"
        nextRoute="/client/client-dashboard"
        stepNumber={6}
        fields={fields}
        defaultEntry={initialResponses}
        onSubmit={handleSubmit}
            />
          </div>
        );
      };

export default RiskAssessmentForm;

  /*

  const handleSubmit = async (entries: Record<string, any>) => {
    if (!user) {
      alert('No user found. Please log in again.');
      return;
    }
    try {
      console.log('Starting risk assessment submission for user:', user.id);
      console.log('Financial data available:', !!financialData);

      // Fetch all necessary data directly from the database
      const { 
        data: profileData, 
        error: profileError 
      } = await supabase
        .from('profiles')
        .select(`
          id,
          incomes(*),
          expenditures(*),
          assets(*),
          liabilities(*),
          goals(*)
        `)
        .eq('id', user.id)
        .single();

        const { 
          data: kycData, 
          error: kycError 
        } = await supabase
          .from('kyc_data')
          .select('*')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle();

      console.log('Profile query result:', { 
        profileData, 
        profileError,
        profileId: profileData?.id,
        incomesCount: profileData?.incomes?.length,
        expendituresCount: profileData?.expenditures?.length,
        kycData,
        kycError
      });

      if (profileError || !profileData) {
        console.error('Profile query error details:', profileError);
        throw new Error('Failed to retrieve user profile data: ' + profileError?.message);
      }

    // Calculate metrics
    const metrics = calculateFinancialMetricsForRisk(
      profileData.incomes || [],
      profileData.expenditures || [],
      profileData.assets || [],
      profileData.liabilities || [],
      profileData.goals || [],
      kycData?.date_of_birth
    );

      console.log('Calculated metrics:', metrics); // Debug log
      // Calculate risk scores
      const calculatedScores = calculateRiskScores(entries, metrics);

      console.log('Calculated risk scores:', calculatedScores);

      // Format responses object properly
      const responses = {
        knowledge_1: entries.knowledge_1,
        knowledge_2: entries.knowledge_2,
        attitude_1: entries.attitude_1,
        attitude_2: entries.attitude_2,
        capacity_1: entries.capacity_1,
        capacity_2: entries.capacity_2,
        timeframe_1: entries.timeframe_1
      };


      console.log('Submitting risk assessment with scores:', calculatedScores);
      

      // First, check for existing risk assessments
      const { data: existingAssessments, error: existingError } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('Existing assessments:', { 
        existingAssessments, 
        existingError 
      });

      const riskAssessmentData = {
        client_id: user.id,
        responses: entries,
        calculated_scores: {
          knowledgeScore: calculatedScores.knowledgeScore,
          attitudeScore: calculatedScores.attitudeScore,
          capacityScore: calculatedScores.capacityScore,
          timeframeScore: calculatedScores.timeframeScore,
          overallScore: calculatedScores.overallScore,
          riskCategory: calculatedScores.riskCategory
        }
      };

      let result;
      if (existingAssessments?.[0]) {
        // Update existing risk assessment (using the existing id)
        result = await supabase
          .from('risk_assessments')
          .update(riskAssessmentData)
          .eq('id', existingAssessments[0].id)
          .select();
      } else {
        // Insert new risk assessment, without an id field so that Supabase auto-generates it
        result = await supabase
          .from('risk_assessments')
          .insert(riskAssessmentData)
          .select();
      }

    const { data, error } = result;

    console.log('Upsert result:', { data, error });

    if (error) throw error;

    // Navigate to dashboard
    navigate('/client/client-dashboard');

    } catch (error) {
      console.error('Error saving risk assessment:', error);
      alert('Failed to save risk assessment. Please try again.');
    }
  };
    
  

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-semibold mb-6">Risk Assessment Questionnaire</h1>
      <FinancialForm
        formType="risk_assessments"
        nextRoute="/client/client-dashboard"
        stepNumber={6}
        fields={fields}
        defaultEntry={{}}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default RiskAssessmentForm;

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';
import { AuthContext } from '../../../context/AuthContext';
import { riskProfileQuestions } from '../../../utils/riskAssessment';

const RiskAssessmentForm = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [responses, setResponses] = useState<{ [key: string]: number }>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleAnswer = (score: number) => {
    setResponses(prev => ({
      ...prev,
      [riskProfileQuestions[currentQuestion].id]: score
    }));

    if (currentQuestion < riskProfileQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('risk_profiles')
        .upsert({
          client_id: user.id,
          responses,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      navigate('/client/client-dashboard');
    } catch (error) {
      console.error('Error saving risk profile:', error);
      alert('Failed to save risk profile');
    } finally {
      setIsSaving(false);
    }
  };

  const currentQuestionData = riskProfileQuestions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Risk Profile Assessment</h1>
          <span className="text-sm text-gray-500">
            Question {currentQuestion + 1} of {riskProfileQuestions.length}
          </span>
        </div>
        
        
        <div className="w-full h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / riskProfileQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl mb-4">{currentQuestionData.question}</h2>
        <div className="space-y-3">
          {currentQuestionData.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(answer.score)}
              className="w-full p-4 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
            >
              {answer.text}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          className="px-4 py-2 text-blue-600 disabled:text-gray-400"
        >
          Previous
        </button>
        
        {currentQuestion === riskProfileQuestions.length - 1 && (
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSaving ? 'Saving...' : 'Complete Assessment'}
          </button>
        )}
      </div>
    </div>
  );
};

export default RiskAssessmentForm;

*/