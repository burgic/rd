// Simple test function to verify basic connectivity
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
      console.log('Test function called');
      console.log('Event body:', event.body);
      
      const body = JSON.parse(event.body || '{}');
      console.log('Parsed body:', body);
      
      const response = {
        message: 'Test function working',
        timestamp: new Date().toISOString(),
        receivedData: body,
        testAnalysis: {
          overallScore: 75,
          complianceScore: 70,
          checklistFeedback: {
            advance: {"score": 75, "strengths": ["Test strength"], "weaknesses": ["Test weakness"]}
          },
          recommendations: ["Test recommendation"],
          detailedFeedback: "This is a test analysis response."
        }
      };
      
      console.log('Returning response:', JSON.stringify(response).substring(0, 200));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
      };
      
    } catch (error) {
      console.error('Test function error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: error.message,
          stack: error.stack 
        })
      };
    }
  };