// src/components/Navbar.tsx

import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import './Navbar.css'; // We'll create this file for specific navbar styles

const Navbar: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      alert('Failed to sign out. Please try again.');
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Workflow
        </Link>
        <ul className="navbar-menu">
        {user && user.user_metadata.role === 'client' && (
          <li className="navbar-item">
            <Link to="/client/client-dashboard" className="navbar-link">
              Dashboard
            </Link>
          </li>
          )}
          {user && user.user_metadata.role === 'client' && (
          <li className="navbar-item">
            <Link to="/client/profile" className="navbar-link">
              Profile
            </Link>
          </li>
          )}
          {user && user.user_metadata.role === 'client' && (
          <li className="navbar-item">
            <Link to="/chat/chat" className="navbar-link">
              Chat
            </Link>
          </li>
          )}
          {user && user.user_metadata.role === 'adviser' && (
            <li className="navbar-item">
              <Link to="/adviser/adviser-dashboard" className="navbar-link">
                Adviser
              </Link>
            </li>
          )}
          {!user ? (
            <li className="navbar-item">
              <Link to="/" className="navbar-link">
                Sign In
              </Link>
            </li>
          ) : (
            <li className="navbar-item">
              <button onClick={handleSignOut} className="navbar-button">
                Sign Out
              </button>
            </li>
          )}
          
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
