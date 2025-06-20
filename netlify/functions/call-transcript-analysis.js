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
    const { userId, transcript, clientName, callDate, callDuration } = JSON.parse(event.body);

    console.log('Call transcript analysis request:', { 
      userId, 
      clientName, 
      hasTranscript: !!transcript, 
      callDate,
      transcriptLength: transcript?.length 
    });

    if (!userId || !transcript || !clientName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: userId, transcript, clientName' 
        }),
      };
    }

    // Simplified rate limiting - just prevent obvious abuse (5 analyses per minute)
    const now = Date.now();
    if (rateLimitMap.has(userId)) {
      const { lastRequest, requestCount } = rateLimitMap.get(userId);

      if (now - lastRequest < 60000) { // 1-minute window
        if (requestCount >= 5) { // Liberal limit for legitimate use
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({ 
              error: 'Too many requests. Please wait a minute before submitting more analyses.' 
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

    // Generate call transcript analysis using OpenAI
    const aiResponse = await analyzeCallTranscript(transcript, clientName, callDate);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response: aiResponse,
        clientName,
        callDate,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error processing call transcript analysis request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze call transcript. Please try again.' 
      }),
    };
  }
};

async function analyzeCallTranscript(transcript, clientName, callDate) {
  try {
    const systemPrompt = `You are an expert R&D tax credits advisor analyzing call transcripts between R&D professionals and clients. Extract and analyze R&D-relevant information against HMRC criteria.

    **HMRC R&D CRITERIA TO ASSESS**
    1. ELIGIBLE ACTIVITIES:
      - Advance in science/technology (not arts/humanities/social sciences)
      - Systematic investigation/experimentation
      - Resolution of scientific/technological uncertainty
      - Novel solutions beyond current knowledge

    2. QUALIFYING WORK:
      - Research activities
      - Development of new processes/products/services
      - Appreciable improvements to existing technology
      - Overcoming technical challenges

    **ANALYSIS OBJECTIVES**
    From the call transcript:
    1. IDENTIFY R&D ACTIVITIES:
      - What technical work is being discussed?
      - What challenges are they trying to solve?
      - What innovations or improvements are mentioned?

    2. ASSESS HMRC COMPLIANCE:
      - Does the work meet R&D criteria?
      - What evidence of systematic investigation exists?
      - Are there technical uncertainties mentioned?

    3. EXTRACT KEY INFORMATION:
      - Technical processes described
      - Innovation elements
      - Problem-solving approaches
      - Potential qualifying costs/activities

    **REQUIRED OUTPUT FORMAT**
    Return a JSON object with these fields:
    {
      "rdActivitiesIdentified": ["[Activity 1]", "[Activity 2]"],
      "technicalChallenges": ["[Challenge 1]", "[Challenge 2]"],
      "innovationElements": ["[Innovation 1]", "[Innovation 2]"],
      "hmrcEligibilityScore": [0-100 number],
      "eligibilityAssessment": "[Detailed assessment of HMRC compliance]",
      "keyFindings": ["[Finding 1]", "[Finding 2]"],
      "recommendedActions": ["[Action 1]", "[Action 2]"],
      "documentationNeeds": ["[Doc need 1]", "[Doc need 2]"],
      "estimatedClaimValue": "[Estimated value or 'Requires detailed analysis']",
      "followUpQuestions": ["[Question 1]", "[Question 2]"]
    }

    **RULES**
    - Base analysis SOLELY on information in the transcript
    - Use technical language appropriate for R&D tax professionals
    - Be specific about what qualifies vs. doesn't qualify
    - Focus on HMRC compliance requirements
    - Identify gaps in information that need follow-up`;

    const userPrompt = `
CALL DETAILS:
Client: ${clientName}
Date: ${callDate || 'Not specified'}

TRANSCRIPT TO ANALYZE:
${transcript}

Please analyze this call transcript and extract all R&D-relevant information according to HMRC criteria.`;

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
            content: userPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent analysis
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
      rdActivitiesIdentified: ["Unable to analyze - service temporarily unavailable"],
      technicalChallenges: ["Analysis service unavailable"],
      innovationElements: ["Please try again later"],
      hmrcEligibilityScore: 0,
      eligibilityAssessment: `Unable to complete automated analysis at this time. The call transcript for ${clientName} has been received, but our AI analysis service is temporarily unavailable. Please try again later or perform manual analysis.`,
      keyFindings: ["Service temporarily unavailable"],
      recommendedActions: [
        "Retry the analysis in a few minutes",
        "Perform manual transcript review",
        "Contact technical support if issue persists"
      ],
      documentationNeeds: ["Manual analysis required"],
      estimatedClaimValue: "Analysis required",
      followUpQuestions: ["Service unavailable - manual review needed"]
    });
  }
} 