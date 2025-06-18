

import React from 'react';
import FinancialForm from './BaseForm';

const AssetsForm: React.FC = () => {
  return (
    <FinancialForm
      formType="assets"
      nextRoute="/client/liabilities"
      stepNumber={3}
      fields={[
        {
          name: 'type',
          type: 'select',
          label: 'Asset Type',
          options: [
            { value: 'Property', label: 'Property' },
            { value: 'Investments', label: 'Investments' },
            { value: 'ISA', label: 'ISA' },
            { value: 'Savings', label: 'Savings' },
            { value: 'Other', label: 'Other' }
          ]
        },
        {
          name: 'description',
          type: 'text',
          label: 'Description'
        },
        {
          name: 'value',
          type: 'number',
          label: 'Value'
        }
      ]}
      defaultEntry={{
        type: '',
        description: '',
        value: 0
      }}
    />
  );
};

export default AssetsForm;