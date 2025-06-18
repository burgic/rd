const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const rateLimitMap = new Map();

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
    const { userId, query, companyName, companyDescription } = JSON.parse(event.body);

    console.log('R&D Assessment request:', { userId, companyName, hasQuery: !!query, hasDescription: !!companyDescription });

    if (!userId || !query || !companyName || !companyDescription) {
      return {
        statusCode: 400,
        headers,
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
            headers,
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

    // Note: User authentication is handled at the frontend level
    // We don't need to verify the user profile here, just process the request

    // Generate R&D assessment using OpenAI
    const aiResponse = await generateRDAssessment(query, companyName, companyDescription);

    return {
      statusCode: 200,
      headers,
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
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process R&D assessment. Please try again.' 
      }),
    };
  }
};

async function generateRDAssessment(prompt, companyName, companyDescription) {
  try {
    const systemPrompt = `You are an expert R&D tax credits advisor specializing in HMRC eligibility assessments. Strictly evaluate projects against these criteria:

**HMRC CORE REQUIREMENTS**
1. PROJECT DOMAIN: Must seek advance in:
   - SCIENCE: Study of physical/material universe OR mathematics (eligible post-April 2023)
   - TECHNOLOGY: Application of scientific principles
   - Excluded: Arts/humanities/social sciences

2. APPRECIABLE ADVANCE: Must create/improve process/material/device/product/service where:
   - Improvement is non-trivial (beyond routine upgrades)
   - Competent professional recognizes advance
   - Examples: New AI algorithms, novel manufacturing processes

3. SCIENTIFIC/TECHNOLOGICAL UNCERTAINTY:
   - Experts cannot deduce solution using current knowledge
   - Must document resolution attempts (hypotheses/tests/failures)

**ASSESSMENT PROCESS**
For ${companyName}: ${companyDescription}
1. FIELD ASSESSMENT:
   - Determine Science/Technology/Excluded
   - Judge advance: Appreciable/Routine

2. UNCERTAINTY ASSESSMENT:
   - Verify genuine uncertainty existed
   - Check documented resolution process

**REQUIRED OUTPUT FORMAT**
Return a JSON object with these fields:
{
  "eligibilityScore": [0-100 number],
  "eligible": [true/false],
  "reasoning": "[Detailed technical assessment]",
  "recommendations": ["[Recommendation 1]", "[Recommendation 2]"],
  "nextSteps": ["[Step 1]", "[Step 2]"],
  "estimatedValue": "[Estimated claim value or 'Contact advisor']"
}

**RULES**
- NEVER speculate beyond provided information
- Base assessment SOLELY on HMRC criteria
- Use technical language appropriate for tax professionals`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: systemPrompt
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
    return JSON.stringify({
      eligibilityScore: 50,
      eligible: false,
      reasoning: `Unable to complete automated assessment at this time. The company description for ${companyName} has been received, but our AI assessment service is temporarily unavailable. Please try again later or contact a qualified R&D tax advisor for a manual assessment.`,
      recommendations: [
        "Retry the assessment in a few minutes",
        "Ensure your company description includes specific technical challenges and innovations"
      ],
      nextSteps: [
        "Review HMRC's R&D tax credits guidelines",
        "Document your technical processes and innovations",
        "Consult with a specialist R&D tax advisor"
      ],
      estimatedValue: "Contact advisor for estimate"
    });
  }
} 