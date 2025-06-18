// utils/riskAssessments/riskCalculations

import { financialCalculations } from '../financialcalculationMetrics';
import { Income, Expenditure, Asset, Liability, Goal } from '../../@types/financial';
import { FinancialMetrics, CapacityScore, RiskScores } from './types';


export const calculateFinancialMetricsForRisk = (
    incomes: Income[],
    expenditures: Expenditure[],
    assets: Asset[],
    liabilities: Liability[],
    goals: Goal[],
    dateOfBirth?: string
  ): FinancialMetrics => {
    const monthlyIncome = financialCalculations.calculateMonthlyIncome(incomes);
    const monthlyExpenses = financialCalculations.calculateMonthlyExpenditure(expenditures);
    const totalAssets = financialCalculations.calculateTotalAssets(assets);
    const totalLiabilities = financialCalculations.calculateTotalLiabilities(liabilities);
    
    // Calculate net worth
    const netWorth = totalAssets - totalLiabilities;

    const totalIncome = incomes.reduce(
      (sum, inc) => sum + (inc.frequency === 'Annual' ? inc.amount : inc.amount * 12),
      0
    );
  
    // Calculate annual debt service
    const annualDebtService = liabilities.reduce((sum, liability) => { // Fixed: 'data.liabilities' -> 'liabilities'
      if (['Loan', 'Mortgage'].includes(liability.type) && liability.term && liability.interest_rate) {
        const annualRate = liability.interest_rate / 100;
        const payment =
          (liability.amount * annualRate) / (1 - Math.pow(1 + annualRate, -liability.term));
        return sum + payment;
      }
      return sum + liability.amount; // Fallback for non-term debts
    }, 0);
    // Calculate liquid assets (assets marked as Cash, Savings, or Investments)
    const liquidAssets = assets.reduce((sum, asset) => {
      const isLiquid = ['Cash', 'Savings', 'Investments'].includes(asset.type);
      return sum + (isLiquid ? Number(asset.value) : 0);
    }, 0);

    console.log('Total liquid assets calculated:', liquidAssets);
    
  
    // Calculate age and years to retirement
    const age = dateOfBirth ? financialCalculations.calculateAge(dateOfBirth) : 0;
    
    // Find retirement goal
    const retirementGoal = goals.find(goal => 
      goal.goal.toLowerCase().includes('retirement'));
    const yearsToRetirement = retirementGoal ? Number(retirementGoal.time_horizon) : null;
    
    // Log the final metrics
    console.log('Final financial metrics:', {
      monthlyIncome,
      monthlyExpenses,
      totalAssets,
      totalLiabilities,
      liquidAssets,
      age,
      yearsToRetirement, 
      netWorth,
      annualDebtService,
      totalIncome
    });

    console.log('Liquid Assets Calculation Debug:', {
      totalAssets: assets.length,
      liquidAssetsValue: liquidAssets,
      assets: assets.map(asset => ({
        type: asset.type,
        value: asset.value
      }))
    });
  

    return {
      monthlyIncome,
      monthlyExpenses,
      totalAssets,
      totalLiabilities,
      liquidAssets,
      age,
      yearsToRetirement, 
      netWorth,
      annualDebtService,
      totalIncome

    };
  };


