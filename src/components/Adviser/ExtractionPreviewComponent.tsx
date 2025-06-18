import React, { useState, useEffect } from 'react';
import { ExtractedData } from '../../@types/fileNote';

interface ExtractionPreviewComponentProps {
  extractedData: any;
  summary: string;
  onConfirm: (updatedData: any, updatedSummary: string) => void;
  onCancel: () => void;
}

const ExtractionPreviewComponent: React.FC<ExtractionPreviewComponentProps> = ({
  extractedData,
  summary,
  onConfirm,
  onCancel
}) => {
  const [editedData, setEditedData] = useState<any>(extractedData);
  const [editedSummary, setEditedSummary] = useState<string>(summary);

  // Render function for different data types
  const renderDataField = (key: string, value: any, path: string = '') => {
    // Handle nested objects
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={`${path}${key}`} className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">{key}</h4>
          <div className="pl-4">
            {Object.entries(value).map(([nestedKey, nestedValue]) => 
              renderDataField(nestedKey, nestedValue, `${path}${key}.`)
            )}
          </div>
        </div>
      );
    }

    // Handle primitive values
    return (
        <div key={`${path}${key}`} className="mb-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {key}
          </label>
          <input
            type="text"
            value={value?.toString() || ''}
            onChange={(e) => {
              setEditedData((prev: ExtractedData) => {
                // Create a deep copy of the previous state
                const updatedData = JSON.parse(JSON.stringify(prev));
                
                // Handle nested path
                if (path) {
                  let current = updatedData;
                  const parts: string[] = path.split('.').filter((part: string) => part);
                  
                  // Navigate to the correct nesting level
                  for (let i = 0; i < parts.length; i++) {
                    if (!current[parts[i]]) {
                      current[parts[i]] = {};
                    }
                    current = current[parts[i]];
                  }
                  
                  // Update the value
                  current[key] = e.target.value;
                } else {
                  // Direct property
                  updatedData[key] = e.target.value;
                }
                
                return updatedData;
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Review Extracted Information
          </h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Extracted Data Preview */}
          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-700">
              Extracted Details
            </h3>
            <div className="space-y-4">
              {Object.entries(editedData).map(([key, value]) => 
                renderDataField(key, value)
              )}
            </div>
          </div>

          {/* Summary Section */}
          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-700">
              Client Summary
            </h3>
            <textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Edit client summary..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(editedData, editedSummary)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtractionPreviewComponent;