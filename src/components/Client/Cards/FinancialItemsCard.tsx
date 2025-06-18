// src/components/Client/Cards/FinancialItemCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FinancialItemCardProps {
  id: string;
  title: string;
  amount: number;
  subtitle?: string;
  editUrl: string;
}

const FinancialItemCard: React.FC<FinancialItemCardProps> = ({ 
  title, 
  amount, 
  subtitle, 
  editUrl 
}) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(editUrl)}
      className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <p className="text-lg font-semibold">{amount.toLocaleString('en-GB', {
          style: 'currency',
          currency: 'GBP'
        })}</p>
      </div>
    </div>
  );
};

export default FinancialItemCard;