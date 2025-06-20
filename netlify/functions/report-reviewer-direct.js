const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { userId, reportContent, reportTitle, reportType } = JSON.parse(event.body);

    console.log('Direct Report Review request:', { userId, reportTitle, reportType, hasContent: !!reportContent });

    if (!userId || !reportContent || !reportTitle) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: userId, reportContent, reportTitle' 
        }),
      };
    }

    // Clean the report content of any invalid Unicode characters
    const cleanedContent = reportContent
      .replace(/\u0000/g, '') // Remove null bytes
      .replace(/[\u0001-\u001F\u007F-\u009F]/g, ' ') // Replace control characters with spaces
      .replace(/\uFFFD/g, '') // Remove replacement characters
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ') // Replace non-printable characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Validate cleaned content
    if (cleanedContent.length < 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Report content appears to be too short. Please ensure the report contains sufficient detail for analysis.' 
        }),
      };
    }

    console.log('Content length:', cleanedContent.length);

    // Truncate very long content to prevent timeouts
    let processedContent = cleanedContent;
    if (cleanedContent.length > 15000) {
      processedContent = cleanedContent.substring(0, 15000) + '\n\n[Report truncated for analysis due to length]';
      console.log('Content truncated from', cleanedContent.length, 'to', processedContent.length, 'characters');
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

    // Generate report analysis using OpenAI
    console.log('Starting OpenAI analysis...');
    const analysis = await analyzeReportDirect(processedContent, reportTitle, reportType || 'rd_report');
    console.log('Analysis completed, overall score:', analysis.overallScore);

    // Prepare the database record
    const dbRecord = {
      user_id: userId,
      file_name: reportTitle,
      report_type: reportType || 'rd_report',
      content_preview: processedContent.substring(0, 500) + (processedContent.length > 500 ? '...' : ''),
      overall_score: analysis.overallScore,
      compliance_score: analysis.complianceScore,
      strengths: analysis.checklistFeedback ? JSON.stringify(Object.keys(analysis.checklistFeedback).map(key => analysis.checklistFeedback[key].strengths).flat()) : JSON.stringify([]),
      improvements: analysis.checklistFeedback ? JSON.stringify(Object.keys(analysis.checklistFeedback).map(key => analysis.checklistFeedback[key].weaknesses).flat()) : JSON.stringify([]),
      hmrc_compliance: analysis.checklistFeedback || {},
      recommendations: analysis.recommendations || [],
      detailed_feedback: analysis.detailedFeedback,
      document_id: null, // Direct input doesn't have a document_id
      created_at: new Date().toISOString()
    };

    // Save the analysis to database
    console.log('Saving analysis to database...');
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('report_reviews')
      .insert(dbRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report analysis:', saveError);
      console.error('Save error details:', {
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint
      });
      // Continue without saving if database fails
    } else {
      console.log('Analysis saved successfully with ID:', savedAnalysis.id);
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
    console.error('Error processing direct report review:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze report. Please try again.' 
      }),
    };
  }
};

