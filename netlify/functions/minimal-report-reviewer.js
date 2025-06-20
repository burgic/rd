exports.handler = async (event) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    };
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers };
    }
  
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        headers, 
        body: JSON.stringify({ error: 'Method not allowed' }) 
      };
    }
  
    try {
      console.log('Minimal function called');
      
      const { userId, reportContent, reportTitle, reportType } = JSON.parse(event.body);
      console.log('Request data:', { userId, reportTitle, contentLength: reportContent?.length, reportType });
  
      // Create minimal analysis response (no OpenAI call)
      const analysis = {
        overallScore: 75,
        complianceScore: 70,
        checklistFeedback: {
          advance: {"score": 75, "strengths": ["Report received"], "weaknesses": ["Minimal analysis"]},
          uncertainty: {"score": 70, "strengths": ["Content provided"], "weaknesses": ["Limited assessment"]},
          professionals: {"score": 65, "strengths": ["Document processed"], "weaknesses": ["Cannot assess fully"]},
          process: {"score": 60, "strengths": ["Report submitted"], "weaknesses": ["Need full review"]},
          aifAlignment: {"score": 55, "strengths": ["Basic check"], "weaknesses": ["Requires detailed analysis"]},
          costs: {"score": 50, "strengths": ["Structure noted"], "weaknesses": ["No cost verification"]},
          payeCap: {"score": 50, "strengths": ["Acknowledged"], "weaknesses": ["No calculation"]},
          grants: {"score": 50, "strengths": ["Considered"], "weaknesses": ["No grant details"]},
          ct600: {"score": 50, "strengths": ["Format check"], "weaknesses": ["No reconciliation"]},
          evidence: {"score": 45, "strengths": ["Content exists"], "weaknesses": ["Evidence not verified"]},
          conduct: {"score": 60, "strengths": ["Professional format"], "weaknesses": ["Standards not checked"]},
          fraudTribunal: {"score": 55, "strengths": ["Basic review"], "weaknesses": ["No tribunal analysis"]},
          esoteric: {"score": 50, "strengths": ["Standard approach"], "weaknesses": ["No specialized review"]}
        },
        recommendations: [
          "This is a minimal test analysis",
          "Full AI analysis would provide detailed feedback",
          "Contact specialist for comprehensive review"
        ],
        detailedFeedback: `Minimal analysis completed for "${reportTitle}". This is a test response to verify the function is working. Content length: ${reportContent?.length || 0} characters.`
      };
  
      const responseBody = {
        analysis,
        reviewId: 'test-' + Date.now(),
        reportTitle,
        timestamp: new Date().toISOString()
      };
  
      console.log('Response prepared, size:', JSON.stringify(responseBody).length);
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseBody)
      };
  
    } catch (error) {
      console.error('Minimal function error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        })
      };
    }
  };