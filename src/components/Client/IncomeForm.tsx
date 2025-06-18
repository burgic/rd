import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { AuthContext } from '../../context/AuthContext';

interface Income {
  id: string;
  client_id: string;
  type: string;
  amount: string;
  frequency: string;
}

interface User {
  id: string;
}

const IncomeForm: React.FC = () => {
  const navigate = useNavigate();
  const {user} = React.useContext(AuthContext);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  React.useEffect(() => {
    const fetchIncomes = async () => {
      if (!user) {
        console.warn('No user found in AuthContext.');
        setIsLoading(false);
        return;
      }

      try {

        if (!user.id) {
          console.warn('User ID is missing or undefined');
          throw new Error('User ID is required to fetch income data');
        }

        const { data: incomesData, error: incomesError } = await supabase
          .from('incomes')
          .select('*')
          .eq('client_id', user.id);

        if (incomesError) {
          console.error('Supabase error:', incomesError);
          throw new Error(`Failed to fetch incomes: ${incomesError.message}`);
        }

        if (incomesData && incomesData.length > 0) {
          // Filter out empty income entries (ones with no amount)
          const validIncomes = incomesData.filter(income => 
            income.amount !== null && 
            income.amount !== undefined && 
            income.amount.toString() !== '0' &&
            income.amount.toString() !== ''
          );
          
          if (validIncomes.length > 0) {
            const formattedIncomes = validIncomes.map(income => ({
              ...income,
              // Safely convert amount to string, handle null/undefined values
              amount: income.amount != null ? income.amount.toString() : ''
            }));
          setIncomes(formattedIncomes);
        } else {
          console.log('No existing income data, setting defaults');
          // Set default income types if no data exists
          setIncomes([
            { id: '', client_id: user.id, type: 'Salary', amount: '', frequency: 'Monthly' },
            { id: '', client_id: user.id, type: 'Investment', amount: '', frequency: 'Monthly' },
            { id: '', client_id: user.id, type: 'Rental', amount: '', frequency: 'Monthly' },
            { id: '', client_id: user.id, type: 'Business', amount: '', frequency: 'Monthly' },
            { id: '', client_id: user.id, type: 'Other', amount: '', frequency: 'Monthly' }
          ]);
        }
      } else {
        // Set default income types if no data exists
        console.log('No existing income data, setting defaults');
        setIncomes([
          { id: '', client_id: user.id, type: 'Salary', amount: '', frequency: 'Monthly' }
        ]);
      }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching incomes:', errorMessage);
        setError('Failed to load existing income data. You can still continue with empty forms.');
        
        // Still set default incomes even if there was an error
        if (user?.id) {
          setIncomes([
            { id: '', client_id: user.id, type: 'Salary', amount: '', frequency: 'Monthly' }
          ]);
        }
      } finally {
        setIsLoading(false);
    }
  };

    fetchIncomes();
  }, [user]);

  const handleAmountChange = (index: number, value: string) => {
    const newIncomes = [...incomes];
    newIncomes[index].amount = value;
    setIncomes(newIncomes);
  };

  const handleRemoveIncome = (index: number) => {
    // Get the income to be removed
    const incomeToRemove = incomes[index];
    
    // If it has an ID, it's an existing record in the database
    if (incomeToRemove.id) {
      // Delete from database
      supabase
        .from('incomes')
        .delete()
        .eq('id', incomeToRemove.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error deleting income:', error);
            alert('Failed to delete income.');
          }
        });
    }
    
    // Remove from the local state
    const newIncomes = [...incomes];
    newIncomes.splice(index, 1);
    
    // If we've removed all incomes, add one empty income field
    if (newIncomes.length === 0) {
      newIncomes.push({
        id: '',
        client_id: user?.id || '',
        type: 'Salary',
        amount: '',
        frequency: 'Monthly'
      });
    }
    
    setIncomes(newIncomes);
  };

  const handleFrequencyChange = (index: number, value: string) => {
    const newIncomes = [...incomes];
    newIncomes[index].frequency = value;
    setIncomes(newIncomes);
  };

  const handleAddIncome = () => {
    if (!user) {
      console.warn('No user found');
      return;
    }
    
    setIncomes([...incomes, {
      id: '',
      client_id: user.id,
      type: 'Other',
      amount: '',
      frequency: 'Monthly'
    }]);
  };

  const calculateProgress = () => {
    const filledIncomes = incomes.filter(income => income.amount !== '');
    return (filledIncomes.length / incomes.length) * 100;
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('No user found');
      return;
    }

    setIsSaving(true);
    try {
      const validIncomes = incomes.filter(income => income.amount > '');
      
      // Handle existing incomes
      const existingIncomes = validIncomes.filter(income => income.id);
      for (const income of existingIncomes) {
        const { error } = await supabase
          .from('incomes')
          .update({
            type: income.type,
            amount: parseFloat(income.amount) || 0,
            frequency: income.frequency
          })
          .eq('id', income.id);

        if (error) throw error;
      }

      // Handle new incomes
      const newIncomes = validIncomes
        .filter(income => !income.id)
        .map(({ id, ...income }) => ({
          ...income,
      amount: parseFloat(income.amount) || 0,
      client_id: user.id
    })); // Remove empty id field

      if (newIncomes.length > 0) {
        const { error } = await supabase
          .from('incomes')
          .insert(newIncomes);

        if (error) throw error;
      }

      navigate('/client/expenditure');
    } catch (error) {
      console.error('Error saving income:', error);
      alert('Failed to save income data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-md">
        <div className="text-gray-300 text-center">Loading income data...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-md">

    {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-800 text-red-100 rounded">
          {error} 
      </div>
    )}
  
      {/* Progress Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-semibold text-gray-100">Income Details</h1>
          <span className="text-sm text-gray-400">Step 1 of 6</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-400 text-right">
          {Math.round(calculateProgress())}% Complete
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {incomes.map((income, index) => (
          <div key={income.id || index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {income.type} Income
            </label>
            <button
                type="button"
                onClick={() => handleRemoveIncome(index)}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Remove income"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            <div className="space-y-2">
              <input
                type="text"
                value={income.amount}
                placeholder="Amount"
                onChange={(e) => handleAmountChange(index, e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <select
                value={income.frequency}
                onChange={(e) => handleFrequencyChange(index, e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleAddIncome}
          className="px-4 py-2 text-sm font-medium bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500"
        >
          + Add Income Source
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || calculateProgress() === 0}
            className={`px-6 py-2 text-sm font-medium rounded-lg focus:outline-none ${
              isSaving || calculateProgress() === 0
                ? "bg-gray-500 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-gray-100 hover:bg-blue-600"
            }`}
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomeForm;

