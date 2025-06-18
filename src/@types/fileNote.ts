// src/@types/fileNote.ts

export interface FileNote {
    id: string;
    client_id: string;
    adviser_id: string;
    content: string;
    created_at: string;
    updated_at?: string;
    extracted_data?: ExtractedData;
    summary?: string;
    tags?: string[];
  }
  
  export interface ClientSummary {
    id: string;
    client_id: string;
    summary: string;
    updated_at: string;
    created_by?: string;
  }
  
  export interface ExtractedData {
    personalDetails?: {
      age?: number;
      occupation?: string;
      familyStatus?: string;
      dependents?: Dependent[];
      [key: string]: any;
    };
    financialGoals?: {
      shortTerm?: Goal[];
      longTerm?: Goal[];
      retirement?: RetirementGoal;
      [key: string]: any;
    };
    income?: {
      salary?: number;
      bonus?: number;
      rental?: number;
      pension?: number;
      other?: OtherIncome[];
      [key: string]: any;
    };
    expenses?: {
      housing?: number;
      utilities?: number;
      transportation?: number;
      entertainment?: number;
      other?: OtherExpense[];
      [key: string]: any;
    };
    assets?: {
      property?: Property[];
      investments?: Investment[];
      savings?: Saving[];
      other?: OtherAsset[];
      [key: string]: any;
    };
    liabilities?: {
      mortgages?: Mortgage[];
      loans?: Loan[];
      creditCards?: CreditCard[];
      other?: OtherLiability[];
      [key: string]: any;
    };
    riskProfile?: {
      attitude?: string;
      capacity?: string;
      tolerance?: string;
      preferredInvestments?: string[];
      [key: string]: any;
    };
    [key: string]: any;
  }
  
  // Sub-types for extracted data
  export interface Dependent {
    name?: string;
    age?: number;
    relationship?: string;
  }
  
  export interface Goal {
    description: string;
    targetAmount?: number;
    timeHorizon?: number;
  }
  
  export interface RetirementGoal {
    targetAge?: number;
    targetIncome?: number;
    currentProvision?: number;
  }
  
  export interface OtherIncome {
    source: string;
    amount: number;
    frequency: string;
  }
  
  export interface OtherExpense {
    category: string;
    amount: number;
    frequency: string;
  }
  
  export interface Property {
    type: string;
    value: number;
    description?: string;
  }
  
  export interface Investment {
    type: string;
    value: number;
    provider?: string;
    riskLevel?: string;
  }
  
  export interface Saving {
    type: string;
    value: number;
    institution?: string;
    interestRate?: number;
  }
  
  export interface OtherAsset {
    type: string;
    value: number;
    description?: string;
  }
  
  export interface Mortgage {
    property: string;
    outstandingAmount: number;
    interestRate: number;
    term?: number;
    monthlyPayment?: number;
  }
  
  export interface Loan {
    type: string;
    outstandingAmount: number;
    interestRate: number;
    term?: number;
    monthlyPayment?: number;
  }
  
  export interface CreditCard {
    provider: string;
    outstandingBalance: number;
    creditLimit?: number;
    interestRate: number;
  }
  
  export interface OtherLiability {
    type: string;
    outstandingAmount: number;
    description?: string;
  }