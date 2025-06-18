// src/hooks/useFinancialData.ts
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface FinancialData {
  income: number;
  expenditure: { category: string; amount: number }[];
  assets: number;
  liabilities: number;
  goals?: {
    id: string;
    goal: string;
    target_amount: number;
    time_horizon: number;
  }[];
  incomes?: { type: string; amount: number }[]; // Add this line
}

export const useFinancialData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch all data in parallel
      const [
        { data: incomesData, error: incomesError },
        { data: expendituresData, error: expendituresError },
        { data: assetsData, error: assetsError },
        { data: liabilitiesData, error: liabilitiesError },
        { data: goalsData, error: goalsError }
      ] = await Promise.all([
        supabase.from('incomes').select('*').eq('client_id', user.id),
        supabase.from('expenditures').select('*').eq('client_id', user.id),
        supabase.from('assets').select('*').eq('client_id', user.id),
        supabase.from('liabilities').select('*').eq('client_id', user.id),
        supabase.from('goals').select('*').eq('client_id', user.id)
      ]);

      if (incomesError || expendituresError || assetsError || liabilitiesError || goalsError) {
        throw new Error('Error fetching financial data');
      }

      const processedIncomes = (incomesData || [])
      .filter(income => income.amount && Number(income.amount) > 0)
      .reduce((unique: any[], income: any) => {
        const existing = unique.find(item => item.type === income.type);
        if (!existing) {
          unique.push({...income});
        } else {
          // If type already exists, add to the amount
          existing.amount = Number(existing.amount) + Number(income.amount);
        }
        return unique;
      }, []);

      const totalIncome = (incomesData || []).reduce((sum, income) => {
        const amount = Number(income.amount) || 0;
        return sum + (income.frequency === 'Monthly' ? amount * 12 : amount);
      }, 0);

      const expenditures = (expendituresData || []).map(exp => ({
        category: exp.category,
        amount: Number(exp.amount) || 0
      }));

      const filteredAssets = (assetsData || []).filter(asset => asset.value && Number(asset.value) > 0);
      const filteredLiabilities = (liabilitiesData || []).filter(liability => 
        liability.amount && Number(liability.amount) > 0
      );

      const totalAssets = assetsData?.reduce((sum, asset) => sum + (asset.value || 0), 0) || 0;
      const totalLiabilities = liabilitiesData?.reduce((sum, liability) => sum + (liability.amount || 0), 0) || 0;

      setData({
        income: totalIncome,
        expenditure: expenditures,
        assets: totalAssets,
        liabilities: totalLiabilities,
        goals: goalsData || [],
        incomes: processedIncomes 
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    fetchData();
  }, [user]);

  return { data, loading, error, refetch: fetchData };
};