async function analyzeReportDirect(reportContent, reportTitle, reportType) {
  console.log('analyzeReportDirect called with content length:', reportContent.length);
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

    console.log('Making OpenAI API call...');
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
            content: `Please analyze this R&D report content and respond ONLY with valid JSON following the exact format specified in the system prompt. Do not include any explanatory text outside the JSON structure:\n\n${reportContent}`
          }
        ],
        max_tokens: 1800,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(25000) // 25 second timeout
    });

    console.log('OpenAI API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      
      // Handle rate limit specifically
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || '15';
        throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`);
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received, parsing...');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    const analysisText = data.choices[0].message.content;
    console.log('Analysis text length:', analysisText.length);
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(analysisText);
      console.log('Successfully parsed JSON analysis');
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI Response text (first 500 chars):', analysisText.substring(0, 500));
      // Fallback structured response
      return {
        overallScore: 50,
        complianceScore: 40,
        checklistFeedback: {
          advance: {"score": 50, "strengths": ["Report received"], "weaknesses": ["Unable to analyze - technical error"]},
          uncertainty: {"score": 50, "strengths": ["Document provided"], "weaknesses": ["Analysis unavailable"]},
          professionals: {"score": 50, "strengths": ["Content processed"], "weaknesses": ["Cannot assess competency"]},
          process: {"score": 50, "strengths": ["Report submitted"], "weaknesses": ["Process analysis failed"]},
          aifAlignment: {"score": 50, "strengths": ["Document accepted"], "weaknesses": ["AIF alignment check failed"]},
          costs: {"score": 50, "strengths": ["Content received"], "weaknesses": ["Cost analysis unavailable"]},
          payeCap: {"score": 50, "strengths": ["Report provided"], "weaknesses": ["PAYE cap check failed"]},
          grants: {"score": 50, "strengths": ["Document processed"], "weaknesses": ["Grant treatment analysis failed"]},
          ct600: {"score": 50, "strengths": ["Content accepted"], "weaknesses": ["CT600 consistency check failed"]},
          evidence: {"score": 50, "strengths": ["Report received"], "weaknesses": ["Evidence assessment failed"]},
          conduct: {"score": 50, "strengths": ["Document provided"], "weaknesses": ["Professional conduct review failed"]},
          fraudTribunal: {"score": 50, "strengths": ["Content processed"], "weaknesses": ["Fraud risk assessment failed"]},
          esoteric: {"score": 50, "strengths": ["Document received"], "weaknesses": ["Esoteric analysis failed"]}
        },
        recommendations: ["Retry analysis later", "Consider manual expert review"],
        detailedFeedback: `Analysis of ${reportTitle} could not be completed due to technical issues. Please try again later or consult with an R&D tax specialist for manual review.`
      };
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Fallback response if OpenAI fails
    return {
      overallScore: 50,
      complianceScore: 40,
      checklistFeedback: {
        advance: {"score": 50, "strengths": ["Report received"], "weaknesses": ["Service error - unable to analyze"]},
        uncertainty: {"score": 50, "strengths": ["Document provided"], "weaknesses": ["Analysis service unavailable"]},
        professionals: {"score": 50, "strengths": ["Content processed"], "weaknesses": ["Cannot assess competency - service error"]},
        process: {"score": 50, "strengths": ["Report submitted"], "weaknesses": ["Process analysis service failed"]},
        aifAlignment: {"score": 50, "strengths": ["Document accepted"], "weaknesses": ["AIF alignment service unavailable"]},
        costs: {"score": 50, "strengths": ["Content received"], "weaknesses": ["Cost analysis service error"]},
        payeCap: {"score": 50, "strengths": ["Report provided"], "weaknesses": ["PAYE cap service unavailable"]},
        grants: {"score": 50, "strengths": ["Document processed"], "weaknesses": ["Grant analysis service error"]},
        ct600: {"score": 50, "strengths": ["Content accepted"], "weaknesses": ["CT600 analysis service failed"]},
        evidence: {"score": 50, "strengths": ["Report received"], "weaknesses": ["Evidence analysis service error"]},
        conduct: {"score": 50, "strengths": ["Document provided"], "weaknesses": ["Conduct review service unavailable"]},
        fraudTribunal: {"score": 50, "strengths": ["Content processed"], "weaknesses": ["Risk assessment service error"]},
        esoteric: {"score": 50, "strengths": ["Document received"], "weaknesses": ["Esoteric analysis service error"]}
      },
      recommendations: [
        "Retry the analysis in a few minutes",
        "Ensure the report contains technical R&D content",
        "Consider manual review by R&D tax specialist"
      ],
      detailedFeedback: `Unable to complete automated analysis of ${reportTitle} at this time. The report has been received but our AI analysis service is temporarily unavailable. Please try again later or contact a qualified R&D tax advisor for manual review.`
    };
  }
} 