// src/components/Auth/SignIn.tsx
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
// import { useAuthRedirect } from '../../hooks/useAuthRedirect';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [showResendButton, setShowResendButton] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // setShowResendButton(false);

    try {
      // Attempt sign in first
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        if (signInError.message.includes('Database error')) {
          throw new Error('Service temporarily unavailable. Please try again in a few moments.');
        }
        throw signInError;
      }

      if (!data.user) {
        throw new Error('Sign in successful but no user data returned');
      }

      // After successful sign in, get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile check error:', profileError);
        // If profile doesn't exist, use metadata role or default to client
        const userRole = data.user.user_metadata?.role || 'client';
        if (userRole === 'adviser') {
          navigate('/adviser/adviser-dashboard');
        } else {
          navigate('/client/client-dashboard');
        }
        return;
      }

      // Get role from profile or user metadata
      const userRole = profile?.role || data.user.user_metadata?.role || 'client';

      if (userRole === 'adviser') {
        navigate('/adviser/adviser-dashboard');
      } else {
        navigate('/client/client-dashboard');
      }

    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /*
  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) throw resendError;

      setError('Confirmation email resent. Please check your inbox.');
      setShowResendButton(false);
    } catch (error: any) {
      console.error('Resend error:', error);
      setError('Failed to resend confirmation email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

*/

return (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-sm">
      <div>
        <h2 className="text-center text-3xl font-semibold text-gray-900">
          Sign In
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-md">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
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
              placeholder="Enter your password"
            />
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-gray-600">
          <button
            type="button"
            onClick={async () => {
              if (email) {
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) {
                  setError('Failed to send reset email');
                } else {
                  setError('Password reset email sent! Check your inbox.');
                }
              } else {
                setError('Please enter your email first');
              }
            }}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </button>
        </p>
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  </div>
);

}

export default SignIn;

