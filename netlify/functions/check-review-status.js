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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const reviewId = event.queryStringParameters?.reviewId;
    
    if (!reviewId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing reviewId parameter' })
      };
    }

    console.log('Checking status for review:', reviewId);

    const { data: review, error } = await supabase
      .from('report_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Review not found' })
      };
    }

    // Check if analysis is complete
    const isComplete = review.overall_score !== null && review.compliance_score !== null;
    const isError = review.detailed_feedback && review.detailed_feedback.startsWith('Analysis failed:');

    if (isError) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: review.detailed_feedback
        })
      };
    }

    if (isComplete) {
      // Build analysis object from database
      const analysis = {
        overallScore: review.overall_score,
        complianceScore: review.compliance_score,
        checklistFeedback: review.hmrc_compliance || {},
        recommendations: review.recommendations || [],
        detailedFeedback: review.detailed_feedback
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'completed',
          analysis,
          reviewId: review.id,
          reportTitle: review.file_name,
          timestamp: review.created_at
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'processing',
          message: 'Analysis still in progress...'
        })
      };
    }

  } catch (error) {
    console.error('Status check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check status' })
    };
  }
};