import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { Pie, Bar } from 'react-chartjs-2';
import { financialCalculations } from '../../utils/financialcalculationMetrics';
import type { Income, Expenditure, Asset, Liability, Goal, Profile, ClientData, RiskAssessmentEntry } from '../../@types/financial';
import RiskProfileResults from '../Client/Risk/RiskProfileResults';
import { RiskScores } from 'utils/riskAssessment';
import FileNoteComponent from './FileNote';
import { ExtractedData } from '../../@types/fileNote';
import { updateClientDetails } from '../../utils/fileNoteUtils';
import toast from 'react-hot-toast'; // Install with: npm install react-hot-toast
import ClientSummary from './ClientSummary';
import ClientDocumentsList from 'components/Common/Documents/ClientDocumentList';
import DocumentUpload from '../Common/Documents/DocumentUpload';
import DocumentList from 'components/Common/Documents/DocumentList';



const ClientDetails = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ClientData>({
    profile: null,
    incomes: [] as Income[],
    expenditures: [] as Expenditure[],
    assets: [] as Asset[],
    liabilities: [] as Liability[],
    goals: [] as Goal[], 
    risk_assessments: [] as RiskAssessmentEntry[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskProfileData, setRiskProfileData] = useState<RiskScores | null>(null);
  const [isUpdatingFromFileNote, setIsUpdatingFromFileNote] = useState(false);
  const [clientSummary, setClientSummary] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshDocuments, setRefreshDocuments] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  

  const handleExtractedData = async (extractedData: ExtractedData) => {
    if (!clientId || !extractedData) return;
    
    setIsUpdatingFromFileNote(true);
    
    try {
      const result = await updateClientDetails(clientId, extractedData);
      
      if (result.success) {
        toast.success('Client information updated from file note');
        // Refetch client data to reflect the changes
        fetchData();
      } else {
        toast.error(`Failed to update client data: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating client data:', error);
      toast.error('An error occurred while updating client data');
    } finally {
      setIsUpdatingFromFileNote(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setError('No client ID provided');
      setIsLoading(false);
      return;
    }

    try {
      const [
        { data: profile },
        { data: incomes },
        { data: expenditures },
        { data: assets },
        { data: liabilities },
        { data: goals },
        { data: kycData }, 
        { data: risk_assessments}
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId).single(),
        supabase.from('incomes').select('*').eq('client_id', clientId),
        supabase.from('expenditures').select('*').eq('client_id', clientId),
        supabase.from('assets').select('*').eq('client_id', clientId),
        supabase.from('liabilities').select('*').eq('client_id', clientId),
        supabase.from('goals').select('*').eq('client_id', clientId),
        supabase.from('kyc_data').select('*').eq('profile_id', clientId).single(), 
        supabase.from('risk_assessments').select('*').eq('client_id', clientId)
      ]);

      setData({
        profile: profile ? { ...profile, kyc: kycData } as Profile : null,
        incomes: incomes as Income[] || [],
        expenditures: expenditures as Expenditure[] || [],
        assets: assets as Asset[] || [],
        liabilities: liabilities as Liability[] || [],
        goals: goals as Goal[] || [],
        risk_assessments: risk_assessments || []
      });
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setError('An unknown error occurred');
        toast.error('Failed to load client data')
      }
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  useEffect(() => {
    const fetchRiskProfile = async () => {
      if (!clientId) return;
  
      try {

        
        const { data, error } = await supabase
          .from('risk_assessments')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
    
        console.log('RiskProfileResults received data:', data);

        if (error) throw error;
        if (data?.calculated_scores) {
          // Convert the stored calculated_scores into the RiskScores format
            const riskScores = {
              knowledgeScore: data.calculated_scores.knowledgeScore,
              attitudeScore: data.calculated_scores.attitudeScore,
              capacityScore: data.calculated_scores.capacityScore,
              timeframeScore: data.calculated_scores.timeframeScore,
              overallScore: data.calculated_scores.overallScore,
              riskCategory: data.calculated_scores.riskCategory,
              capacityForLoss: data.calculated_scores.capacityForLoss
            };

          console.log('Formatted risk scores:', riskScores);
          setRiskProfileData(riskScores);
        }
      } catch (error) {
        console.error('Error fetching risk profile:', error);
      }
    };

    fetchRiskProfile(); // Call the function

}, [clientId]);
  
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const financialSummary = financialCalculations.calculateFinancialSummary({
    incomes: data.incomes,
    expenditures: data.expenditures,
    assets: data.assets,
    liabilities: data.liabilities,
    goals: data.goals
  });

  // Ensure we have values for debt service calculations
  if (financialSummary.annualDebtService === undefined) {
    financialSummary.annualDebtService = 0;
  }
  if (financialSummary.totalIncome === undefined) {
    financialSummary.totalIncome = financialSummary.annualIncome;
  }

  const incomeChartData = {
    labels: data.incomes.map(inc => inc.type),
    datasets: [{
      data: data.incomes.map(inc => inc.amount),
      backgroundColor: [
        '#4BC0C0', '#36A2EB', '#FFCE56', '#FF6384', '#9966FF'
      ]
    }]
  };

  const expenditureChartData = {
    labels: data.expenditures.map(exp => exp.category),
    datasets: [{
      data: data.expenditures.map(exp => exp.amount),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
      ]
    }]
  };

  const assetChartData = {
    labels: data.assets.map(asset => asset.type),
    datasets: [{
      data: data.assets.map(asset => asset.value),
      backgroundColor: [
        '#4BC0C0', '#36A2EB', '#FFCE56', '#FF6384', '#9966FF'
      ]
    }]
  };
  
  const liabilityChartData = {
    labels: data.liabilities.map(liability => liability.type),
    datasets: [{
      data: data.liabilities.map(liability => liability.amount),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
      ]
    }]
  };
  

  const assetsLiabilitiesData = {
    labels: ['Assets', 'Liabilities'],
    datasets: [{
      data: [financialSummary.totalAssets, financialSummary.totalLiabilities],
      backgroundColor: ['#4BC0C0', '#FF6384']
    }]
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    // Trigger documents list refresh
    setRefreshDocuments(prev => prev + 1);
  };

  const navigateToDocuments = () => {
    navigate(`/adviser/client/${clientId}/documents`);
  };

  const handleDocumentSelect = (document: any) => {
    setSelectedDocument(document);
  };


  const RiskProfileSection: React.FC<{ riskProfileData: RiskScores | null }> = ({ riskProfileData }) => {
    if (!riskProfileData) {
      return (
        <section className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Client has not completed risk assessment</p>
          </div>
        </section>
      );
    }

    
  
    return (
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Risk Profile Analysis</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            riskProfileData.riskCategory.includes('Conservative') ? 'bg-blue-100 text-blue-800' :
            riskProfileData.riskCategory.includes('Moderate') ? 'bg-green-100 text-green-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {riskProfileData.riskCategory}
          </span>
        </div>
  
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Overall Risk Score</div>
            <div className="text-2xl font-semibold">{riskProfileData.overallScore.toFixed(1)}/4</div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div 
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${(riskProfileData.overallScore / 4) * 100}%` }}
              />
            </div>
          </div>
  
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Capacity for Loss</div>
            <div className="text-2xl font-semibold">{riskProfileData.capacityForLoss.category}</div>
            <div className="text-sm text-gray-500 mt-2">
              Score: {riskProfileData.capacityForLoss.score.toFixed(1)}/4
            </div>
          </div>
        </div>
  
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Risk Components</h3>
            <div className="space-y-4">
              {[
                { label: 'Knowledge', score: riskProfileData.knowledgeScore },
                { label: 'Attitude', score: riskProfileData.attitudeScore },
                { label: 'Capacity', score: riskProfileData.capacityScore },
                { label: 'Time Horizon', score: riskProfileData.timeframeScore }
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm">{item.score.toFixed(1)}/4</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${(item.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          <div>
            <h3 className="text-lg font-medium mb-4">Capacity for Loss Analysis</h3>
            <div className="space-y-4">
              {riskProfileData.capacityForLoss.factors.map((factor, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{factor.factor}</span>
                    <span>{factor.score}/4</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{factor.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Client Profile Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold mb-4">{data.profile?.name}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/adviser/client/${clientId}/insights`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Insights
            </button>
            <button
              onClick={() => navigate(`/adviser/client/${clientId}/reports`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Reports
            </button>
                     
              <button
                onClick={() => navigate(`/adviser/client/${clientId}/suitability-report`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Suitability Report
              </button>
            </div>
          </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p><span className="font-medium">Email:</span> {data.profile?.email}</p>
            <p><span className="font-medium">Date of Birth:</span> {data.profile?.kyc?.date_of_birth}</p>
            <p><span className="font-medium">Phone:</span> {data.profile?.kyc?.phone_number}</p>
          </div>
          <div>
            <p><span className="font-medium">Address:</span></p>
            <p>{data.profile?.kyc?.address_line1}</p>
            <p>{data.profile?.kyc?.address_line2}</p>
            <p>{data.profile?.kyc?.city}, {data.profile?.kyc?.postal_code}</p>
          </div>
        </div>
      </div>

      <ClientSummary data={data} />

      {/* Financial Summary */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Cash Flow</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline">
                <p className="text-gray-600">Monthly Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {financialCalculations.formatCurrency(financialSummary.monthlyIncome)}
                </p>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-baseline">
                <p className="text-gray-600">Monthly Expenditure</p>
                <p className="text-2xl font-bold text-red-600">
                  {financialCalculations.formatCurrency(financialSummary.monthlyExpenditure)}
                </p>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                <div className="h-full bg-red-500 rounded-full" style={{ 
                  width: `${Math.min(100, (financialSummary.monthlyExpenditure / financialSummary.monthlyIncome) * 100)}%` 
                }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-baseline">
                <p className="text-gray-700 font-medium">Monthly Surplus</p>
                <p className={`text-xl font-bold ${
                  financialSummary.monthlyIncome - financialSummary.monthlyExpenditure > 0 ? 
                  'text-green-600' : 'text-red-600'
                }`}>
                  {financialCalculations.formatCurrency(financialSummary.monthlyIncome - financialSummary.monthlyExpenditure)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Net Worth</h3>
          <p className="text-3xl font-bold text-blue-600 mb-2">
            {financialCalculations.formatCurrency(financialSummary.netWorth)}
          </p>
          <div className="space-y-3 mt-4">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Assets</span>
                <span className="font-medium text-green-600">{financialCalculations.formatCurrency(financialSummary.totalAssets)}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-1">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Liabilities</span>
                <span className="font-medium text-red-600">{financialCalculations.formatCurrency(financialSummary.totalLiabilities)}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-1">
                <div className="h-full bg-red-500 rounded-full" style={{ 
                  width: `${Math.min(100, (financialSummary.totalLiabilities / financialSummary.totalAssets) * 100)}%` 
                }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Financial Goals</h3>
          <div className="space-y-4">
            {data.goals.length > 0 ? (
              data.goals.map((goal, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{goal.goal}</span>
                    <span>{financialCalculations.formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target in {goal.time_horizon} years</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    {/* Here we're using 30% as a placeholder - in a real app you'd calculate actual progress */}
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No financial goals set
              </div>
            )}
          </div>
        </div>
      </div>      {/* Existing Monthly Summary card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Asset Breakdown</h3>
        {/* Group assets by type */}
        <div className="space-y-4 mb-4">
          {Object.entries(
            data.assets.reduce((acc, asset) => {
              acc[asset.type] = (acc[asset.type] || 0) + asset.value;
              return acc;
            }, {} as Record<string, number>)
          ).map(([type, total]) => (
            <div key={type}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-700 font-medium">{type}</span>
                <span className="font-medium">
                  {financialCalculations.formatCurrency(total)}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ 
                    width: `${(total / financialSummary.totalAssets) * 100}%` 
                  }}
                />
              </div>
              <div className="text-xs text-right mt-1 text-gray-500">
                {((total / financialSummary.totalAssets) * 100).toFixed(1)}% of portfolio
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Total Assets</span>
            <span className="font-medium text-lg">
              {financialCalculations.formatCurrency(financialSummary.totalAssets)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Liability Breakdown</h3>
      {/* Detailed list of liabilities */}
      <div className="max-h-64 overflow-y-auto mb-4">
        {data.liabilities.length > 0 ? (
          data.liabilities.map((liability, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b last:border-b-0"
            >
              <div>
                <p className="text-gray-700 font-medium">{liability.type}</p>
                {liability.description && (
                  <p className="text-sm text-gray-500">{liability.description}</p>
                )}
                {['Loan', 'Mortgage'].includes(liability.type) && liability.term && (
                  <p className="text-sm text-gray-500">
                    {liability.term} years @ {liability.interest_rate}%
                  </p>
                )}
              </div>
              <p className="font-medium">
                {financialCalculations.formatCurrency(liability.amount)}
              </p>
            </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-2">No liabilities recorded</p>
              )}
            </div>

              {/* Summary statistics with cleaner formatting */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Total Liabilities</span>
                  <span className="font-medium text-lg">
                    {financialCalculations.formatCurrency(financialSummary.totalLiabilities)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Annual Debt Service</span>
                  <span className="font-medium">
                    {financialCalculations.formatCurrency(financialSummary.annualDebtService)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Debt Service Ratio</span>
                  <span className={`font-medium ${
                    ((financialSummary.annualDebtService / financialSummary.totalIncome) * 100) > 30 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {financialSummary.totalIncome > 0
                      ? ((financialSummary.annualDebtService / financialSummary.totalIncome) * 100).toFixed(1)
                      : '0.0'}%
                  </span>
                </div>
              </div>
            </div>

              {/* Detailed Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Income Breakdown */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Income Sources</h3>
                  <div className="h-64 flex justify-center items-center mb-4">
            <Pie 
              data={incomeChartData}
              options={{
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      padding: 16
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        let label = context.label || '';
                        let value = context.raw || 0;
                        let total = context.chart.data.datasets[0].data.reduce((a, b) => (a as number) + (b as number), 0);
                        let percentage = Math.round((value as number / (total as number)) * 100);
                        return `${label}: ${financialCalculations.formatCurrency(value as number)} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {data.incomes.map((income, index) => (
              <div key={index} className="flex justify-between py-2 border-b">
                <span className="font-medium">{income.type}</span>
                <div className="text-right">
                  <div>{financialCalculations.formatCurrency(income.amount)}</div>
                  <div className="text-gray-500 text-xs">
                    {income.frequency}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t mt-2">
              <span className="font-medium">Monthly Total</span>
              <span className="font-medium">
                {financialCalculations.formatCurrency(financialSummary.monthlyIncome)}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Profile</h3>
          {riskProfileData ? (
            <RiskProfileResults riskData={riskProfileData} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No risk profile data available</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Documents</h2>
              <button 
                onClick={navigateToDocuments}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            
            <div className="p-4">
              <DocumentList 
                key={refreshDocuments}
                clientId={clientId}
                onSelectDocument={handleDocumentSelect}
                adviserMode={true}
                showExtractedData={false}
              />
            </div>
          </div>

          <FileNoteComponent 
        clientId={clientId!} 
        onDataExtracted={handleExtractedData}
      />
          
      </div>

      
    </div>
  );
};

export default ClientDetails;
