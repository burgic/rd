// src/utils/riskAssessment/types.ts


export interface RiskQuestion {
    id: string;
    question: string;
    answers: {
      text: string;
      score: number;
    }[];
    category: 'knowledge' | 'attitude' | 'capacity' | 'timeframe';
  }
  
  export interface FinancialMetrics {
    monthlyIncome: number;
    monthlyExpenses: number;
    totalAssets: number;
    totalLiabilities: number;
    liquidAssets: number;
    age: number;
    yearsToRetirement: number | null;
    netWorth: number;
    annualDebtService: number; // Added
    totalIncome: number; // Added (assuming annual total income)
  }
  


  export interface CapacityScore {
    score: number;
    category: string;
    factors: {
      factor: string;
      score: number;
      explanation: string;
    }[];
  }

  export interface RiskScores {
    knowledgeScore: number;
    attitudeScore: number;
    capacityScore: number;
    timeframeScore: number;
    overallScore: number;
    riskCategory: string;
    capacityForLoss: CapacityScore;
  }
  
  export interface RiskProfileResultsProps {
    riskData: RiskScores;
  }
  