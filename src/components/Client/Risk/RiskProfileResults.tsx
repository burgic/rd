// Client/Risk/RiskProfile.tsx

import React from 'react';
import { RiskScores } from '../../../utils/riskAssessment';

interface RiskProfileResultsProps {
  riskData: RiskScores;
}

const RiskProfileResults: React.FC<RiskProfileResultsProps> = ({ riskData }) => {
  console.log('RiskProfileResults received data:', riskData);

  if (!riskData) {
    console.log('No risk data provided')
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No risk profile data available</p>
      </div>
    );
  }

  // Validate that all required fields are present
  const isValidRiskData = 
    riskData.knowledgeScore !== undefined &&
    riskData.attitudeScore !== undefined &&
    riskData.capacityScore !== undefined &&
    riskData.timeframeScore !== undefined &&
    riskData.overallScore !== undefined &&
    riskData.riskCategory !== undefined &&
    riskData.capacityForLoss !== undefined;

  if (!isValidRiskData) {
  console.log('Invalid risk data:', riskData);
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Incomplete risk profile data</p>
      </div>
    );
  }


    // Log individual pieces to ensure they exist
    console.log('Risk Category:', riskData.riskCategory);
    console.log('Overall Score:', riskData.overallScore);
    console.log('Capacity for Loss:', riskData.capacityForLoss);
    console.log('Individual Scores:', {
      knowledge: riskData.knowledgeScore,
      attitude: riskData.attitudeScore,
      capacity: riskData.capacityScore,
      timeframe: riskData.timeframeScore
    });
/*
  const scoreData = [
    { name: 'Investment Knowledge', score: riskData.knowledgeScore || 0 },
    { name: 'Risk Attitude', score: riskData.attitudeScore || 0 },
    { name: 'Risk Capacity', score: riskData.capacityScore || 0 },
    { name: 'Time Horizon', score: riskData.timeframeScore || 0 }
  ];

  const allocationData = [
    { name: 'Equities', value: riskData.recommendedAssetAllocation?.equities || 0 },
    { name: 'Bonds', value: riskData.recommendedAssetAllocation?.bonds || 0 },
    { name: 'Cash', value: riskData.recommendedAssetAllocation?.cash || 0 },
    { name: 'Other', value: riskData.recommendedAssetAllocation?.other || 0 }
  ];
*/
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Risk Category</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          riskData.riskCategory.includes('Conservative') ? 'bg-blue-100 text-blue-800' :
          riskData.riskCategory.includes('Moderate') ? 'bg-green-100 text-green-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {riskData.riskCategory}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Overall Score</div>
          <div className="text-2xl font-semibold">{riskData.overallScore.toFixed(1)}/4</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Capacity for Loss</div>
          <div className="text-2xl font-semibold">{riskData.capacityForLoss.category}</div>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { label: 'Knowledge', score: riskData.knowledgeScore },
          { label: 'Attitude', score: riskData.attitudeScore },
          { label: 'Capacity', score: riskData.capacityScore },
          { label: 'Time Horizon', score: riskData.timeframeScore }
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span>{item.label}</span>
              <span>{item.score.toFixed(1)}/4</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${(item.score / 4) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Capacity for Loss Factors</h3>
        <div className="space-y-4">
          {riskData.capacityForLoss.factors.map((factor, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{factor.factor}</span>
                <span>{factor.score}/4</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{factor.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskProfileResults;