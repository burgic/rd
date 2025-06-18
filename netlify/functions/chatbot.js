// netlify/functions/chatbot.js

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const calculateMonthlyIncome = (incomes) => {
    return incomes.reduce((sum, inc) => {
      const amount = parseFloat(inc.amount) || 0;
      // Convert annual income to monthly
      return sum + (inc.frequency.toLowerCase() === 'annual' ? amount / 12 : amount);
    }, 0);
  };
  
  const calculateAnnualIncome = (incomes) => {
    return incomes.reduce((sum, inc) => {
      const amount = parseFloat(inc.amount) || 0;
      // Convert monthly income to annual
      return sum + (inc.frequency.toLowerCase() === 'monthly' ? amount * 12 : amount);
    }, 0);
  };

  const calculateMonthlyExpenditure = (expenditures) => {
    return expenditures.reduce((sum, exp) => {
        const amount = parseFloat(exp.amount) || 0;
        return sum + (exp.frequency.toLowerCase() === 'annual'? amount / 12 : amount);
    }, 0)
  }

  const calculateAnnualExpenditure = (expenditures) => {
    return expenditures.reduce((sum, exp) => {
        const amount = parseFloat(exp.amount) || 0;
        return sum + (exp.frequency.toLowerCase() === 'monthly'? amount * 12 : amount);
    }, 0)
  }


  const systemMessage = (financialData) => { 

        const monthlyIncome = calculateMonthlyIncome(financialData.incomes);
        const annualIncome = calculateAnnualIncome(financialData.incomes);
        const monthlyExpenditure = calculateMonthlyExpenditure(financialData.expenditures);
        const annualExpenditure = calculateAnnualExpenditure(financialData.expenditures);
        const totalExpenditure = financialData.expenditures.reduce((sum, exp) => sum + exp.amount, 0);
        const totalAssets = financialData.assets.reduce((sum, asset) => sum + asset.value, 0);
        const totalLiabilities = financialData.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
        const netWorth = totalAssets - totalLiabilities;

        let age = null;
        let yearsUntilRetirement = null;
        let retirementAge = null;

        // Get KYC data if available
        if (financialData.kyc_data && financialData.kyc_data.date_of_birth) {
          const today = new Date();
          const birth = new Date(financialData.kyc_data.date_of_birth);
          
          // Calculate age
          let currentAge = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
              currentAge--;
          }
          age = currentAge;

          // Get retirement goals if available
          const retirementGoal = financialData.goals.find(goal => 
              goal.goal.toLowerCase().includes('retirement'));
          
          if (retirementGoal) {
              retirementAge = age + retirementGoal.time_horizon;
              yearsUntilRetirement = retirementGoal.time_horizon;
          }
      }
    
        return `You are a financial advisor assistant in the UK with access to the user's current financial data. 
        Base your advice on their actual financial situation as shown below:

        PERSONAL INFORMATION
        ===================
        ${age ? `Current Age: ${age} years old` : 'Age: Not provided'}
        ${retirementAge ? `Target Retirement Age: ${retirementAge}` : ''}
        ${yearsUntilRetirement ? `Years until retirement: ${yearsUntilRetirement}` : ''}

        FINANCIAL OVERVIEW
        =================
        Monthly Income: £${monthlyIncome.toFixed(2)}
        Annual Income: £${annualIncome.toFixed(2)}
        Monthly Expenses: £${monthlyExpenditure.toFixed(2)}
        Annual Expenses: £${annualExpenditure.toFixed(2)}
        Monthly Cash Flow: £${(annualIncome - totalExpenditure).toFixed(2)}
        Total Assets: £${totalAssets.toFixed(2)}
        Total Liabilities: £${totalLiabilities.toFixed(2)}
        Net Worth: £${netWorth.toFixed(2)}

        DETAILED BREAKDOWN
        =================
        Income Sources:
        ${financialData.incomes.map((inc) => `- ${inc.type}: £${inc.amount} (${inc.frequency})`).join('\n') || 'No income data available'}

        Expense Sources:
        ${financialData.expenditures.map((exp) => `- ${exp.category}: £${exp.amount}`).join('\n') || 'No expense data available'}

        Assets:
        ${financialData.assets.map((asset) => `- ${asset.type}: £${asset.value} - ${asset.description}`).join('\n') || 'No asset data available'}

        Liabilities:
        ${financialData.liabilities.map((liability) => `- ${liability.type}: £${liability.amount} at ${liability.interest_rate || 0}% interest`).join('\n') || 'No liability data available'}

        Financial Goals:
        ${financialData.goals.map((goal) => `- ${goal.goal}: Target £${goal.target_amount} in ${goal.time_horizon} years`).join('\n') || 'No goals set'}
       
        
        Please use this data to answer the user's question in detail, considering their:
        1. Income
        2. Expenses
        3. Assets
        4. Liabilities
        5. Financial Goals

        When responding:
        1. Always reference specific numbers from their data
        2. Make recommendations based on their actual income, expenses, and goals
        3. Provide specific, actionable advice
        4. Explain how their current finances align with their goals
        5. Consider their income, expenses, assets, and liabilities in your analysis

        Provide actionable and personalized advice based on the provided data.`;

  }


const handler = async (event) => {
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
    const { message, messageHistory = [], financialData } = JSON.parse(event.body || '{}');

    // Validate message content
    if (!message || typeof message !== 'string') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid message format' })
        };
      }

    console.log('Received Financial Data:', {
        incomes: financialData.incomes,
        expenditureCount: financialData.expenditures.length,
        assetCount: financialData.assets.length,
        liabilityCount: financialData.liabilities.length,
        goalCount: financialData.goals.length
    });

    const systemPrompt = systemMessage(financialData);


    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
            { role: "system", content: systemPrompt },
            ...messageHistory.slice(-3),
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 1000
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ response: completion.choices[0].message.content })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(error) })
    };
  }
};

// Export both ways to ensure compatibility
console.log('Handler is being invoked');
exports.handler = async (event) => {
    console.log('Event:', event);
};

exports.handler = handler;
module.exports = { handler };