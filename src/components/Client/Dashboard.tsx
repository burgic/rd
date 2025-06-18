// src/components/Client/Dashboard.tsx

import React, { useEffect, useState, useContext, useMemo } from 'react';
import { financialCalculations } from 'utils/financialcalculationMetrics';
import type { FinancialData, Income } from '../../@types/financial';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Pie, Bar } from 'react-chartjs-2';
import { AuthContext } from '../../context/AuthContext';
import 'chart.js/auto';
import NetWorthCard from './Cards/NetWorthCard';
import RiskProfileResults from './Risk/RiskProfileResults';
import { RiskScores } from 'utils/riskAssessment';


interface IncomeItem {
  type: string;
  amount: number;
  frequency: string;
}


const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useContext(AuthContext);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskScores | null>(null);


  const financialSummary = useMemo(() => {
    if (!financialData) return null;
    
    return financialCalculations.calculateFinancialSummary({
      incomes: financialData.incomes || [],
      expenditures: financialData.expenditures || [],
      assets: financialData.assets || [],
      liabilities: financialData.liabilities || [],
      goals: financialData.goals || []
    });
  }, [financialData]);


  useEffect(() => {
    

    const fetchFinancialData = async () => {
      if (!user || !session) {
        
        setError('User not authenticated.');
        setLoading(false);
       
        return;
      }

      
      try {
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
          
        
      } catch (e) {
        
      }

      // Insert the new code here
      try {
        // Fetch incomes with proper type casting and null checks
        const { data: incomesData, error: incomesError } = await supabase
          .from('incomes')
          .select('*')
          .eq('client_id', user.id);

  

        if (incomesError) {
          throw new Error(`Failed to fetch incomes: ${incomesError.message}`);
        }

        // Fetch expenditures
        const { data: expendituresData, error: expendituresError } = await supabase
          .from('expenditures')
          .select('*')
          .eq('client_id', user.id);


        if (expendituresError) {
          throw new Error(`Failed to fetch expenditures: ${expendituresError.message}`);
        }

        // Calculate total income, properly handling monthly vs annual frequencies
        const totalIncome = (incomesData || []).reduce((sum, income: Income) => {
          const amount = Number(income.amount) || 0;
          return sum + (income.frequency === 'Monthly' ? amount * 12 : amount);
        }, 0);

        const processedIncomes = (incomesData || [])
          .filter(income => income.amount && Number(income.amount) > 0)
          .reduce((unique: Income[], income: Income) => { // Specify the type here
            const existing = unique.find(item => item.type === income.type);
            if (!existing) {
              unique.push(income);
            } else {
              // If type already exists, add to the amount
              existing.amount = Number(existing.amount) + Number(income.amount);
            }
            return unique;
          }, []);

        // Transform expenditure data
        const expenditures = (expendituresData || []).map(exp => ({
          category: exp.category,
          amount: Number(exp.amount) || 0,
          client_id: exp.client_id,
          frequency: exp.frequency
        }));

              // Fetch assets
          const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .eq('client_id', user.id);

        if (assetsError) throw new Error(`Failed to fetch assets: ${assetsError.message}`);

        // Fetch liabilities
        const { data: liabilitiesData, error: liabilitiesError } = await supabase
          .from('liabilities')
          .select('*')
          .eq('client_id', user.id);

        if (liabilitiesError) throw new Error(`Failed to fetch liabilities: ${liabilitiesError.message}`);

        const totalAssets = assetsData?.reduce((sum, asset) => sum + (asset.value || 0), 0) || 0;
        const totalLiabilities = liabilitiesData?.reduce((sum, liability) => sum + (liability.amount || 0), 0) || 0;
        
        const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('client_id', user.id);

        if (goalsError) throw new Error(`Failed to fetch goals: ${goalsError.message}`);


        // Update financial data state

        setFinancialData({
          incomes: incomesData || [],
          expenditures: expenditures || [],
          assets: assetsData || [], // Add assets fetch when implementing that feature
          liabilities: liabilitiesData || [], // Add liabilities fetch when implementing that feature
          goals: goalsData || [] // Add the goals data here
        });

      } catch (err) {
      
        setError(err instanceof Error ? err.message : 'Failed to fetch financial data');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [user, session]);

  const RiskProfileSection: React.FC<{ riskProfileData: RiskScores | null }> = ({ riskProfileData }) => {
    if (!riskProfileData) {
      return (
        <section className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Complete your risk assessment to see your investment risk profile</p>
            <button 
              onClick={() => navigate('/client/risk-assessment')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Take Risk Assessment
            </button>
          </div>
        </section>
      );
    }
    return (
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Risk Profile</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            riskProfileData.riskCategory.includes('Conservative') ? 'bg-blue-100 text-blue-800' :
            riskProfileData.riskCategory.includes('Moderate') ? 'bg-green-100 text-green-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {riskProfileData.riskCategory}
          </span>
        </div>
  
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Overall Score</div>
            <div className="text-xl font-semibold">{riskProfileData.overallScore.toFixed(1)}/4</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Capacity for Loss</div>
            <div className="text-xl font-semibold">{riskProfileData.capacityForLoss.category}</div>
          </div>
        </div>
  
        <div className="space-y-3">
          {[
            { label: 'Knowledge', score: riskProfileData.knowledgeScore },
            { label: 'Attitude', score: riskProfileData.attitudeScore },
            { label: 'Capacity', score: riskProfileData.capacityScore },
            { label: 'Time Horizon', score: riskProfileData.timeframeScore }
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span>{item.score.toFixed(1)}/4</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(item.score / 4) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
  
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Capacity for Loss Factors</h3>
          <div className="space-y-4">
            {riskProfileData.capacityForLoss.factors.map((factor, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{factor.factor}</span>
                  <span>{factor.score}/4</span>
                </div>
                <p className="text-sm text-gray-600">{factor.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  useEffect(() => {
    const fetchRiskProfile = async () => {
      if (!user?.id) return;
  
      try {
        console.log('Fetching risk profile for user:', user.id);
        const { data, error } = await supabase
          .from('risk_assessments')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        console.log('Risk profile query result:', { data, error });
  
        if (error) {
          console.error('Error fetching risk profile:', error);
          return;
        }
    
        if (data && data.calculated_scores) {
          const calculatedScores = data.calculated_scores;
          
          // Validate that the calculated_scores have the expected structure
          const isValidScores = 
            typeof calculatedScores.knowledgeScore === 'number' &&
            typeof calculatedScores.attitudeScore === 'number' &&
            typeof calculatedScores.capacityScore === 'number' &&
            typeof calculatedScores.timeframeScore === 'number' &&
            typeof calculatedScores.overallScore === 'number' &&
            typeof calculatedScores.riskCategory === 'string';
            

            if (isValidScores) {
              console.log('Setting validated risk profile:', calculatedScores);
              setRiskProfile({
                knowledgeScore: calculatedScores.knowledgeScore,
                attitudeScore: calculatedScores.attitudeScore,
                capacityScore: calculatedScores.capacityScore,
                timeframeScore: calculatedScores.timeframeScore,
                overallScore: calculatedScores.overallScore,
                riskCategory: calculatedScores.riskCategory,
                capacityForLoss: {
                  score: 2, // Default middle score
                  category: 'Medium',
                  factors: [
                    {
                      factor: 'Emergency Fund',
                      score: 2,
                      explanation: 'Estimated based on available data'
                    },
                    {
                      factor: 'Debt Service',
                      score: 2,
                      explanation: 'Estimated based on available data'
                    }
                  ]
                }
              });
            } else {
              console.warn('Invalid risk scores structure:', calculatedScores);
            }
          } else {
            console.warn('No calculated scores found in risk assessment');
          }
      
        } catch (error) {
          console.error('Error fetching risk assessment:', error);
        }
      };
  
      fetchRiskProfile();
    }, [user?.id]); 


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading your financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <h3 className="text-red-800 font-medium">Error Loading Data</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

if (!financialData) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="mb-4">No financial data available.</p>
      <button
        onClick={() => navigate('/client/income')}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Add Income Data
      </button>
    </div>
  );
}


  const NoDataPrompt = ({ type, url }: { type: string, url: string }) => (
    <div className="p-4 border rounded">
      <p>No {type} data available. <Link to={url}>Click here to add your {type}</Link></p>
    </div>
  );


  const expenditureChartData = {
    labels: financialData.expenditures.map((item) => item.category),
    datasets: [
      {
        label: 'Expenditure by Category',
        data: financialData.expenditures.map((item) => item.amount),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        ],
      },
    ],
  };

  const incomeChartData = {
    labels: financialData.incomes
      // Filter out empty or zero incomes
      .filter(inc => inc.amount && Number(inc.amount) > 0)
      // Group by type to prevent duplicates
      .reduce((unique: Income[], income: Income) => {
        const existing = unique.find(item => item.type === income.type);
        if (!existing) {
          unique.push(income);
        } else {
          // If type already exists, add to the amount
          existing.amount = Number(existing.amount) + Number(income.amount);
        }
        return unique;
      }, [])
      .map(inc => inc.type),
    datasets: [{
      label: 'Income Sources',
      data: financialData.incomes
        // Filter out empty or zero incomes
        .filter(inc => inc.amount && Number(inc.amount) > 0)
        // Group by type to prevent duplicates
        .reduce((unique: IncomeItem[], income) => {
          const existing = unique.find(item => item.type === income.type);
          if (!existing) {
            unique.push(income);
          } else {
            // If type already exists, add to the amount
            existing.amount = Number(existing.amount) + Number(income.amount);
          }
          return unique;
        }, [])
        .map(inc => inc.frequency === 'Monthly' ? inc.amount * 12 : inc.amount),
      backgroundColor: [
        '#4BC0C0', '#36A2EB', '#FFCE56', '#FF6384', '#9966FF', '#FF9F40'
      ],
    }]
  };

  const assetsLiabilitiesChartData = {
    labels: ['Assets', 'Liabilities'],
    datasets: [
      {
        label: 'Assets vs. Liabilities',
        data: [
          financialSummary?.totalAssets || 0,
          financialSummary?.totalLiabilities || 0
        ],
        backgroundColor: ['#4BC0C0', '#FF6384'],
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Your Financial Dashboard</h1>
      </header>

      <div className="space-y-6">
      <NetWorthCard 
        assets={financialSummary?.totalAssets || 0}
        liabilities={financialSummary?.totalLiabilities || 0}
      />
      </div>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <section 
          onClick={() => navigate('/client/income')} 
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
        >
          <h2 className="text-xl font-semibold mb-4">Income Overview</h2>
              {financialData?.incomes.length > 0 ? (
                <Pie data={incomeChartData} />
              ) : (
                <NoDataPrompt type="income" url="/client/income" />
              )}
            
            <div className="space-y-2">
              <p className="font-medium">Total Annual Income: {financialCalculations.formatCurrency(financialSummary?.annualIncome || 0)}</p>
              <p className="font-medium">Monthly Average: {financialCalculations.formatCurrency(financialSummary?.monthlyIncome || 0)}</p>
            </div>
              <div className="max-h-40 overflow-y-auto mt-4">
              {financialData.incomes
                // Filter out empty or zero incomes
                .filter(inc => inc.amount && Number(inc.amount) > 0)
                // Group by type to prevent duplicates
                .reduce((unique: Income[], income) => {
                  const existing = unique.find(item => item.type === income.type);
                  if (!existing) {
                    unique.push(income);
                  } else {
                    // If type already exists, add to the amount
                    existing.amount = Number(existing.amount) + Number(income.amount);
                  }
                  return unique;
                }, [])
                .map((inc, index) => (
                  <div key={index} className="flex justify-between text-sm py-1">
                    <span>{inc.type}</span>
                    <span>
                      {financialCalculations.formatCurrency(inc.amount)}
                      <span className="text-gray-500 text-xs ml-1">
                        ({inc.frequency})
                      </span>
                    </span>
                  </div>
                ))
              }
            </div>
          
        </section>

      <section onClick={() => navigate('/client/expenditure')} 
      className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <h2>Expenditure Breakdown</h2>
            {financialData?.expenditures.length > 0 ? (
              <Pie data={expenditureChartData} />
            ) : (
              <NoDataPrompt type="expenditure" url="/client/expenditure" />
            )}
            <div className="space-y-2">
          <p>Total Monthly Expenses: {financialCalculations.formatCurrency(financialSummary?.monthlyExpenditure || 0)}</p>
          <div className="max-h-40 overflow-y-auto">
            {financialData?.expenditures.map((exp, index) => (
              <div key={index} className="flex justify-between text-sm py-1">
                <span>{exp.category}</span>
                <span>{financialCalculations.formatCurrency(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

        <section className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate('/client/assets')}>
        <h2>Assets and Liabilities</h2>
          {(financialSummary?.totalAssets || 0) > 0 || (financialSummary?.totalLiabilities || 0) > 0 ? (
            <>
              <p><strong>Total Assets:</strong> {financialCalculations.formatCurrency(financialSummary?.totalAssets || 0)}</p>
              <p><strong>Total Liabilities:</strong> {financialCalculations.formatCurrency(financialSummary?.totalLiabilities || 0)}</p>
              <p><strong>Net Worth:</strong> {financialCalculations.formatCurrency(financialSummary?.netWorth || 0)}</p>
              <Bar data={assetsLiabilitiesChartData} />
            </>
          ) : (
            <div>
              <NoDataPrompt type="assets" url="/client/assets" />
              <NoDataPrompt type="liabilities" url="/client/liabilities" />
            </div>
          )}
        </section>

        <section onClick={() => navigate('/client/goals')}
        className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <h2 className="text-xl font-semibold mb-4">Financial Goals</h2>
          {financialData?.goals && financialData.goals.length > 0 ? (
            <div className="space-y-4">
              {financialData.goals.map((goal, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-gray-500">Goal</p>
                      <p className="text-lg font-medium">{goal.goal}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Target Amount</p>
                      <p className="text-lg font-medium">{financialCalculations.formatCurrency(goal.target_amount)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Time Horizon</p>
                      <p className="text-lg font-medium">{goal.time_horizon} years</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't set any financial goals yet</p>
              <Link 
                to="/client/goals" 
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Set Your Goals
              </Link>
            </div>
          )}
        </section>
        
        <section className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Risk Profile</h2>
          {riskProfile ? (
            <RiskProfileResults riskData={riskProfile} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Complete your risk assessment to see your investment risk profile</p>
              <button 
                onClick={() => navigate('/client/risk-assessment')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Take Risk Assessment
              </button>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Actions</h2>
          <div className="flex justify-center gap-10">
            <button onClick={() => navigate('/client/income')}>Update Income</button>
            <button onClick={() => navigate('/client/expenditure')}>Update Expenditure</button>
            <button onClick={() => navigate('/client/assets')}>Update Assets</button>
            <button onClick={() => navigate('/client/liabilities')}>Update Liabilities</button>
            <button onClick={() => navigate('/client/goals')}>Set Goals</button>
            <button onClick={() => navigate('/client/risk-assessment')}>Update Risk Score</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ClientDashboard;
