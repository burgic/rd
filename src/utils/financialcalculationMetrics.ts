// src/utils/financialCalculationMetrics.ts
import { calculateAge } from 'components/Chat/Calculate';
import { 
    Income, 
    Expenditure, 
    Asset, 
    Liability, 
    Goal,
    FinancialData 
  } from '../@types/financial';
  
  export const financialCalculations = {
    toMonthly: (amount: number, frequency: string = 'monthly'): number => {
      return frequency.toLowerCase() === 'annual' ? amount / 12 : amount;
    },
  
    toAnnual: (amount: number, frequency: string = 'monthly'): number => {
      return frequency.toLowerCase() === 'monthly' ? amount * 12 : amount;
    },
  
    calculateMonthlyIncome: (incomes: Income[]): number => {
      return incomes.reduce((sum, income) => 
        sum + financialCalculations.toMonthly(Number(income.amount), income.frequency), 0);
    },
  
    calculateAnnualIncome: (incomes: Income[]): number => {
      return incomes.reduce((sum, income) => 
        sum + financialCalculations.toAnnual(Number(income.amount), income.frequency), 0);
    },
  
    calculateMonthlyExpenditure: (expenditures: Expenditure[]): number => {
      return expenditures.reduce((sum, exp) => 
        sum + financialCalculations.toMonthly(Number(exp.amount), exp.frequency), 0);
    },
  
    calculateAnnualExpenditure: (expenditures: Expenditure[]): number => {
      return expenditures.reduce((sum, exp) => 
        sum + financialCalculations.toAnnual(Number(exp.amount), exp.frequency), 0);
    },
  
    calculateTotalAssets: (assets: Asset[]): number => {
      return assets.reduce((sum, asset) => sum + Number(asset.value), 0);
    },
  
    calculateTotalLiabilities: (liabilities: Liability[]): number => {
      return liabilities.reduce((sum, liability) => sum + Number(liability.amount), 0);
    },
  
    calculateNetWorth: (assets: Asset[], liabilities: Liability[]): number => {
      return financialCalculations.calculateTotalAssets(assets) - 
             financialCalculations.calculateTotalLiabilities(liabilities);
    },
  
    calculateFinancialSummary: (data: FinancialData) => {
      // Calculate annual debt service for loans and mortgages
      const annualDebtService = data.liabilities.reduce((sum, liability) => {
        if (['Loan', 'Mortgage'].includes(liability.type) && liability.term && liability.interest_rate) {
          const annualRate = liability.interest_rate / 100;
          const payment = 
            (liability.amount * annualRate) / (1 - Math.pow(1 + annualRate, -liability.term));
          return sum + payment;
        }
        // For other liabilities, just add the minimum payments (estimated as 5% of balance)
        return sum + (liability.amount * 0.05);
      }, 0);

      // Calculate total annual income
      const totalIncome = financialCalculations.calculateAnnualIncome(data.incomes);
      
      return {
        monthlyIncome: financialCalculations.calculateMonthlyIncome(data.incomes),
        annualIncome: financialCalculations.calculateAnnualIncome(data.incomes),
        monthlyExpenditure: financialCalculations.calculateMonthlyExpenditure(data.expenditures),
        annualExpenditure: financialCalculations.calculateAnnualExpenditure(data.expenditures),
        totalAssets: financialCalculations.calculateTotalAssets(data.assets),
        totalLiabilities: financialCalculations.calculateTotalLiabilities(data.liabilities),
        netWorth: financialCalculations.calculateNetWorth(data.assets, data.liabilities),
        annualDebtService: annualDebtService,
        totalIncome: totalIncome
      };
    },
  
    formatCurrency: (amount: number): string => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    },
  
    calculatePercentage: (amount: number, total: number): number => {
      if (total === 0) return 0;
      return Number(((amount / total) * 100).toFixed(1));
    },

    calculateAge: (birthDate: string): number => {
      if (!birthDate) return 0;

      const today = new Date();
      const birth = new Date(birthDate);

      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() <birth.getDate())) {
        age--;
      }

      return age;
    },

      // You might also want to add related calculations like:
    calculateRetirementAge: (birthDate: string, targetRetirementYear: number): number => {
      const currentAge = financialCalculations.calculateAge(birthDate);
      return targetRetirementYear - new Date().getFullYear() + currentAge;
    },

    calculateYearsUntilRetirement: (birthDate: string, targetRetirementAge: number): number => {
      const currentAge = financialCalculations.calculateAge(birthDate);
      return targetRetirementAge - currentAge;
    }

  };