// src/types/financial.ts

export interface RiskAssessmentEntry extends BaseEntry {
  responses: Record<string, number>;
  calculated_scores?: {
    knowledgeScore: number | null;
    attitudeScore: number | null;
    capacityScore: number | null;
    timeframeScore: number | null;
    overallScore: number | null;
    riskCategory: string;
    
  };
}

export interface FormFields {
    // Goals fields
    retirement_age: string | number;
    planned_expenditures: string;
    retirement_type: string;
    time_horizon: string | number;
    
    // Assets fields
    type: string;
    description: string;
    value: number;
    
    // Liabilities fields
    amount: number;
    interest_rate: number;
    
    // Expenditure fields
    category: string;
    frequency: string;
  }
  
  export type FormFieldName = keyof FormFields;
  
  export interface FormField {
    name: FormFieldName | string;
    type: 'text' | 'number' | 'select';
    label: string;
    options?: { value: string; label: string }[];
  }
  
  // Update other interfaces to use these field names
  export interface BaseEntry {
    id: string;
    client_id: string;
  }
  
  export interface GoalEntry extends BaseEntry {
    retirement_age: number;
    planned_expenditures: string;
    retirement_type: string;
    time_horizon: number;
  }
  
  export interface AssetEntry extends BaseEntry {
    type: string;
    description: string;
    value: number;
  }
  
  export interface LiabilityEntry extends BaseEntry {
    type: string;
    description: string;
    amount: number;
    interest_rate: number;
    term?: number;
  }
  
  export interface ExpenditureEntry extends BaseEntry {
    category: string;
    amount: number;
    frequency: string;
  }

  export interface RiskAssessmentEntry extends BaseEntry {
    knowledge_score?: number;
    attitude_score?: number;
    capacity_score?: number;
    timeframe_score?: number;
    overall_score?: number;
    risk_category?: string;
    responses: Record<string, number>;
  }
  
  export type FormEntry = GoalEntry | AssetEntry | LiabilityEntry | ExpenditureEntry | RiskAssessmentEntry;
  
  export interface Income {
    client_id: string;
    type: string; // e.g., 'Salary', 'Rental Income'
    amount: number;
    frequency: string; // e.g., 'Monthly', 'Yearly'
  }
  
  export interface Expenditure {
    client_id: string;
    category: string; // e.g., 'Rent/Mortgage', 'Utilities'
    amount: number;
    frequency: string; // e.g., 'Monthly', 'Yearly'
  }
  
  export interface Asset {
    client_id: string;
    type: string; // e.g., 'Property', 'Stocks', 'Savings'
    description: string; // Additional details about the asset
    value: number; // Current value of the asset
  }
  
  export interface Liability {
    client_id: string;
    type: string; // e.g., 'Mortgage', 'Credit Card', 'Student Loan'
    amount: number; // Outstanding balance
    interest_rate?: number; // Interest rate (if applicable)
    description: string;
    term?: number;
  }
  
  export interface Goal {
    client_id: string;
    id: string;
    goal: string; // e.g., 'Retire', 'Pay off mortgage'
    target_amount: number;
    time_horizon: number; // Years to achieve the goal
  }
  
  export interface FinancialData {
    incomes: Income[]; // Detailed incomes
    expenditures: Expenditure[]; // Detailed expenditures
    assets: Asset[]; // Detailed assets
    liabilities: Liability[]; // Detailed liabilities
    goals: Goal[]; // Financial goals
  }
  
  
  export interface FinancialFormProps {
    formType: 'expenditures' | 'assets' | 'goals' | 'liabilities' | 'risk_assessments';
    nextRoute: string;
    stepNumber: number;
    fields: FormField[];
    defaultEntry: Record<string, any>;
  }

  export interface KYCData {
    date_of_birth: string;
    address_line1: string;
    address_line2: string;
    city: string;
    postal_code: string;
    phone_number: string;
  }

  export interface Profile {
    id: string;
    name: string;
    email: string;
    kyc?: KYCData;
  }

  export interface FinancialSummary {
    monthlyIncome: number;
    annualIncome: number;
    monthlyExpenditure: number;
    annualExpenditure: number;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    annualDebtService: number;
    totalIncome: number;
  }

  export interface ClientData {
    profile: Profile | null;
    incomes: Income[];
    expenditures: Expenditure[];
    assets: Asset[];
    liabilities: Liability[];
    goals: Goal[];
    risk_assessments: RiskAssessmentEntry[];
  }
  
  export * from '../../netlify/functions/types/financial';

