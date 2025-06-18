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
          R&D Assessment
        </Link>
        <ul className="navbar-menu">
        {user && (
          <li className="navbar-item">
            <Link to="/rd-form" className="navbar-link">
              New Assessment
            </Link>
          </li>
          )}
          {user && (
          <li className="navbar-item">
            <Link to="/rd-history" className="navbar-link">
              History
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
