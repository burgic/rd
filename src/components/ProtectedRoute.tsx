// src/components/ProtectedRoute.tsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode; // Changed from JSX.Element to React.ReactNode
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.user_metadata.role !== requiredRole) {
    return <Navigate to="/" replace/>;
  }

  return <>{children}</>; // Use fragment to wrap children
};

export default ProtectedRoute;
