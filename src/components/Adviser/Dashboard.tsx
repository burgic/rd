// src/components/Adviser/Dashboard

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
// import { Bar } from 'react-chartjs-2';
import { Clock, Users, ArrowUpRight } from 'lucide-react';
import { RiskScores } from 'utils/riskAssessment';

interface Client {
  id: string;
  name: string;
  email: string;
  created_at: string;
  workflow_progress: number;
  riskProfile?: RiskScores | null;
}


const AdviserDashboard = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('Fetching clients for adviser:', user.id);

      const { data: adviserProfile, error: adviserError } = await supabase
      .from('profiles')
      .select('*')
      .eq('adviser_id', user.id)
      .eq('role', 'client');

    if (adviserError) {
      console.error('Error fetching adviser profile:', adviserError);
      return;
    }

    console.log('Adviser profile:', adviserProfile);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          created_at,
          risk_assessments (
        calculated_scores,
        created_at
      )
        `)
        .eq('adviser_id', user.id)
        .eq('role', 'client');

        console.log('Client query result:', { data, error });

        if (error) {
          console.error('Error fetching clients:', error);
          setLoading(false);
          return;
        }

      // Calculate workflow progress for each client
      const clientsWithProgress = await Promise.all(data.map(async (client) => {
        const tables = ['incomes', 'expenditures', 'assets', 'liabilities', 'goals', 'risk_assessments'];
        let completedSteps = 0;

        for (const table of tables) {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          if (count && count > 0) completedSteps++;
        }

        const riskProfile = client.risk_assessments?.[0]?.calculated_scores || null;

        return {
          ...client,
          workflow_progress: (completedSteps / tables.length) * 100, 
          risk_assessments: riskProfile
        };
      }));

      console.log('Processed clients:', clientsWithProgress);
      setClients(clientsWithProgress);
      setLoading(false);
    };

    fetchClients();
  }, []);

  const formatLastActivity = (date: string) => {
    const activityDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return activityDate.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Adviser Dashboard</h1>
            <button
              onClick={() => navigate('/adviser/create-client')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add New Client
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading client data...</p>
          </div>
        ) : (
          <div className="space-y-6">
           
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Clients</p>
                    <p className="text-2xl font-semibold">{clients.length}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Your Clients</h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Workflow Progress
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Review
                        </th>
                        <th colSpan={2} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clients.map((client) => (
                        <tr 
                          key={client.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/adviser/client/${client.id}`)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{client.name}</div>
                                <div className="text-sm text-gray-500">{client.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div 
                                className="bg-blue-600 h-2.5 rounded-full" 
                                style={{ width: `${client.workflow_progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {Math.round(client.workflow_progress)}% Complete
                            </span>
                          </td>
                          
                          <td className="px-4 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/adviser/client/${client.id}`);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </button>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <button
                              // onClick={(e) => {
                              //   e.stopPropagation();
                              //   navigate(`/adviser/client/${client.id}/insights`);
                              // }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Holding Text
                            </button>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/adviser/client/${client.id}/insights`);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Insights
                            </button>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                navigate(`/adviser/client/${client.id}/suitability-report`);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Generate Suitability Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdviserDashboard;


