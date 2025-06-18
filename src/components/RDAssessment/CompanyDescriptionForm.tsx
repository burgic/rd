import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CompanyDescriptionForm: React.FC = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim() || !companyDescription.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (companyDescription.length < 50) {
      setError('Please provide a more detailed description (at least 50 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Navigate to results page with the data
      navigate('/rd-assessment', {
        state: {
          companyName: companyName.trim(),
          companyDescription: companyDescription.trim()
        }
      });
    } catch (error: any) {
      console.error('Navigation error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              R&D Tax Credits Assessment
            </h1>
            <p className="text-lg text-gray-600">
              Tell us about your company and we'll assess your eligibility for HMRC R&D tax credits
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your company name"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="companyDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Company Description *
              </label>
              <textarea
                id="companyDescription"
                required
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe your company's activities, products, services, and any research or development work you do. Be as detailed as possible about your innovations, technical challenges, and problem-solving activities..."
                maxLength={2000}
              />
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Minimum 50 characters required</span>
                <span>{companyDescription.length}/2000</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">💡 Tips for a better assessment:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Describe any new products, processes, or services you've developed</li>
                <li>• Mention technical challenges you've overcome</li>
                <li>• Include details about innovations or improvements you've made</li>
                <li>• Describe any research activities or experiments you've conducted</li>
                <li>• Mention collaboration with universities or research institutions</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 rounded-lg text-white font-medium text-lg transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Assess My R&D Eligibility'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>This assessment is for guidance only.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDescriptionForm; 