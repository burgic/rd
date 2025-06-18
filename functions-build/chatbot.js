/*

///

"use strict";
// netlify/functions/chatbot.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const openai_1 = __importDefault(require("openai"));
const supabase_js_1 = require("@supabase/supabase-js");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
const supabase = (0, supabase_js_1.createClient)(process.env.REACT_APP_SUPABASE_DATABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);
const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    try {
        const { userId, message } = JSON.parse(event.body || '{}');
        console.log('Parsed userId:', userId);
        console.log('Parsed message:', message);
        if (!userId || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing userId or message' })
            };
        }
        // Fetch user's profile and financial data
        const [profileResult, goalsResult, incomesResult, expendituresResult, assetsResult, liabilitiesResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('goals').select('*').eq('client_id', userId),
            supabase.from('incomes').select('*').eq('client_id', userId),
            supabase.from('expenditures').select('*').eq('client_id', userId),
            supabase.from('assets').select('*').eq('client_id', userId),
            supabase.from('liabilities').select('*').eq('client_id', userId)
        ]);
        if (profileResult.error) {
            throw new Error(`Error fetching profile: ${profileResult.error.message}`);
        }
        const userProfile = profileResult.data;
        // Convert null to empty arrays
        const financialData = {
            goals: goalsResult.data || [],
            incomes: incomesResult.data || [],
            expenditures: expendituresResult.data || [],
            assets: assetsResult.data || [],
            liabilities: liabilitiesResult.data || []
        };
        // Calculate financial metrics
        const totalIncome = financialData.incomes.reduce((sum, income) => sum + Number(income.amount), 0);
        const totalExpenses = financialData.expenditures.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const totalAssets = financialData.assets.reduce((sum, asset) => sum + Number(asset.value), 0);
        const totalLiabilities = financialData.liabilities.reduce((sum, liability) => sum + Number(liability.amount), 0);
        const netWorth = totalAssets - totalLiabilities;
        // Create context for the AI based on user's financial data
        const userContext = `
      User Profile: ${JSON.stringify(userProfile)}
      Financial Overview:
      - Goals: ${financialData.goals.length} financial goals set
      - Total Monthly Income: £${totalIncome}
      - Total Monthly Expenses: £${totalExpenses}
      - Net Worth: £${netWorth}
      - Total Assets: £${totalAssets}
      - Total Liabilities: £${totalLiabilities}

      Detailed Goals:
      ${financialData.goals.map(goal => `- ${goal.goal}: £${goal.target_amount} in ${goal.time_horizon} years`).join('\n')}
    `;
        // Generate chat response
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a financial advisor assistant. Your role is to provide helpful financial guidance based on the user's current financial situation. Here's the context about the user:\n${userContext}`
                },
                { role: 'user', content: message }
            ]
        });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                response: completion.choices[0].message.content,
                userProfile,
                financialData,
                metrics: {
                    totalIncome,
                    totalExpenses,
                    totalAssets,
                    totalLiabilities,
                    netWorth
                }
            })
        };
    }
    catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
exports.handler = handler;

*/

///
/*
// netlify/functions/chat.ts

import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Ensure the handler function is correctly exported and contains all your logic
export const handler: Handler = async (event) => {
  console.log('Function triggered', {
    method: event.httpMethod,
    body: event.body,
    headers: event.headers,
  });

  let message: string | undefined;
  let userId: string | undefined;

  try {
    const body = JSON.parse(event.body || '{}');
    message = body.message;
    userId = body.userId;

    if (!message) {
        console.error('No message provided in the request body.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }
    if (!userId) {
        console.error('No userId provided in the request body.');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'User ID is required' }),
        };
      }

    const { data: profileData, error: profileError } = await supabase
       .from('profiles')
       .select('*')
       .eq('id', userId)
       .single();


       if (profileError || !profileData) {
        console.error('Error fetching user data from Supabase:', profileError);
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found in profiles table' }),
        };
      }
  
      // Fetch additional data if needed, e.g., goals, incomes
      // Example:
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('client_id', userId);
  
      if (goalsError) {
        console.error('Error fetching goals data from Supabase:', goalsError);
        // Optional: Return partial data or handle gracefully
      }
  

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful financial advisor assistant.' },
        { role: 'user', content: message },
      ],
    });

    console.log('OpenAI API response:', completion);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Consider setting this to your domain for security
      },
      body: JSON.stringify({
        response: completion.choices[0].message?.content,
        userProfile: profileData, // Include fetched profile data if needed
        userGoals: goals || [],
      }),
    };
  } catch (error: any) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }

};

*/ 
