import openai from '../../config/openai'; // Import OpenAI client
import fetchUserData from './Fetch'; // Fetch user data from Supabase
import { calculateAge, calculateYearsToRetirement, analyzeGoals, suggestDebtRepayment } from './Calculate';

async function generateBotResponse(userId: string, query: string, agentType: string): Promise<string> {
  const { profile, finances } = await fetchUserData(userId);

  // Prepare contextual data
  const age = calculateAge(profile.dob);
  const yearsToRetirement = calculateYearsToRetirement(age, profile.retirement_age);
  const goalsFeedback = analyzeGoals(finances.goals);
  const debtFeedback = suggestDebtRepayment(finances.income, finances.expenses, finances.liabilities);

  // Construct the OpenAI prompt
  const prompt = `
  You are a financial assistant chatbot designed to provide tailored advice for financial planning. 
    Your primary responsibilities include:
    1. Calculating retirement age and guiding users toward retirement goals.
    2. Providing actionable steps to achieve savings and investment goals.
    3. Recommending strategies to pay off debts.
    4. Offering general financial insights in a friendly and professional tone.

    Always ensure your advice is concise, actionable, and specific to the user's financial data.

    Here's the user's data:
    - Age: ${age}
    - Years to Retirement: ${yearsToRetirement}
    - Savings: ${finances.savings}
    - Income: ${finances.income}
    - Expenses: ${finances.expenses}
    - Liabilities: ${finances.liabilities}
    - Goals:
    ${goalsFeedback.map((goal, index) => `${index + 1}. ${goal}`).join('\n')}

    User's query: "${query}"

    Provide a helpful and concise response in a friendly tone.
  `;

  // Use OpenAI's API
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant guiding people on their financial journeys. You seek to provide tailored advice and insights to help users achieve their financial goals. Your responses should be concise, actionable, and specific to the user\'s financial data. Always ensure your advice is helpful and relevant to the user\'s needs.' },
      { role: 'user', content: 'Hello!' },
    ],
  });

  return response.choices[0].message?.content || 'I’m sorry, I couldn’t process your request.';
}

export default generateBotResponse;