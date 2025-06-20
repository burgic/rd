const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Initialize Supabase with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rateLimitMap = new Map();

// Helper function to log with timestamp and memory usage
function logWithMetrics(message, data = {}) {
  const timestamp = new Date().toISOString();
  const memoryUsage = process.memoryUsage();
  console.log(JSON.stringify({
    timestamp,
    message,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    },
    ...data
  }));
}

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle retries
async function withRetry(operation, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      logWithMetrics('Attempting operation', { attempt: i + 1, maxRetries });
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;
      logWithMetrics('Operation successful', { 
        attempt: i + 1, 
        duration: `${duration}ms` 
      });
      return result;
    } catch (error) {
      lastError = error;
      logWithMetrics('Operation failed', { 
        attempt: i + 1, 
        error: error.message,
        status: error.status,
        code: error.code
      });
      
      if (error.status === 429 || error.status === 500) {
        const waitTime = RETRY_DELAY * Math.pow(2, i);
        logWithMetrics('Retrying after delay', { 
          waitTime: `${waitTime}ms`,
          nextAttempt: i + 2 
        });
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Handler for Netlify Functions
exports.handler = async (event, context) => {
  const startTime = Date.now();
  logWithMetrics('Function started', { 
    httpMethod: event.httpMethod,
    path: event.path,
    queryStringParameters: event.queryStringParameters
  });

  // Configure CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    logWithMetrics('Handling OPTIONS request');
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Check for POST method
    if (event.httpMethod !== 'POST') {
      logWithMetrics('Invalid method', { method: event.httpMethod });
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Check required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      logWithMetrics('Missing Supabase configuration');
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Server configuration error' }) 
      };
    }

    if (!openaiApiKey) {
      logWithMetrics('Missing OpenAI API key');
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'AI service configuration error' }) 
      };
    }

    // Parse request body
    logWithMetrics('Parsing request body');
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      logWithMetrics('Failed to parse request body', { error: parseError.message });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { userId, reportContent, reportTitle, reportType } = requestData;

    // Log request data size
    logWithMetrics('Request data received', {
      userId,
      reportTitle,
      hasContent: !!reportContent,
      contentLength: reportContent?.length,
      reportType
    });

    // Validate required fields
    if (!userId || !reportContent || !reportTitle) {
      logWithMetrics('Missing required parameters', {
        hasUserId: !!userId,
        hasReportContent: !!reportContent,
        hasReportTitle: !!reportTitle
      });
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Missing required fields: userId, reportContent, reportTitle' }) 
      };
    }

    // Rate limiting - prevent abuse (5 requests per minute)
    const now = Date.now();
    if (rateLimitMap.has(userId)) {
      const { lastRequest, requestCount } = rateLimitMap.get(userId);

      if (now - lastRequest < 60000) { // 1-minute window
        if (requestCount >= 5) {
          logWithMetrics('Rate limit exceeded', { userId, requestCount });
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

    // Generate analysis using OpenAI with retry logic
    logWithMetrics('Starting OpenAI analysis');
    const analysis = await analyzeReportDirect(reportContent, reportTitle, reportType || 'rd_report');
    logWithMetrics('OpenAI analysis completed', {
      hasAnalysis: !!analysis,
      overallScore: analysis?.overallScore,
      complianceScore: analysis?.complianceScore
    });

    // Save to database (but don't fail the request if this fails)
    let reviewId = null;
    try {
      logWithMetrics('Saving to database');
      const pendingRecord = {
        user_id: userId,
        file_name: reportTitle,
        report_type: reportType || 'rd_report',
        content_preview: reportContent.substring(0, 500) + (reportContent.length > 500 ? '...' : ''),
        overall_score: analysis.overallScore,
        compliance_score: analysis.complianceScore,
        strengths: JSON.stringify(Object.keys(analysis.checklistFeedback || {}).map(key => analysis.checklistFeedback[key].strengths || []).flat()),
        improvements: JSON.stringify(Object.keys(analysis.checklistFeedback || {}).map(key => analysis.checklistFeedback[key].weaknesses || []).flat()),
        hmrc_compliance: analysis.checklistFeedback || {},
        recommendations: analysis.recommendations || [],
        detailed_feedback: analysis.detailedFeedback
      };

      const { data: savedRecord, error: saveError } = await supabase
        .from('report_reviews')
        .insert(pendingRecord)
        .select()
        .single();

      if (saveError) {
        logWithMetrics('Database save failed (non-critical)', { error: saveError.message });
      } else {
        reviewId = savedRecord.id;
        logWithMetrics('Saved to database successfully', { reviewId });
      }
    } catch (dbError) {
      logWithMetrics('Database operation failed (non-critical)', { error: dbError.message });
    }

    // Prepare response
    const responseData = {
      analysis,
      reviewId,
      reportTitle,
      timestamp: new Date().toISOString()
    };

    const responseBody = JSON.stringify(responseData);
    const totalDuration = Date.now() - startTime;
    
    logWithMetrics('Function completed successfully', {
      totalDuration: `${totalDuration}ms`,
      responseBodySize: responseBody.length,
      hasAnalysis: !!analysis,
      overallScore: analysis?.overallScore,
      complianceScore: analysis?.complianceScore,
      hasChecklistFeedback: !!analysis?.checklistFeedback
    });

    // CRITICAL FIX: Ensure proper response format
    return {
      statusCode: 200,
      headers,
      body: responseBody
    };

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    logWithMetrics('Function failed', {
      error: error.message,
      status: error.status,
      code: error.code,
      duration: `${errorDuration}ms`,
      stack: error.stack
    });

    const errorResponseBody = JSON.stringify({ 
      error: error.message || 'Failed to analyze report. Please try again.',
      timestamp: new Date().toISOString()
    });

    return { 
      statusCode: 500, 
      headers, 
      body: errorResponseBody
    };
  }
};

async function analyzeReportDirect(reportContent, reportTitle, reportType) {
  logWithMetrics('analyzeReportDirect called', { 
    contentLength: reportContent.length,
    reportTitle,
    reportType
  });
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
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

    // Use the same retry pattern as the working function
    const analysisResult = await withRetry(async () => {
      logWithMetrics('Making OpenAI API call');
      const apiStartTime = Date.now();
      
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
              content: `Please analyze this R&D report content and respond ONLY with valid JSON following the exact format specified in the system prompt. Do not include any explanatory text outside the JSON structure:\n\n${reportContent}`
            }
          ],
          max_tokens: 1800,
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      const apiDuration = Date.now() - apiStartTime;
      logWithMetrics('OpenAI API call completed', {
        duration: `${apiDuration}ms`,
        status: response.status
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        logWithMetrics('OpenAI API error', { 
          status: response.status,
          error: errorData 
        });
        
        // Handle rate limit specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || '15';
          throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`);
        }
        
        const error = new Error(`OpenAI API error: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      logWithMetrics('OpenAI response received', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        tokens: data.usage?.total_tokens
      });
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        logWithMetrics('Invalid OpenAI response format', { data });
        throw new Error('Invalid response format from OpenAI');
      }

      return data;
    });

    const analysisText = analysisResult.choices[0].message.content;
    logWithMetrics('Analysis text received', { 
      length: analysisText.length,
      preview: analysisText.substring(0, 100) + '...'
    });
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(analysisText);
      logWithMetrics('Successfully parsed JSON analysis', {
        hasOverallScore: typeof parsed.overallScore === 'number',
        hasComplianceScore: typeof parsed.complianceScore === 'number',
        hasChecklistFeedback: !!parsed.checklistFeedback,
        hasRecommendations: Array.isArray(parsed.recommendations),
        hasDetailedFeedback: !!parsed.detailedFeedback
      });
      return parsed;
    } catch (parseError) {
      logWithMetrics('Failed to parse AI response as JSON', { 
        error: parseError.message,
        textPreview: analysisText.substring(0, 500)
      });
      // Fallback structured response
      return createFallbackResponse(reportTitle);
    }

  } catch (error) {
    logWithMetrics('Error in analyzeReportDirect', { 
      error: error.message,
      status: error.status,
      code: error.code
    });
    return createFallbackResponse(reportTitle);
  }
}

function createFallbackResponse(reportTitle) {
  logWithMetrics('Creating fallback response', { reportTitle });
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