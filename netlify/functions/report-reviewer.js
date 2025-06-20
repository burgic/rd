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

    console.log('Report review request:', { userId, fileName, reportType, hasContent: !!reportContent });

    if (!userId || !reportContent || !fileName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: userId, reportContent, fileName' 
        }),
      };
    }

    // Rate limiting - 5 reports per minute
    const now = Date.now();
    if (rateLimitMap.has(userId)) {
      const { lastRequest, requestCount } = rateLimitMap.get(userId);

      if (now - lastRequest < 60000) { // 1-minute window
        if (requestCount >= 5) {
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({ 
              error: 'Too many report reviews. Please wait a minute before submitting more reports.' 
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

    // Analyze the report using OpenAI
    const analysis = await analyzeReport(reportContent, fileName, reportType);

    // Save the analysis to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('report_reviews')
      .insert({
        user_id: userId,
        file_name: fileName,
        report_type: reportType || 'rd_report',
        content_preview: reportContent.substring(0, 500) + (reportContent.length > 500 ? '...' : ''),
        overall_score: analysis.overallScore,
        compliance_score: analysis.complianceScore,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        hmrc_compliance: analysis.hmrcCompliance,
        recommendations: analysis.recommendations,
        detailed_feedback: analysis.detailedFeedback,
        document_id: documentId || null, // Link to document if provided
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report analysis:', saveError);
      // Continue without saving if database fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        analysis,
        reviewId: savedAnalysis?.id,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error processing report review:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze report. Please try again.' 
      }),
    };
  }
};

async function analyzeReport(reportContent, fileName, reportType) {
  try {
    const systemPrompt = 
    `You are an expert R&D tax-credits advisor specialising in HMRC compliance review. Your task is to analyse R&D reports and technical documentation against HMRC’s strict criteria.

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


**ANALYSIS REQUIREMENTS**
Analyze the report: "${fileName}" and provide:

1. **Overall Assessment** (0-100 score)
2. **HMRC Compliance Score** (0-100)
3. **Strengths** (what's done well)
4. **Areas for Improvement** (specific gaps)
5. **HMRC Compliance Status** (detailed breakdown)
6. **Actionable Recommendations**
7. **Detailed Section-by-Section Feedback**

**OUTPUT FORMAT (exactly)**  
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
    "fraudTribunal":  {"score": [0-100], "strengths": ["…"], "weaknesses": ["…"]}
  },
  "recommendations": ["rec1", "rec2", …],
  "detailedFeedback": "Comprehensive paragraph-form analysis…"
}


**CRITICAL RULES**
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
        model: 'gpt-4o',
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please analyze this R&D report content:\n\n${reportContent}`
          }
        ],
        max_tokens: 2500,
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

    const analysisText = data.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback structured response
      return {
        overallScore: 50,
        complianceScore: 40,
        strengths: ["Report uploaded successfully"],
        improvements: ["AI analysis temporarily unavailable - manual review recommended"],
        hmrcCompliance: {
          projectScope: {"score": 50, "feedback": "Unable to analyze at this time"},
          technicalAdvance: {"score": 50, "feedback": "Unable to analyze at this time"},
          uncertainty: {"score": 50, "feedback": "Unable to analyze at this time"},
          documentation: {"score": 50, "feedback": "Unable to analyze at this time"},
          eligibility: {"score": 50, "feedback": "Unable to analyze at this time"}
        },
        recommendations: ["Retry analysis later", "Consider manual expert review"],
        detailedFeedback: `Analysis of ${fileName} could not be completed due to technical issues. Please try again later or consult with an R&D tax specialist for manual review.`
      };
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Fallback response if OpenAI fails
    return {
      overallScore: 50,
      complianceScore: 40,
      strengths: ["Report received for analysis"],
      improvements: ["AI analysis service temporarily unavailable"],
      hmrcCompliance: {
        projectScope: {"score": 50, "feedback": "Analysis unavailable - service error"},
        technicalAdvance: {"score": 50, "feedback": "Analysis unavailable - service error"},
        uncertainty: {"score": 50, "feedback": "Analysis unavailable - service error"},
        documentation: {"score": 50, "feedback": "Analysis unavailable - service error"},
        eligibility: {"score": 50, "feedback": "Analysis unavailable - service error"}
      },
      recommendations: [
        "Retry the analysis in a few minutes",
        "Ensure the report contains technical R&D content",
        "Consider manual review by R&D tax specialist"
      ],
      detailedFeedback: `Unable to complete automated analysis of ${fileName} at this time. The report has been received but our AI analysis service is temporarily unavailable. Please try again later or contact a qualified R&D tax advisor for manual review.`
    };
  }
} 