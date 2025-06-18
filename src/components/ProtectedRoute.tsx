// src/components/ProtectedRoute.tsx
import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode; // Changed from JSX.Element to React.ReactNode
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching user role:', error);
            // Fallback to user metadata
            setUserRole(user.user_metadata?.role || null);
          } else {
            setUserRole(profile?.role || user.user_metadata?.role || null);
          }
        } catch (error) {
          console.error('Error in fetchUserRole:', error);
          setUserRole(user.user_metadata?.role || null);
        }
      } else {
        setUserRole(null);
      }
      setRoleLoading(false);
    };

    if (!loading) {
      fetchUserRole();
    }
  }, [user, loading]);

  console.log('ProtectedRoute check:', { 
    loading, 
    roleLoading,
    hasUser: !!user, 
    userEmail: user?.email, 
    userRole, 
    userMetadataRole: user?.user_metadata?.role,
    requiredRole 
  });

  // Show loading state while auth or role is being determined
  if (loading || roleLoading) {
    console.log('ProtectedRoute: showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: no user, redirecting to sign in');
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    console.log('ProtectedRoute: role mismatch, redirecting to sign in', { userRole, requiredRole });
    return <Navigate to="/" replace/>;
  }

  console.log('ProtectedRoute: access granted');
  return <>{children}</>; // Use fragment to wrap children
};

export default ProtectedRoute;
