// netlify/functions/parse-file-note.js

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_DATABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { noteContent, clientId } = JSON.parse(event.body);

    if (!noteContent || !clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: noteContent or clientId' })
      };
    }

    // Fetch existing client data to provide context
    const [
      { data: profileData, error: profileError },
      { data: incomesData, error: incomesError },
      { data: expendituresData, error: expendituresError },
      { data: assetsData, error: assetsError },
      { data: liabilitiesData, error: liabilitiesError },
      { data: goalsData, error: goalsError }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', clientId).single(),
      supabase.from('incomes').select('*').eq('client_id', clientId),
      supabase.from('expenditures').select('*').eq('client_id', clientId),
      supabase.from('assets').select('*').eq('client_id', clientId),
      supabase.from('liabilities').select('*').eq('client_id', clientId),
      supabase.from('goals').select('*').eq('client_id', clientId)
    ]);

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }

    // Create a context object with existing client data
    const clientContext = {
      profile: profileData || {},
      incomes: incomesData || [],
      expenditures: expendituresData || [],
      assets: assetsData || [],
      liabilities: liabilitiesData || [],
      goals: goalsData || []
    };

    // Define the prompt for GPT-4o-mini
    const systemPrompt = `
      You are a financial adviser's assistant tasked with extracting relevant financial information from meeting notes.
      
      Extract the following information from the file note:
      1. Personal details: age, family, dependents, occupation
      2. Financial goals: short and long-term objectives, retirement plans
      3. Income: salary, bonuses, pension, rental income, etc.
      4. Expenses: major expenditures, fixed costs
      5. Assets: property, investments, savings, etc.
      6. Liabilities: mortgages, loans, credit cards, etc.
      7. Risk profile: attitude to risk, investment preferences
      
      The client's existing data is:
      ${JSON.stringify(clientContext, null, 2)}
      
      Look for any new information or updates to this existing data. Format your response as structured JSON and provide a concise summary paragraph about the client based on all available information (existing + new).
      
      JSON format should include:
      {
        "extractedData": {
          "personalDetails": { ... },
          "financialGoals": { ... },
          "income": { ... },
          "expenses": { ... },
          "assets": { ... },
          "liabilities": { ... },
          "riskProfile": { ... }
        },
        "summary": "Concise paragraph summarizing key client information"
      }
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: noteContent }
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const responseContent = completion.choices[0].message.content;
    const parsedResponse = JSON.parse(responseContent);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        extractedData: parsedResponse.extractedData,
        summary: parsedResponse.summary
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};