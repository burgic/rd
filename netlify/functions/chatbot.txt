// netlify/functions/chatbot.ts
/*
import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_DATABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const handler: Handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { userId, query } = JSON.parse(event.body || '{}')

    if (!userId || !query) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or query' })
      }
    }

    // Fetch user's financial data from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw new Error(`Error fetching profile: ${profileError.message}`)
    }

    // Generate response based on user's data and query
    // For now, returning a simple response
    const response = `Hello! I understand you're asking about: "${query}". 
                     I can see your profile and help you with financial planning.`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Add CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST'
      },
      body: JSON.stringify({ response })
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

export { handler }

*/