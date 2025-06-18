// src/components/Adviser/ExportClientData.tsx
import React from 'react';
import { supabase } from '../../services/supabaseClient';
import { useParams } from 'react-router-dom';
import { Parser } from 'json2csv';

const ExportClientData: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  const handleExport = async () => {
    const [
      { data: incomes, error: incomesError },
      { data: expenditures, error: expendituresError },
      { data: assets, error: assetsError },
      { data: liabilities, error: liabilitiesError },
      { data: goals, error: goalsError },
    ] = await Promise.all([
      supabase.from('incomes').select('*').eq('client_id', clientId),
      supabase.from('expenditures').select('*').eq('client_id', clientId),
      supabase.from('assets').select('*').eq('client_id', clientId),
      supabase.from('liabilities').select('*').eq('client_id', clientId),
      supabase.from('goals').select('*').eq('client_id', clientId),
    ]);

    if (incomesError || expendituresError || assetsError || liabilitiesError || goalsError) {
      console.error('Error fetching data:', { incomesError, expendituresError, assetsError, liabilitiesError, goalsError });
      alert('Error fetching data.');
      return;
    }

    const allDataArray = [
      ...(incomes || []).map((item) => ({
        dataType: 'Income',
        ...item,
      })),
      ...(expenditures || []).map((item) => ({
        dataType: 'Expenditure',
        ...item,
      })),
      ...(assets || []).map((item) => ({
        dataType: 'Asset',
        ...item,
      })),
      ...(liabilities || []).map((item) => ({
        dataType: 'Liability',
        ...item,
      })),
      ...(goals || []).map((item) => ({
        dataType: 'Goal',
        ...item,
      })),
    ];

    const parser = new Parser();
    const csv = parser.parse(allDataArray);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `client_${clientId}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return <button onClick={handleExport}>Export Data</button>;
};

export default ExportClientData;