export const calculateCapacityForLoss = (
    metrics: FinancialMetrics): CapacityScore => {
    const factors: { factor: string; score: number; explanation: string }[] = [];
    let totalScore = 0;
  
    // 1. Emergency Fund Ratio
    const monthlyExpenses = metrics.monthlyExpenses;
    const emergencyFundRatio = metrics.liquidAssets / monthlyExpenses;
    let emergencyFundScore = 0;
  
    if (emergencyFundRatio >= 6) emergencyFundScore = 4;
    else if (emergencyFundRatio >= 3) emergencyFundScore = 3;
    else if (emergencyFundRatio >= 1) emergencyFundScore = 2;
    else emergencyFundScore = 1;
  
    factors.push({
      factor: 'Emergency Fund',
      score: emergencyFundScore,
      explanation: `Has ${emergencyFundRatio.toFixed(1)} months of expenses covered`
    });
    totalScore += emergencyFundScore;
  
    // 2. Debt Service Ratio
    const monthlyIncome = metrics.monthlyIncome;
    const debtServiceRatio = metrics.totalLiabilities / (monthlyIncome * 12);
    let debtScore = 0;
  
    if (debtServiceRatio <= 0.2) debtScore = 4;
    else if (debtServiceRatio <= 0.35) debtScore = 3;
    else if (debtServiceRatio <= 0.5) debtScore = 2;
    else debtScore = 1;
  
    factors.push({
      factor: 'Debt Service',
      score: debtScore,
      explanation: `Debt service ratio is ${(debtServiceRatio * 100).toFixed(1)}%`
    });
    totalScore += debtScore;
  
    // 3. Net Worth Ratio
    const netWorthRatio = metrics.totalAssets / Math.max(metrics.totalLiabilities, 1);
    let netWorthScore = 0;
  
    if (netWorthRatio >= 5) netWorthScore = 4;
    else if (netWorthRatio >= 3) netWorthScore = 3;
    else if (netWorthRatio >= 1) netWorthScore = 2;
    else netWorthScore = 1;
  
    factors.push({
      factor: 'Net Worth',
      score: netWorthScore,
      explanation: `Net worth ratio is ${netWorthRatio.toFixed(1)}x liabilities`
    });
    totalScore += netWorthScore;
    
    // Income Stability
    const surplusRatio = (metrics.monthlyIncome - metrics.monthlyExpenses) / metrics.monthlyIncome;
    let surplusScore = 0;
    if (surplusRatio >= 0.3) surplusScore = 4;
    else if (surplusRatio >= 0.2) surplusScore = 3;
    else if (surplusRatio >= 0.1) surplusScore = 2;
    else surplusScore = 1;

    factors.push({
        factor: 'Income Stability',
        score: surplusScore,
        explanation: `Monthly surplus ratio is ${(surplusRatio * 100).toFixed(1)}%`
    });
    totalScore += surplusScore;


    const finalScore = totalScore / 4;
    let category: string;
    if (finalScore >= 3.5) category = 'High';
    else if (finalScore >= 2.5) category = 'Medium';
    else if (finalScore >= 1.5) category = 'Low';
    else category = 'Very Low';

    return {
        score: finalScore,
        category,
        factors
    };
    };

    

    export const calculateRiskScores = (
    responses: Record<string, number>,
    metrics: FinancialMetrics
    ): RiskScores => {
    const calculateAverage = (questions: string[]) => {
        const scores = questions.map(q => Number(responses[q]) || 0);
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    };

    const knowledgeScore = calculateAverage(['knowledge_1', 'knowledge_2']);
    const attitudeScore = calculateAverage(['attitude_1', 'attitude_2']);
    const capacityScore = calculateAverage(['capacity_1', 'capacity_2']);
    const timeframeScore = calculateAverage(['timeframe_1']);

    const capacityForLoss = calculateCapacityForLoss(metrics);

    const overallScore = (
        knowledgeScore * 0.20 +
        attitudeScore * 0.25 +
        capacityScore * 0.20 +
        timeframeScore * 0.15 +
        capacityForLoss.score * 0.20
    );

    const getRiskCategory = (score: number): string => {
        if (score <= 1.5) return 'Very Conservative';
        if (score <= 2.0) return 'Conservative';
        if (score <= 2.5) return 'Moderate Conservative';
        if (score <= 3.0) return 'Moderate';
        if (score <= 3.5) return 'Moderate Aggressive';
        return 'Aggressive';
    };

    return {
        knowledgeScore,
        attitudeScore,
        capacityScore,
        timeframeScore,
        overallScore,
        riskCategory: getRiskCategory(overallScore),
        capacityForLoss
    };
    };