// src/api/chatbot.ts
import { NextApiRequest, NextApiResponse } from 'next';
import generateBotResponse from '../components/Chat/Bot';
import { supabase } from '../services/supabaseClient';

const rateLimitMap = new Map();

interface ChatbotRequestBody {
    userId: string;
    query: string;
  }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, query } = req.body;

  if (!userId || !query) {
    return res.status(400).json({ error: 'Missing userId or query in the request body.' });
  }

  // Rate-limiting logic
  const now = Date.now();
  if (rateLimitMap.has(userId)) {
    const { lastRequest, requestCount } = rateLimitMap.get(userId);

    if (now - lastRequest < 60000) { // 1-minute window
      if (requestCount >= 5) { // Limit to 5 requests per minute
        return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
      }
      rateLimitMap.set(userId, { lastRequest: now, requestCount: requestCount + 1 });
    } else {
      rateLimitMap.set(userId, { lastRequest: now, requestCount: 1 });
    }
  } else {
    rateLimitMap.set(userId, { lastRequest: now, requestCount: 1 });
  }

  try {
    // Fetch user profile to determine agent type and preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agent_type')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }

    // Customize agent type for OpenAI prompt
    const agentType = profile?.agent_type || 'default';

    // Generate bot response
    const response = await generateBotResponse(userId, query, agentType);
    res.status(200).json({ response });
  } catch (error) {
    console.error('Error processing chatbot request:', error);
    res.status(500).json({ error: 'Failed to process the request.' });
  }
}