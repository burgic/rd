
"use strict";
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Helper function to generate the system prompt
const generateSystemPrompt = (clientData, isSuitabilityReport) => {
    // Calculate key financial metrics
    const monthlyIncome = clientData.incomes.reduce((sum, inc) => sum + (inc.frequency === 'Monthly' ? inc.amount : inc.amount / 12), 0);
    const annualIncome = monthlyIncome * 12;
    const monthlyExpenditure = clientData.expenditures.reduce((sum, exp) => sum + (exp.frequency === 'Monthly' ? exp.amount : exp.amount / 12), 0);
    const annualExpenditure = monthlyExpenditure * 12;
    const totalAssets = clientData.assets.reduce((sum, asset) => sum + asset.value, 0);
    const totalLiabilities = clientData.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
    const netWorth = totalAssets - totalLiabilities;

    // KYC information
    const kycInfo = clientData.kyc_data ? `
    Date of Birth: ${clientData.kyc_data.date_of_birth}
    Address: ${clientData.kyc_data.address_line1}, ${clientData.kyc_data.city}
    National Insurance Number: ${clientData.kyc_data.national_insurance_number}
  ` : 'KYC data not available';

    const basePrompt = `You are a professional financial adviser in the UK analysing client data. Use the following information to ${isSuitabilityReport ? 'generate a detailed suitability report' : 'provide advice'}:

FINANCIAL SUMMARY
================
Monthly Income: £${monthlyIncome.toFixed(2)}
Annual Income: £${annualIncome.toFixed(2)}
Monthly Expenditure: £${monthlyExpenditure.toFixed(2)}
Annual Expenditure: £${annualExpenditure.toFixed(2)}
Total Assets: £${totalAssets.toFixed(2)}
Total Liabilities: £${totalLiabilities.toFixed(2)}
Net Worth: £${netWorth.toFixed(2)}

KYC INFORMATION
==============
${kycInfo}

INCOME SOURCES
=============
${clientData.incomes.map(inc => `- ${inc.type}: £${inc.amount} (${inc.frequency})`).join('\n')}

EXPENDITURES
===========
${clientData.expenditures.map(exp => `- ${exp.category}: £${exp.amount} (${exp.frequency})`).join('\n')}

ASSETS
======
${clientData.assets.map(asset => `- ${asset.type}: £${asset.value} - ${asset.description}`).join('\n')}

LIABILITIES
==========
${clientData.liabilities.map(liability => `- ${liability.type}: £${liability.amount} at ${liability.interest_rate}% interest`).join('\n')}

FINANCIAL GOALS
=============
${clientData.goals.map(goal => `- ${goal.goal}: Target £${goal.target_amount} in ${goal.time_horizon} years`).join('\n')}`;

    return isSuitabilityReport ?
        `${basePrompt}

As a UK financial adviser, generate a detailed suitability report following these guidelines:
1. Start with a clear executive summary
2. Explain your understanding of the client's circumstances and objectives
3. Detail your analysis of their current financial position
4. Outline specific recommendations with clear rationale
5. Explain any risks and disadvantages
6. Include relevant regulatory disclosures
7. Use professional but clear language
8. Structure the report with clear headings
9. Reference specific financial details from their data
10. Comply with FCA guidelines for suitability reports

Format the report professionally with clear sections and maintain a formal tone.` :
        `${basePrompt}\n\nProvide detailed advice considering...`;
};

// Main handler function
exports.handler = async (event) => {
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
        const {
            message,
            clientData,
            messageHistory = [],
        } = JSON.parse(event.body);

        // First, try to get a quick initial response
        const quickCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: "You are a financial advisor. Respond with a brief acknowledgment." 
                },
                { role: "user", content: message }
            ],
            max_tokens: 25,
            temperature: 0.3
        });

        // Start the full analysis in the background
        const systemPrompt = generateSystemPrompt(clientData);
        const fullCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...messageHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: "user", content: message }
            ],
            temperature: 0.3,
            max_tokens: 1000,
            stream: false // Disable streaming for now
        });

        // Return both responses
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                type: 'success',
                quickResponse: quickCompletion.choices[0]?.message?.content || "Analyzing your request...",
                fullResponse: fullCompletion.choices[0]?.message?.content
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                type: 'error',
                error: error.message
            })
        };
    }
};

