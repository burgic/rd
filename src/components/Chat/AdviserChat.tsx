import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatResponse {
    response: string;
    error?: string;
  }

interface ClientData {
  id: string;
  name: string;
  email: string;
  financialData: {
    incomes: any[];
    expenditures: any[];
    assets: any[];
    liabilities: any[];
    goals: any[];
    kyc_data?: any;
  };
}

const AdviserChat = ({ clientId }: { clientId: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [error, setError] = useState<string | null>(null)
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        // Fetch client profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .single();

        if (profileError) throw profileError;

        // Fetch all financial data in parallel
        const [
          { data: incomes },
          { data: expenditures },
          { data: assets },
          { data: liabilities },
          { data: goals },
          { data: kyc }
        ] = await Promise.all([
          supabase.from('incomes').select('*').eq('client_id', clientId),
          supabase.from('expenditures').select('*').eq('client_id', clientId),
          supabase.from('assets').select('*').eq('client_id', clientId),
          supabase.from('liabilities').select('*').eq('client_id', clientId),
          supabase.from('goals').select('*').eq('client_id', clientId),
          supabase.from('kyc_data').select('*').eq('profile_id', clientId)
        ]);

        setClientData({
          ...profile,
          financialData: {
            incomes: incomes || [],
            expenditures: expenditures || [],
            assets: assets || [],
            liabilities: liabilities || [],
            goals: goals || [],
            kyc_data: kyc?.[0] || null
          }
        });
      } catch (error) {
        console.error('Error fetching client data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !clientData) return;

    const message = {
      role: 'user' as const,
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const payload = {
        message: newMessage,
        clientData: clientData.financialData,
        messageHistory: messages.slice(-5),
        userId: user?.id,
        clientId
      };

    try {
      const response = await fetch('/.netlify/functions/adviser-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get raw text first to see what we're receiving
      const text = await response.text();

      // Try to parse if it looks like JSON
      let data: ChatResponse;
      try {
      data = JSON.parse(text);
      } catch (e) {
      throw new Error(`Invalid JSON response: ${text.slice(0, 100)}...`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }

    } catch (error) {
        console.error('Error sending message:', error);
        setError((error as Error).message);
    }

  };

  if (isLoading && !clientData) {
    return <div className="flex justify-center items-center h-64">Loading client data...</div>;
  }

  if (messages.length !== 0) {
    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
        
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[400px] p-4 border rounded-lg">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <div className="text-sm opacity-75 mb-1">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-50 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="animate-pulse">Processing...</div>
            </div>
          )}
        </div>
  
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={"Ask about your client's financial situation..."}
            className="flex-1 p-3 border rounded-lg resize-none h-20"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 h-20"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={"Ask about your client's financial situation..."}
            className="flex-1 p-3 border rounded-lg resize-none h-20"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 h-20"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    );
  };
};

export default AdviserChat;

  /*
  const sendMessage = async () => {
    if (!newMessage.trim() || !clientData) return;

    const message = {
      role: 'user' as const,
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const payload = {
        message: newMessage,
        clientData: clientData.financialData,
        messageHistory: messages.slice(-5),
        userId: user?.id,
        clientId
      };

        console.log('Sending to:', '/.netlify/functions/adviser-chat');
        console.log('Payload:', payload);

    try {
      const response = await fetch('/.netlify/functions/adviser-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Response status:', response.status);

      // Get raw text first to see what we're receiving
      const text = await response.text();
      console.log('Raw response:', text);

      // Try to parse if it looks like JSON
      let data: ChatResponse;
      try {
      data = JSON.parse(text);
      } catch (e) {
      throw new Error(`Invalid JSON response: ${text.slice(0, 100)}...`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
      setIsSuitabilityReport(false);
    }

    } catch (error) {
        console.error('Error sending message:', error);
        setError((error as Error).message);
    }

  };

  if (isLoading && !clientData) {
    return <div className="flex justify-center items-center h-64">Loading client data...</div>;
  }

  if (messages.length !== 0) {
    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
        
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[400px] p-4 border rounded-lg">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <div className="text-sm opacity-75 mb-1">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-50 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="animate-pulse">Processing...</div>
            </div>
          )}
        </div>
  
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={"Ask about your client's financial situation..."}
            className="flex-1 p-3 border rounded-lg resize-none h-20"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 h-20"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={"Ask about your client's financial situation..."}
            className="flex-1 p-3 border rounded-lg resize-none h-20"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 h-20"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    );
  };
};

export default AdviserChat;

*/