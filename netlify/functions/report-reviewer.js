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
    const { userId, reportContent, fileName, reportType, documentId } = JSON.parse(event.body);

    console.log('Report Review request:', { userId, fileName, reportType, hasContent: !!reportContent, documentId });

    if (!userId || !reportContent || !fileName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: userId, reportContent, fileName' 
        }),
      };
    }

    // Simplified rate limiting - prevent abuse (5 reports per minute)
    const now = Date.now();
    if (rateLimitMap.has(userId)) {
      const { lastRequest, requestCount } = rateLimitMap.get(userId);

      if (now - lastRequest < 60000) { // 1-minute window
        if (requestCount >= 5) {
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({ 
              error: 'Too many requests. Please wait a minute before submitting more reports.' 
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

    // Generate report review using OpenAI
    const aiResponse = await reviewReport(reportContent, fileName, reportType);

    // Generate a unique review ID
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response: aiResponse,
        reviewId,
        fileName,
        reportType,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error processing report review request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process report review. Please try again.' 
      }),
    };
  }
};

async function reviewReport(reportContent, fileName, reportType) {
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
    Analyze the report: "${fileName}" (Type: ${reportType}) and provide:

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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Report Content:\n\n${reportContent}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
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
      overallScore: 50,
      complianceScore: 40,
      checklistFeedback: {
        advance: {"score": 50, "strengths": ["Report received"], "weaknesses": ["Unable to complete automated analysis"]},
        uncertainty: {"score": 50, "strengths": ["Report submitted"], "weaknesses": ["Analysis service temporarily unavailable"]},
        professionals: {"score": 50, "strengths": ["Document provided"], "weaknesses": ["Manual review required"]},
        process: {"score": 50, "strengths": ["Content received"], "weaknesses": ["Automated analysis failed"]},
        aifAlignment: {"score": 50, "strengths": ["Report uploaded"], "weaknesses": ["Service temporarily unavailable"]},
        costs: {"score": 50, "strengths": ["Document processed"], "weaknesses": ["Unable to analyze costs automatically"]},
        payeCap: {"score": 50, "strengths": ["Report received"], "weaknesses": ["Manual calculation required"]},
        grants: {"score": 50, "strengths": ["Content available"], "weaknesses": ["Analysis service down"]},
        ct600: {"score": 50, "strengths": ["Document submitted"], "weaknesses": ["Unable to verify consistency"]},
        evidence: {"score": 50, "strengths": ["Report provided"], "weaknesses": ["Manual evidence review needed"]},
        conduct: {"score": 50, "strengths": ["Document received"], "weaknesses": ["Professional review required"]},
        fraudTribunal: {"score": 50, "strengths": ["Content uploaded"], "weaknesses": ["Unable to assess tribunal compliance"]},
        esoteric: {"score": 50, "strengths": ["Report submitted"], "weaknesses": ["Expert manual review recommended"]}
      },
      recommendations: [
        "Retry the analysis in a few minutes",
        "Contact a qualified R&D tax advisor for manual review",
        "Ensure the report includes all required HMRC compliance elements"
      ],
      detailedFeedback: `Unable to complete automated assessment of ${fileName} at this time. The report content has been received, but our AI assessment service is temporarily unavailable. Please try again later or contact a qualified R&D tax advisor for a comprehensive manual review. The report should be reviewed against all 14 HMRC compliance criteria for R&D tax credits.`
    });
  }
}