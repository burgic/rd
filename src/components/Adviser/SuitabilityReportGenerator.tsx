import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import ReportViewer from './ReportViewer';

interface ModelOption {
  id: string;
  display_name: string;
  provider: string;
}

const SuitabilityReportGenerator: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [config, setConfig] = useState({
      model: 'gpt-4o-mini',
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 2000,
      customPrompt: ''
  });

  // Collect and set the language model options from providers
  const getModels = async () => {
    const response = await fetch('/.netlify/functions/get-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  
    if (!response.ok) {
      throw new Error('Failed to fetch language models');
    } 

    return JSON.parse(await response.text()).response;
  }

  React.useEffect(() => {
    const fetchModels = async () => {
      if (!modelOptions.length) {
        const languageModels = await getModels();
        setModelOptions(languageModels);
      }
    };
    
    fetchModels();
  }, [modelOptions]);

  // Model change handler to update provider
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedModel = modelOptions.find(model => model.id === e.target.value);
    setConfig({ 
      ...config, 
      model: e.target.value,
      provider: selectedModel?.provider || 'anthropic'
    });
  };


  const modelOptionsForSelector = modelOptions.map((model) => (
    <option key={model.id} value={model.id}>
      {model.display_name}
    </option>
  ));

  const generateReport = async () => {
    setIsLoading(true);
    setError('');
    
    try {
        console.log('Sending request with clientId:', clientId); // Log clientId
        console.log('Sending request with config:', config); // Log config
        
      const response = await fetch('/.netlify/functions/generate-suitability-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, config })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportContent(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      const viewer = document.getElementById("reportViewer")
      setTimeout(function () {
        viewer?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
      }, 100);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-6">Generate Suitability Report</h2>

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            value={config.model}
            onChange={handleModelChange}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {modelOptionsForSelector}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Provider: {config.provider}
          </p>
        </div>

        {/* Temperature Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperature: {config.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature}
            onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="mt-1 text-sm text-gray-500">
            Lower values produce more focused and deterministic outputs
          </p>
        </div>

        {/* Max Tokens */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            value={config.maxTokens}
            onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
            min="1000"
            max="4096"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Custom Prompt */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Instructions (Optional)
          </label>
          <textarea
            value={config.customPrompt}
            onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
            placeholder="Add any specific instructions or requirements for the report..."
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-lg text-white font-medium ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Generating...' : 'Generate Report'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}
        
        <div id="reportViewer">
          {reportContent && (
            <div className="mt-6">
              <ReportViewer 
                content={reportContent}
                onDownload={() => {
                  // Handle PDF download here
                  console.log('Download PDF');
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuitabilityReportGenerator;