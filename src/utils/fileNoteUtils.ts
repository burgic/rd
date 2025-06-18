// src/utils/fileNoteUtils.ts
import { supabase } from '../services/supabaseClient';
import { ExtractedData } from '../@types/fileNote';

export const updateClientDetails = async (clientId: string, extractedData: ExtractedData) => {
  try {
    // Prepare batch updates for different tables
    const updates: Promise<any>[] = [];

    // Update personal details
    if (extractedData.personalDetails) {
      updates.push(
        Promise.resolve(
          supabase
            .from('kyc_data')
            .upsert({
              profile_id: clientId,
              ...extractedData.personalDetails
            })
        )
      );
    }

    // Update income
    if (extractedData.income) {
      const incomeEntries = Object.entries(extractedData.income).map(([type, amount]) => ({
        client_id: clientId,
        type,
        amount,
        frequency: 'Monthly' // Default, can be made more dynamic
      }));

      updates.push(
        Promise.resolve(
          supabase
            .from('incomes')
            .upsert(incomeEntries)
        )
      );
    }

    // Update expenses
    if (extractedData.expenses) {
      const expenditureEntries = Object.entries(extractedData.expenses).map(([category, amount]) => ({
        client_id: clientId,
        category,
        amount,
        frequency: 'Monthly' // Default, can be made more dynamic
      }));

      updates.push(
        Promise.resolve(
          supabase
            .from('expenditures')
            .upsert(expenditureEntries)
        )
      );
    }

    // Update assets
    if (extractedData.assets) {
      const assetEntries = Object.entries(extractedData.assets).map(([type, details]) => ({
        client_id: clientId,
        type,
        value: details.value,
        description: details.description || ''
      }));

      updates.push(
        Promise.resolve(
          supabase
            .from('assets')
            .upsert(assetEntries)
        )
      );
    }

    // Update liabilities
    if (extractedData.liabilities) {
      const liabilityEntries = Object.entries(extractedData.liabilities).map(([type, details]) => ({
        client_id: clientId,
        type,
        amount: details.amount,
        description: details.description || '',
        interest_rate: details.interest_rate
      }));

      updates.push(
        Promise.resolve(
          supabase
            .from('liabilities')
            .upsert(liabilityEntries)
        )
      );
    }

    // Update goals
    if (extractedData.financialGoals) {
      const goalEntries = Object.entries(extractedData.financialGoals).map(([goal, details]) => ({
        client_id: clientId,
        goal,
        target_amount: details.target_amount,
        time_horizon: details.time_horizon
      }));

      updates.push(
        Promise.resolve(
          supabase
            .from('goals')
            .upsert(goalEntries)
        )
      );
    }

    // Execute all updates
    const results = await Promise.all(updates);

    // Check for any errors
    const hasErrors = results.some(result => result.error);
    
    if (hasErrors) {
      console.error('Partial update errors:', results);
      return { 
        success: false, 
        message: 'Some updates failed' 
      };
    }

    return { 
      success: true, 
      message: 'Client details updated successfully' 
    };

  } catch (error) {
    console.error('Error updating client details:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};