// netlify/functions/types/financial.ts

// Base interface for all entries
export interface BaseEntry {
  id: string;
  client_id: string;
  created_at?: string;
}

// Capacity for Loss Types
export interface CapacityFactor {
  factor: string;
  score: number;
  explanation: string;
}

export interface CapacityScore {
  score: number;
  category: string;
  factors: CapacityFactor[];
}

// Risk Assessment Types
export interface RiskScores {
  knowledgeScore: number;
  attitudeScore: number;
  capacityScore: number;
  timeframeScore: number;
  overallScore: number;
  riskCategory: string;
  capacityForLoss: CapacityScore;
}

export interface RiskAssessmentEntry extends BaseEntry {
  responses: Record<string, string>;
  calculated_scores: {
    knowledgeScore: number;
    attitudeScore: number;
    capacityScore: number;
    timeframeScore: number;
    overallScore: number;
    riskCategory: string;
    knowledge_score: number | null;
  }
  attitude_score: number | null;
  capacity_score: number | null;
  timeframe_score: number | null;
  overall_score: number | null;
  risk_category: string | null;
}

// Financial Data Types
export interface Income extends BaseEntry {
  type: string;
  amount: number;
  frequency: string;
}

export interface Expenditure extends BaseEntry {
  category: string;
  amount: number;
  frequency: string;
}

export interface Asset extends BaseEntry {
  type: string;
  description: string;
  value: number;
}

export interface Liability extends BaseEntry {
  type: string;
  description?: string;
  amount: number;
  interest_rate?: number;
}

export interface Goal extends BaseEntry {
  goal: string;
  target_amount: number;
  time_horizon: number;
}

// Metrics Types
export interface FinancialMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidAssets: number;
  age: number;
  yearsToRetirement: number | null;
}

export interface FinancialData {
  incomes: Income[];
  expenditures: Expenditure[];
  assets: Asset[];
  liabilities: Liability[];
  goals: Goal[];
}

// Form Types
export interface FormFields {
  retirement_age: string | number;
  planned_expenditures: string;
  retirement_type: string;
  time_horizon: string | number;
  type: string;
  description: string;
  value: number;
  amount: number;
  interest_rate: number;
  category: string;
  frequency: string;
}

export interface FormField {
  name: keyof FormFields;
  type: 'text' | 'number' | 'select';
  label: string;
  options?: { value: string; label: string }[];
}

export interface FinancialFormProps {
  formType: 'expenditures' | 'assets' | 'goals' | 'liabilities' | 'risk_assessments';
  nextRoute: string;
  stepNumber: number;
  fields: FormField[];
  defaultEntry: Record<string, any>;
}