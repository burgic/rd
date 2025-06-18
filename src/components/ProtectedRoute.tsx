// src/components/ProtectedRoute.tsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode; // Changed from JSX.Element to React.ReactNode
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);

  console.log('ProtectedRoute check:', { 
    loading, 
    hasUser: !!user, 
    userEmail: user?.email, 
    userRole: user?.user_metadata?.role, 
    requiredRole 
  });

  // Show loading state while auth is being determined
  if (loading) {
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

  if (requiredRole && user.user_metadata?.role !== requiredRole) {
    console.log('ProtectedRoute: role mismatch, redirecting to sign in');
    return <Navigate to="/" replace/>;
  }

  console.log('ProtectedRoute: access granted');
  return <>{children}</>; // Use fragment to wrap children
};

export default ProtectedRoute;
