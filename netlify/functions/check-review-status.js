const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const { reviewId } = event.queryStringParameters || {};

  if (!reviewId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing reviewId' }) };

  try {
    const { data, error } = await supabase
      .from('report_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (error || !data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Review not found' }) };

    if (data.status === 'pending') {
      return { statusCode: 202, headers, body: JSON.stringify({ status: 'processing', reviewId }) };
    }

    if (data.status === 'error') {
      return { statusCode: 500, headers, body: JSON.stringify({ status: 'error', message: data.detailed_feedback || 'Analysis failed' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'completed',
        analysis: {
          overallScore: data.overall_score,
          complianceScore: data.compliance_score,
          checklistFeedback: data.hmrc_compliance,
          recommendations: data.recommendations,
          detailedFeedback: data.detailed_feedback
        },
        reviewId: data.id,
        timestamp: data.created_at
      })
    };
  } catch (error) {
    console.error('Error checking review status:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to check status' }) };
  }
};