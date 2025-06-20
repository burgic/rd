// src/components/Navbar.tsx

import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import './Navbar.css'; // We'll create this file for specific navbar styles

const Navbar: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
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

    fetchUserRole();
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      alert('Failed to sign out. Please try again.');
    } else {
      navigate('/');
    }
  };

  if (roleLoading) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">
            R&D Assessment
          </Link>
          <ul className="navbar-menu">
            <li className="navbar-item">
              <span className="navbar-link">Loading...</span>
            </li>
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          R&D Assessment
        </Link>
        <ul className="navbar-menu">
          {user && userRole === 'client' && (
            <>
              <li className="navbar-item">
                <Link to="/overview" className="navbar-link">
                  Overview
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/rd-form" className="navbar-link">
                  New Assessment
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/rd-history" className="navbar-link">
                  Assessment History
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/client/client-dashboard" className="navbar-link">
                  Dashboard
                </Link>
              </li>
            </>
          )}
          {user && userRole === 'adviser' && (
            <>
              <li className="navbar-item">
                <Link to="/overview" className="navbar-link">
                  Overview
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/adviser/adviser-dashboard" className="navbar-link">
                  Dashboard
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/call-transcript-form" className="navbar-link">
                  Analyze Call
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/call-transcript-history" className="navbar-link">
                  Call History
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/adviser/create-client" className="navbar-link">
                  Add Client
                </Link>
              </li>
            </>
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
                Sign Out ({userRole})
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
