const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const rateLimitMap = new Map();

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userId, query, companyName, companyDescription } = JSON.parse(event.body);

    if (!userId || !query || !companyName || !companyDescription) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: userId, query, companyName, companyDescription' 
        }),
      };
    }

    // Rate limiting logic
    const now = Date.now();
    if (rateLimitMap.has(userId)) {
      const { lastRequest, requestCount } = rateLimitMap.get(userId);

      if (now - lastRequest < 60000) { // 1-minute window
        if (requestCount >= 3) { // Limit to 3 R&D assessments per minute
          return {
            statusCode: 429,
            body: JSON.stringify({ 
              error: 'Rate limit exceeded. Please wait a minute before submitting another assessment.' 
            }),
          };
        }
        rateLimitMap.set(userId, { lastRequest: now, requestCount: requestCount + 1 });
      } else {
        rateLimitMap.set(userId, { lastRequest: now, requestCount: 1 });
      }
    } else {
      rateLimitMap.set(userId, { lastRequest: now, requestCount: 1 });
    }

    // Verify user exists in Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Invalid user ID' }),
      };
    }

    // Generate R&D assessment using OpenAI
    const aiResponse = await generateRDAssessment(query, companyName, companyDescription);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({ 
        response: aiResponse,
        companyName,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error processing R&D assessment request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process R&D assessment. Please try again.' 
      }),
    };
  }
};

async function generateRDAssessment(prompt, companyName, companyDescription) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert R&D tax credits advisor with deep knowledge of HMRC guidelines and requirements. You specialize in assessing UK companies for R&D tax credit eligibility.

Your expertise includes:
- HMRC's definition of qualifying R&D activities
- Technical uncertainty and advance in science/technology criteria
- Process improvements and innovation assessment
- Systematic investigation requirements
- Current R&D tax credit rates and schemes (SME vs RDEC)
- Common eligibility pitfalls and requirements

Always provide structured, actionable advice based on current HMRC guidelines. Be thorough but practical in your assessments.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Fallback response if OpenAI fails
    return `{
  "eligibilityScore": 50,
  "eligible": false,
  "reasoning": "Unable to complete automated assessment at this time. The company description for ${companyName} has been received, but our AI assessment service is temporarily unavailable. Please try again later or contact a qualified R&D tax advisor for a manual assessment.",
  "recommendations": [
    "Retry the assessment in a few minutes",
    "Contact a qualified R&D tax advisor for manual review",
    "Ensure your company description includes specific technical challenges and innovations"
  ],
  "nextSteps": [
    "Review HMRC's R&D tax credits guidelines",
    "Document your technical processes and innovations",
    "Consult with a specialist R&D tax advisor"
  ],
  "estimatedValue": "Contact advisor for estimate"
}`;
  }
} 