/*

"use strict";
// netlify/functions/adviserChat.js
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
exports.handler = async (event) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    // Handle preflight
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
        // Add some debug logging
        console.log('Function called');
        console.log('Event:', event);
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
        }
        try {
            const { message, clientData, messageHistory = [], isSuitabilityReport, userId, clientId } = JSON.parse(event.body);
            console.log('Received data:', { message, clientData, isSuitabilityReport });
            console.log('Received clientId:', clientId); // Log clientId
            console.log('Received config:', config); // Log config
            // For initial testing, just echo back the message
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    response: `Test response: Received message "${message}" for client ${clientId}`
                })
            };
        }
        catch (error) {
            console.error('Error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message })
            };
        }
    }
    catch (error) {
        console.error('Error', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
const generateSystemPrompt = (clientData, isSuitabilityReport) => {
    // Calculate key financial metrics
    const monthlyIncome = clientData.incomes.reduce((sum, inc) => sum + (inc.frequency === 'Monthly' ? inc.amount : inc.amount / 12), 0);
    const annualIncome = monthlyIncome * 12;
    const monthlyExpenditure = clientData.expenditures.reduce((sum, exp) => sum + (exp.frequency === 'Monthly' ? exp.amount : exp.amount / 12), 0);
    const annualExpenditure = monthlyExpenditure * 12;
    const totalAssets = clientData.assets.reduce((sum, asset) => sum + asset.value, 0);
    const totalLiabilities = clientData.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
    const netWorth = totalAssets - totalLiabilities;
    // KYC information
    const kycInfo = clientData.kyc_data ? `
    Date of Birth: ${clientData.kyc_data.date_of_birth}
    Address: ${clientData.kyc_data.address_line1}, ${clientData.kyc_data.city}
    National Insurance Number: ${clientData.kyc_data.national_insurance_number}
  ` : 'KYC data not available';
    const basePrompt = `You are a professional financial adviser in the UK analysing client data. Use the following information to ${isSuitabilityReport ? 'generate a detailed suitability report' : 'provide advice'}:

FINANCIAL SUMMARY
================
Monthly Income: £${monthlyIncome.toFixed(2)}
Annual Income: £${annualIncome.toFixed(2)}
Monthly Expenditure: £${monthlyExpenditure.toFixed(2)}
Annual Expenditure: £${annualExpenditure.toFixed(2)}
Total Assets: £${totalAssets.toFixed(2)}
Total Liabilities: £${totalLiabilities.toFixed(2)}
Net Worth: £${netWorth.toFixed(2)}

KYC INFORMATION
==============
${kycInfo}

INCOME SOURCES
=============
${clientData.incomes.map(inc => `- ${inc.type}: £${inc.amount} (${inc.frequency})`).join('\n')}

EXPENDITURES
===========
${clientData.expenditures.map(exp => `- ${exp.category}: £${exp.amount} (${exp.frequency})`).join('\n')}

ASSETS
======
${clientData.assets.map(asset => `- ${asset.type}: £${asset.value} - ${asset.description}`).join('\n')}

LIABILITIES
==========
${clientData.liabilities.map(liability => `- ${liability.type}: £${liability.amount} at ${liability.interest_rate}% interest`).join('\n')}

FINANCIAL GOALS
=============
${clientData.goals.map(goal => `- ${goal.goal}: Target £${goal.target_amount} in ${goal.time_horizon} years`).join('\n')}`;
    if (isSuitabilityReport) {
        return `${basePrompt}

As a UK financial adviser, generate a detailed suitability report following these guidelines:
1. Start with a clear executive summary
2. Explain your understanding of the client's circumstances and objectives
3. Detail your analysis of their current financial position
4. Outline specific recommendations with clear rationale
5. Explain any risks and disadvantages
6. Include relevant regulatory disclosures
7. Use professional but clear language
8. Structure the report with clear headings
9. Reference specific financial details from their data
10. Comply with FCA guidelines for suitability reports

Format the report professionally with clear sections and maintain a formal tone.`;
    }
    return isSuitabilityReport ?
        `${basePrompt}

      Provide detailed advice considering:
      1. The client's specific financial situation
      2. Their stated goals and objectives
      3. Risk management
      4. Tax efficiency
      5. Long-term sustainability
      6. Regulatory compliance

      Use the data to give specific, actionable recommendations.` :
        `${basePrompt}\n\nProvide detailed advice considering...`;
};
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
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    try {
        const { message, clientData, messageHistory = [], isSuitabilityReport, userId, clientId } = JSON.parse(event.body);
        // Add dropdown's to enable selection of model, temperatures, max_tokens
        // pull from chat gpt
        // Add Claude as an option later
        // Temperature dictates randomness and specificity
        // 0 > 1 
        // Max tokens dictates the processing power allocated to the query
        // 100 - 100000
        const systemPrompt = generateSystemPrompt(clientData, isSuitabilityReport);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...messageHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: "user", content: message }
            ],
            temperature: isSuitabilityReport ? 0.3 : 0.7,
            max_tokens: isSuitabilityReport ? 2000 : 500
        });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                response: completion.choices[0].message.content
            })
        };
    }
    catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

*/