// src/components/Auth/SignUp.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
// import { sign } from 'crypto';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'adviser' | 'client'>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('An account with this email already exists.');
      }

      // Create new user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('Sign up successful but no user data returned');
      }

      alert(
        `Sign-up successful! \n\n` +
        `Please note your credentials:\n` +
        `Email: ${email}\n` +
        `Password: ${password}\n\n` +
        `You can now sign in with these credentials.`
      );

      navigate('/');

    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-sm">
        <div>
          <h2 className="text-center text-3xl font-semibold text-gray-900">
            Create Account
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'adviser' | 'client')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="client">Client</option>
                <option value="adviser">Adviser</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                ${loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

/*
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface Adviser {
  id: string;
  name: string;
  email: string;
}

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'adviser' | 'client'>('client');
  const [adviserId, setAdviserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisers, setAdvisers] = useState<Adviser[]>([]);
  const navigate = useNavigate();

  // Fetch advisers when component mounts
  useEffect(() => {
    const fetchAdvisers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'adviser');

      if (error) {
        console.error('Error fetching advisers:', error);
        return;
      }

      setAdvisers(data || []);
    };

    fetchAdvisers();
  }, []);

  const handleSignUp = async () => {
    // Basic validation
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }
  
    if (role === 'client' && !adviserId) {
      setError('Please select an adviser');
      return;
    }
  
    setLoading(true);
    setError(null);
  
    try {
      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
        },
      });
  
      if (error) throw error;
  
      // Verify we have a user ID
      if (!data.user?.id) {
        throw new Error('No user ID received from signup');
      }
  
      // Create profile with proper null handling for adviser_id
      const profileData = {
        id: data.user.id,
        email: data.user.email,
        name,
        role,
        adviser_id: role === 'client' ? adviserId : null,
        created_at: new Date().toISOString(),
      };
  
      console.log('Creating profile with data:', profileData); // For debugging
  
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);
  
      if (profileError) {
        console.error('Error creating profile:', profileError);
        await supabase.auth.signOut();
        throw new Error('Failed to create user profile');
      }

      if (role === 'adviser') {
        navigate('/adviser/adviser-dashboard');
      } else {
        navigate('/client/client-dashboard');
      }
  
      console.log('Sign-up and profile creation successful:', data);
      alert('Sign-up successful! Please check your email to confirm your account.');
    } catch (error: any) {
      console.error('Error in signup process:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      <label>
        Name:
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <br />
      <label>
        Email:
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <br />
      <label>
        Password:
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <br />
      <label>
        Role:
        <select 
          value={role} 
          onChange={(e) => {
            setRole(e.target.value as 'adviser' | 'client');
            if (e.target.value === 'adviser') {
              setAdviserId(''); // Clear adviser selection if switching to adviser
            }
          }}
          required
        >
          <option value="client">Client</option>
          <option value="adviser">Adviser</option>
        </select>
      </label>
      <br />
      {role === 'client' && (
        <label>
          Select Adviser:
          <select
            value={adviserId}
            onChange={(e) => setAdviserId(e.target.value)}
            required
          >
            <option value="">Choose an adviser</option>
            {advisers.map((adviser) => (
              <option key={adviser.id} value={adviser.id}>
                {adviser.name} ({adviser.email})
              </option>
            ))}
          </select>
        </label>
      )}
      <br />
      <button 
        onClick={handleSignUp} 
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </div>
  );
};

export default SignUp;

*/