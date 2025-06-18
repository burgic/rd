// src/components/Common/Documents/DocumentDetails.tsx
import React from 'react';
import { ClientDocument } from '../../../@types/documents';
import { Transaction } from '../../../@types/transactions';

interface DocumentDetailsProps {
  document: ClientDocument;
  onApplyData: (id: string) => void;
}

const DocumentDetails: React.FC<DocumentDetailsProps> = ({ document, onApplyData }) => {
  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Document Analysis</h2>
      
      <div className="flex items-center gap-2 mb-4">
        <span className="font-medium">Document:</span>
        <span className="text-gray-700">{document.file_name}</span>
        <span className="inline-flex items-center px-2 py-0.5 ml-2 rounded text-xs font-medium bg-green-100 text-green-800">
          {document.document_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Processed'}
        </span>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold mb-3">Extracted Information</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Basic Information */}
          <div className="space-y-4">
          {(document.extracted_data?.addresses?.length ?? 0) > 0 && (
            <div>
                <h4 className="font-medium text-gray-700 mb-2">Addresses</h4>
                <ul className="list-disc pl-5 space-y-1">
                {(document.extracted_data?.addresses ?? []).map((addr: string, idx: number) => (
                    <li key={idx} className="text-gray-600">{addr}</li>
                ))}
                </ul>
            </div>
            )}

            {(document.extracted_data?.postcodes?.length ?? 0) > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Postcodes</h4>
                <div className="flex flex-wrap gap-2">
                  {(document.extracted_data?.postcodes ?? []).map((postcode: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">{postcode}</span>
                  ))}
                </div>
              </div>
            )}

            {(document.extracted_data?.phoneNumbers?.length ?? 0) > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Phone Numbers</h4>
                <div className="flex flex-wrap gap-2">
                  {document.extracted_data?.phoneNumbers?.map((phone: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">{phone}</span>
                  )) ?? []}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column: Financial Information */}
          <div className="space-y-4">
            {(document.extracted_data?.emails?.length ?? 0) > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Email Addresses</h4>
                <div className="flex flex-wrap gap-2">
                  {document.extracted_data?.emails?.map((email: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">{email}</span>
                  )) ?? []}
                </div>
              </div>
            )}

            {(document.extracted_data?.monetaryValues?.length ?? 0) > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Monetary Values</h4>
                <div className="flex flex-wrap gap-2">
                  {document.extracted_data?.monetaryValues?.map((value: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">{value}</span>
                  )) ?? []}
                </div>
              </div>
            )}

            {/* Bank Statement Specific Data */}
            {document.document_type === 'bank_statement' && document.extracted_data?.accountNumber && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Bank Account Details</h4>
                <div className="space-y-1">
                  {document.extracted_data?.accountNumber && (
                    <p className="text-sm">Account Number: <span className="font-medium">{document.extracted_data?.accountNumber}</span></p>
                  )}
                  {document.extracted_data?.sortCode && (
                    <p className="text-sm">Sort Code: <span className="font-medium">{document.extracted_data?.sortCode}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Investment Details */}
            {document.document_type === 'investment_statement' && document.extracted_data?.portfolioValue && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Investment Details</h4>
                <p className="text-sm mb-1">Portfolio Value: <span className="font-medium">£{document.extracted_data?.portfolioValue}</span></p>
              </div>
            )}
          </div>
        </div>
        
        {/* Transactions Table (for Bank Statements) */}
        {document.document_type === 'bank_statement' &&
         document.extracted_data?.transactions &&
         document.extracted_data?.transactions.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-2">Transactions</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {document.extracted_data?.transactions.slice(0, 10).map((transaction: Transaction, idx: number) => (
                    <tr key={idx} className={transaction.type === 'credit' ? 'text-green-700' : 'text-red-700'}>
                      <td className="px-4 py-2 text-sm">{transaction.date}</td>
                      <td className="px-4 py-2 text-sm">{transaction.description}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        {transaction.amount < 0 ? '-' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm capitalize">{transaction.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {document.extracted_data?.transactions.length > 10 && (
                <p className="text-right text-sm text-gray-500 mt-2">
                  Showing 10 of {document.extracted_data?.transactions.length} transactions
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onApplyData(document.id)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Apply Data to Client Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetails;
