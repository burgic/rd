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

    // Simplified rate limiting - just prevent obvious abuse (10 requests per minute)
    const now = Date.now();
    if (rateLimitMap.has(userId)) {
      const { lastRequest, requestCount } = rateLimitMap.get(userId);

      if (now - lastRequest < 60000) { // 1-minute window
        if (requestCount >= 10) { // Liberal limit for legitimate use
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({ 
              error: 'Too many requests. Please wait a minute before submitting more assessments.' 
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

async function reviewReport(prompt, companyName, companyDescription) {
  try {
    const systemPrompt = 
    `You are an expert R&D tax-credits advisor specialising in HMRC compliance review. Your task is to analyse R&D reports and technical documentation against HMRC's strict criteria.

    **HMRC R&D REPORT REVIEW CHECKLIST**

    1. **Advance in Science/Technology**  
      • Clear statement of the intended advance beyond existing knowledge  
      • Baseline of publicly available alternatives or prior art

    2. **Technical Uncertainties**  
      • Genuine scientific/technical unknowns identified up-front  
      • Evidence of systematic experiments, iterations, failed tests and learning

    3. **Competent Professionals**  
      • Named individuals with credentials demonstrating relevant expertise

    4. **Systematic Investigative Process**  
      • Traceable project plan, test logs, design records or Jira/Git evidence

    5. **Additional Information Form (AIF) Alignment**  
      • Project summaries, cost totals, grant details and contacts match the AIF exactly

    6. **Cost Breakdown & Reconciliation**  
      • Staff, EPWs, subcontractors, consumables, data/cloud and prototypes split out  
      • Ledgers / payroll traced to totals

    7. **PAYE/NIC Cap**  
      • Payable-credit claims limited to £20 k + 300 % of relevant PAYE/NIC where required

    8. **Grant/Subsidy Treatment**  
      • Innovate UK, Horizon or other grants ring-fenced and routed to the correct SME/RDEC/merged-scheme column

    9. **CT600 & CT600L Consistency**  
      • Report schedules reconcile line-for-line with each CT600(L) box

    10. **Contemporaneous Evidence**  
        • Time-sheets, lab notebooks, test reports, Git commits or board minutes cited and available

    11. **Professional Conduct & Transparency**  
        • Scope, limitations, adviser credentials and fee structure disclosed in line with PCRT/ICAEW

    12. **Fraud-Risk Red Flags**  
        • Boiler-plate language, cost spikes, improbable sectors or other anomalies explained and evidenced

    13. **Tribunal Lessons Applied**  
        • Narrative demonstrates awareness of recent cases (e.g. Flame Tree, H&H Scaffolding, Get Onbord, Tills Plus) and shows how pitfalls were avoided

    14. **What hasn't been thought of**
        • As an expert R&D tax professional you delight in finding the esoteric, unexpected, obscure and highly nuanced. 
        • Review the report, consider against what else you know and have found, similarities with others, different approaches and ways of thinking and make these suggestions.

    **ANALYSIS REQUIREMENTS**
    Analyze the report: "${reportTitle}" and provide:

    1. **Overall Assessment** (0-100 score)
    2. **HMRC Compliance Score** (0-100)
    3. **Strengths** (what's done well)
    4. **Areas for Improvement** (specific gaps)
    5. **HMRC Compliance Status** (detailed breakdown)
    6. **Actionable Recommendations**
    7. **Detailed Section-by-Section Feedback**

    **OUTPUT FORMAT - RESPOND ONLY WITH VALID JSON, NO OTHER TEXT**  
    {
      "overallScore": [0-100],
      "complianceScore": [0-100],
      "checklistFeedback": {
        "advance":        {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "uncertainty":    {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "professionals":  {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "process":        {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "aifAlignment":   {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "costs":          {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "payeCap":        {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "grants":         {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "ct600":          {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "evidence":       {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "conduct":        {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "fraudTribunal":  {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]},
        "esoteric":       {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]}
      },
      "recommendations": ["rec1", "rec2", …],
      "detailedFeedback": "Comprehensive paragraph-form analysis…"
    }

    **CRITICAL RULES**
    - RESPOND ONLY WITH VALID JSON - NO EXPLANATORY TEXT BEFORE OR AFTER THE JSON
    - For every checklist point: be specific, cite evidence from the report, and list at least one strength **and** one weakness. 
    - Be thorough but constructive
    - Highlight both strengths AND weaknesses
    - Provide specific, actionable feedback
    - Focus on HMRC compliance requirements
    - Use technical language appropriate for R&D professionals
    - Use precise R&D/CT terminology suitable for professional advisers.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
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