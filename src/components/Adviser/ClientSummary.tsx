import React, { useState } from 'react';
import { financialCalculations } from '../../utils/financialcalculationMetrics';
import type { Income, Expenditure, Asset, Liability, Goal, Profile, ClientData } from '../../@types/financial';

interface ClientSummaryProps {
  data: ClientData;
}

const ClientSummary: React.FC<ClientSummaryProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  // Calculate financial metrics
  const financialSummary = financialCalculations.calculateFinancialSummary({
    incomes: data.incomes,
    expenditures: data.expenditures,
    assets: data.assets,
    liabilities: data.liabilities,
    goals: data.goals
  });

  // Check for missing sections
  const missingData = {
    income: data.incomes.length === 0,
    expenditure: data.expenditures.length === 0,
    assets: data.assets.length === 0,
    liabilities: data.liabilities.length === 0,
    goals: data.goals.length === 0,
    riskAssessment: data.risk_assessments.length === 0,
    kyc: !data.profile?.kyc
  };

  const hasMissingData = Object.values(missingData).some(missing => missing);

  // Extract age if date of birth exists
  let age: number | null = null;
  if (data.profile?.kyc?.date_of_birth) {
    const dob = new Date(data.profile.kyc.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    
    // Adjust age if birthday hasn't occurred yet this year
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  // Find retirement goal if it exists
  const retirementGoal = data.goals.find(goal => 
    goal.goal.toLowerCase().includes('retirement')
  );

  // Create summary text
  const createSummary = () => {
    let summary = '';
    
    // Personal info
    if (data.profile?.name) {
      summary += `${data.profile.name} `;
      if (age) {
        summary += `is ${age} years old `;
      }
    }
    
    
    // Family situation - placeholder since we don't have family info in the data model
    // This would be expanded with actual data when available
    
    // Financial position
    summary += `They have a net worth of ${financialCalculations.formatCurrency(financialSummary.netWorth)} `;
    summary += `with total assets of ${financialCalculations.formatCurrency(financialSummary.totalAssets)} `;
    summary += `and liabilities of ${financialCalculations.formatCurrency(financialSummary.totalLiabilities)}. `;
    
    // Monthly income/expenditure
    summary += `Monthly income is ${financialCalculations.formatCurrency(financialSummary.monthlyIncome)} `;
    summary += `with expenditure of ${financialCalculations.formatCurrency(financialSummary.monthlyExpenditure)}, `;
    
    const monthlySurplus = financialSummary.monthlyIncome - financialSummary.monthlyExpenditure;
    if (monthlySurplus > 0) {
      summary += `resulting in a monthly surplus of ${financialCalculations.formatCurrency(monthlySurplus)}. `;
    } else {
      summary += `resulting in a monthly deficit of ${financialCalculations.formatCurrency(Math.abs(monthlySurplus))}. `;
    }
    
    // Goals
    if (data.goals.length > 0) {
      summary += `Their financial goals include `;
      
      const goalStrings = data.goals.map(goal => {
        return `${goal.goal.toLowerCase()} (${financialCalculations.formatCurrency(goal.target_amount)} in ${goal.time_horizon} years)`;
      });
      
      if (goalStrings.length === 1) {
        summary += goalStrings[0];
      } else {
        const lastGoal = goalStrings.pop();
        summary += `${goalStrings.join(', ')} and ${lastGoal}`;
      }
      
      summary += '. ';
    }
    
    // Retirement specific info
    if (retirementGoal) {
      summary += `They are planning for retirement in ${retirementGoal.time_horizon} years `;
      summary += `with a target of ${financialCalculations.formatCurrency(retirementGoal.target_amount)}. `;
    }
    
    return summary;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Client Summary</h3>
        <button 
          onClick={toggleExpand} 
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-gray-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
          </svg>
        </button>
      </div>
      
      {isExpanded && (
        <>
          <div className="mb-4">
            <p className="text-gray-700">{createSummary()}</p>
          </div>
          
          {hasMissingData && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Profile Completion</h4>
              <p className="text-gray-600">
                Please help your client complete their profile by collecting information about:
                {[
                  missingData.kyc && 'KYC information',
                  missingData.income && 'income details',
                  missingData.expenditure && 'expenditure',
                  missingData.assets && 'assets',
                  missingData.liabilities && 'liabilities',
                  missingData.goals && 'financial goals',
                  missingData.riskAssessment && 'risk assessment'
                ].filter(Boolean).join(', ')}.
              </p>
              <p className="text-gray-600 mt-2">
                A complete profile will help provide more accurate financial recommendations.
              </p>
            </div>
          )}
        </>
      )}
      
      {!isExpanded && hasMissingData && (
        <div className="flex items-center">
          <span className="text-sm text-gray-600">
            Client profile needs additional information
          </span>
        </div>
      )}
    </div>
  );
};

export default ClientSummary;