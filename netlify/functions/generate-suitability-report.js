const { Anthropic } = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_DATABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
})

const handler = async (event) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { clientId, config } = JSON.parse(event.body || '{}');

    console.log('Received clientId:', clientId); // Log clientId
    console.log('Received config:', config); // Log config

    // Fetch client data from Supabase
    const { data: clientData, error: clientError } = await supabase
      .from('profiles')
      .select(
        `*,
        incomes(*),
        expenditures(*),
        assets(*),
        liabilities(*),
        goals(*),
        kyc_data!fk_profile(*)`
      )
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('Supabase error:', clientError); // Debug log
      throw new Error(`Failed to fetch client data: ${clientError.message}`);
    }

    if (!clientData) {
      throw new Error('No client data found');
    }

    console.log('Client data:', clientData); // Log client data

    // Format the client data for the prompt
    const formattedData = {
      monthlyIncome: clientData.incomes.reduce(
        (sum, inc) =>
          sum + (inc.frequency === 'Monthly' ? inc.amount : inc.amount / 12),
        0
      ) || 0,
      annualIncome: clientData.incomes.reduce(
        (sum, inc) =>
          sum + (inc.frequency === 'Annual' ? inc.amount : inc.amount * 12),
        0
      ) || 0,
      totalAssets: clientData.assets.reduce((sum, asset) => sum + asset.value, 0),
      totalLiabilities: clientData.liabilities.reduce(
        (sum, liability) => sum + liability.amount,
        0
      ) || 0,
      goals: clientData.goals,
      kyc: clientData.kyc_data,
    };

    console.log('Formatted data:', formattedData); // Log formatted data

    // Generate the system prompt
    const systemPrompt = `You are a professional UK financial adviser creating a suitability report. Use the following client data:

Name: ${clientData.name}
Date: ${new Date().toLocaleDateString()}

Monthly Income: £${formattedData.monthlyIncome.toFixed(0)}
Annual Income: £${formattedData.annualIncome.toFixed(0)}
Total Assets: £${formattedData.totalAssets.toFixed(0)}
Total Liabilities: £${formattedData.totalLiabilities.toFixed(0)}

Financial Goals:
${formattedData.goals
  .map((g) => `- ${g.goal}: £${g.target_amount} in ${g.time_horizon} years`)
  .join('\n')}

KYC Information:
Date of Birth: ${formattedData.kyc[0]?.date_of_birth || 'Not provided'}
Address: ${formattedData.kyc[0]?.address_line1 || 'Not provided'}
${formattedData.kyc[0]?.address_line2 ? `${formattedData.kyc[0].address_line2}` : ''}
${formattedData.kyc[0]?.city ? `${formattedData.kyc[0].city}` : ''}
${formattedData.kyc[0]?.postal_code ? `${formattedData.kyc[0].postal_code}` : ''}

Create a detailed suitability report following FCA guidelines. Include:
1. Executive Summary
2. Client Circumstances
3. Objectives and Needs
4. Analysis and Research
5. Recommendations
6. Risks and Considerations
7. Costs and Charges
8. Next Steps

Use ## to denote section headers.

${config.customPrompt ? `\nAdditional Instructions:\n${config.customPrompt}` : ''}`;

    console.log('System prompt:', systemPrompt); // Log system prompt

    let report;

    // Call appropriate API based on provider
    if (config.provider === 'anthropic') {
      const message = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [{ role: 'user', content: systemPrompt }],
      });
      report = message.content[0].text;
    } else if (config.provider === 'openai') {
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: 'You are a professional UK financial adviser.' },
          { role: 'user', content: systemPrompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      });
      report = completion.choices[0].message.content;
    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        report,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};

exports.handler = handler;
