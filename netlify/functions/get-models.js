const { Anthropic } = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANTHROPIC_MODELS = [
  {
    id: 'claude-3-7-sonnet-20250219',
    display_name: 'Claude 3.7 Sonnet',
    provider: 'anthropic'
  },
  {
    id: 'claude-3-5-haiku-20240620',
    display_name: 'Claude 3.5 Haiku',
    provider: 'anthropic'
  },
  {
    id: 'claude-3-opus-20240229',
    display_name: 'Claude 3 Opus',
    provider: 'anthropic'
  }
];

// Define OpenAI models to include
const OPENAI_MODELS = [
  {
    id: 'gpt-4o',
    display_name: 'GPT-4o',
    provider: 'openai'
  },
  {
    id: 'gpt-4o-mini',
    display_name: 'GPT-4o-mini',
    provider: 'openai'
  },
  {
    id: 'o3-mini-2025-01-31',
    display_name: 'o3-mini',
    provider: 'openai'
  }
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  
  
  try {
    let formattedAnthropicModels = [];
    
    try {
      // Attempt to fetch Anthropic models from API
      const anthropicModelsResponse = await anthropic.models.list({limit: 10});
      
      // Format Anthropic models to include provider
      formattedAnthropicModels = anthropicModelsResponse.data.map(model => ({
        id: model.id,
        display_name: model.name || model.id,
        provider: 'anthropic'
      }));
      
      console.log(`Successfully fetched ${formattedAnthropicModels.length} models from Anthropic API`);
    } catch (apiError) {
      console.error('Error fetching Anthropic models from API:', apiError);
      console.log('Using predefined Anthropic models instead');
      formattedAnthropicModels = ANTHROPIC_MODELS;
    }
    
    // Make sure our predefined models are included (will be merged or deduplicated)
    const predefinedModelIds = new Set(ANTHROPIC_MODELS.map(m => m.id));
    const apiModelIds = new Set(formattedAnthropicModels.map(m => m.id));
    
    // Add any predefined models that weren't in the API response
    const missingModels = ANTHROPIC_MODELS.filter(model => !apiModelIds.has(model.id));
    formattedAnthropicModels = [...formattedAnthropicModels, ...missingModels];
    
    // Combine Anthropic and OpenAI models
    const allModels = [...formattedAnthropicModels, ...OPENAI_MODELS];
    
    console.log(`Returning ${allModels.length} models: ${formattedAnthropicModels.length} from Anthropic and ${OPENAI_MODELS.length} from OpenAI`);
    

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        response: allModels
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}