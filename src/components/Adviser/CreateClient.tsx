// src/components/Adviser/CreateClient.tsx
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const CreateClient: React.FC = () => {
  const navigate = useNavigate();
  const { user } = React.useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    password: '', // temporary password that client can change later
  });
  
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      if (!user?.id) {
        throw new Error('Adviser not authenticated');
      }
  
      console.log('Attempting to create client with:', {
        email: clientData.email,
        name: clientData.name,
        adviserID: user.id
      });
  
      // Check existing users in both auth.users and profiles
      const { data: authUsersCheck, error: authCheckError } = await supabase.auth.admin.listUsers();
      
      console.log('Auth users check:', {
        users: authUsersCheck?.users.map(u => u.email),
        error: authCheckError
      });
  
      const existingAuthUser = authUsersCheck?.users.find(
        authUser => authUser.email && authUser.email.toLowerCase() === clientData.email.toLowerCase()
      );
  
      if (existingAuthUser) {
        console.error('Existing auth user found:', existingAuthUser);
        throw new Error('A user with this email already exists in the authentication system');
      }
  
      // Check profiles table
      const { data: existingProfiles, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', clientData.email)
        .eq('role', 'client');
  
      console.log('Existing profiles check:', {
        profiles: existingProfiles,
        error: profileCheckError
      });
  
      if (existingProfiles && existingProfiles.length > 0) {
        console.error('Existing profile found:', existingProfiles);
        throw new Error('A client with this email already exists');
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: clientData.email,
        password: clientData.password,
        email_confirm: true, // Automatically confirm the email
        user_metadata: {
          role: 'client',
          name: clientData.name,
          adviser_id: user.id
        }
      });
  
      if (error) {
        console.error('User creation error:', error);
        throw error;
      }
  
      if (!data.user) {
        throw new Error('No user data returned');
      }
  
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: clientData.email,
          name: clientData.name,
          role: 'client',
          adviser_id: user.id,
          created_at: new Date().toISOString()
        });
  
      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Attempt to delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
  
      alert(
        `Client account created successfully!\n\n` +
        `Email: ${clientData.email}\n` +
        `Temporary Password: ${clientData.password}\n\n` +
        `Please provide these credentials to your client.`
      );
      
      navigate('/adviser/adviser-dashboard');
  
    } catch (err: any) {
      console.error('Full error object:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD IMPORT CLIENT FROM API OPTIONS FUNCTIONALITY

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 md:p-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/adviser/adviser-dashboard')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Client</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateClient} className="space-y-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Client Name
            </label>
            <input
              type="text"
              value={clientData.name}
              onChange={(e) => setClientData({...clientData, name: e.target.value})}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={clientData.email}
              onChange={(e) => setClientData({...clientData, email: e.target.value})}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Temporary Password
            </label>
            <input
              type="password"
              value={clientData.password}
              onChange={(e) => setClientData({...clientData, password: e.target.value})}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter temporary password"
            />
            <p className="text-sm text-gray-500 mt-1">
              Client will be able to change this after first login
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors
                ${loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {loading ? 'Creating Client...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClient;