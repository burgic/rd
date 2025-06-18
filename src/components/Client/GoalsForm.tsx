// src/components/Client/GoalsForm.tsx

import React, { useState } from 'react';
import FinancialForm from './BaseForm';

const GoalsForm: React.FC = () => {
  return (
    <FinancialForm
      formType="goals"
      nextRoute="/client/risk-assessment"
      stepNumber={4}
      fields={[
        {
          name: 'goal',
          type: 'select',
          label: 'Goal Type',
          options: [
            { value: 'Retirement', label: 'Retirement' },
            { value: 'House Purchase', label: 'House Purchase' },
            { value: 'Education', label: 'Education' },
            { value: 'Investment', label: 'Investment' },
            { value: 'Emergency Fund', label: 'Emergency Fund' },
            { value: 'Debt Repayment', label: 'Debt Repayment' },
            { value: 'Other', label: 'Other' }
          ]
        },
        {
          name: 'target_amount',
          type: 'number',
          label: 'Target Amount (£)'
        },
        {
          name: 'time_horizon',
          type: 'number',
          label: 'Time Horizon (Years)'
        }
      ]}
      defaultEntry={{
        goal: '',
        target_amount: '',
        time_horizon: ''
      }}
    />
  );
};

export default GoalsForm;