import { supabase } from '../../services/supabaseClient';

interface UserProfile {
  id: string;
  name: string;
  dob: string; // Date of birth
  retirement_age: number;
}

interface FinancialData {
  savings: number;
  income: number;
  expenses: number;
  liabilities: number;
  goals: { name: string; target: number; saved: number }[];
}

async function fetchUserData(userId: string): Promise<{ profile: UserProfile; finances: FinancialData }> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;

  const { data: finances, error: financeError } = await supabase
    .from('financial_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (financeError) throw financeError;

  return { profile, finances };
}

export default fetchUserData;