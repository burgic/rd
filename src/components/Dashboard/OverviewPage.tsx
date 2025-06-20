import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

const OverviewPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      }
      setLoading(false);
    };

    fetchUserRole();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  const clientFeatures = [
    {
      title: 'R&D Tax Credits Assessment',
      description: 'Get AI-powered analysis of your R&D activities for HMRC compliance',
      icon: '🔬',
      actions: [
        { label: 'New Assessment', path: '/rd-form', primary: true },
        { label: 'View History', path: '/rd-history' }
      ]
    },
    {
      title: 'R&D Report Reviewer',
      description: 'Upload Word/text reports for AI analysis against HMRC criteria and compliance standards',
      icon: '📋',
      actions: [
        { label: 'Upload Report', path: '/report-upload', primary: true },
        { label: 'Review History', path: '/report-history' }
      ]
    },
    {
      title: 'Direct Report Review',
      description: 'Paste report content directly for instant AI analysis against HMRC\'s 14-point compliance criteria',
      icon: '🔍',
      actions: [
        { label: 'Analyze Report Text', path: '/report-form', primary: true },
        { label: 'Review History', path: '/report-history' }
      ]
    },
    {
      title: 'Call Transcript Analysis',
      description: 'AI-powered analysis of client calls to extract R&D insights',
      icon: '📞',
      actions: [
        { label: 'Analyze New Call', path: '/call-transcript-form', primary: true },
        { label: 'Call History', path: '/call-transcript-history' }
      ]
    },
    {
      title: 'Documents',
      description: 'Upload and manage your R&D and financial documents',
      icon: '📄',
      actions: [
        { label: 'Manage Documents', path: '/client/documents', primary: true }
      ]
    }
  ];

  const adviserFeatures = [
    {
      title: 'R&D Report Reviewer',
      description: 'Upload and analyze client R&D reports against HMRC criteria for compliance',
      icon: '📋',
      actions: [
        { label: 'Upload Report', path: '/report-upload', primary: true },
        { label: 'Review History', path: '/report-history' }
      ]
    },
    {
      title: 'Direct Report Review',
      description: 'Paste client report content directly for instant AI analysis against HMRC compliance criteria',
      icon: '🔍',
      actions: [
        { label: 'Analyze Report Text', path: '/report-form', primary: true },
        { label: 'Review History', path: '/report-history' }
      ]
    },
    {
      title: 'Call Transcript Analysis',
      description: 'AI-powered analysis of client calls to extract R&D insights',
      icon: '📞',
      actions: [
        { label: 'Analyze New Call', path: '/call-transcript-form', primary: true },
        { label: 'Call History', path: '/call-transcript-history' }
      ]
    },
    {
      title: 'Client Management',
      description: 'Manage your client portfolio and relationships',
      icon: '👥',
      actions: [
        { label: 'Client Dashboard', path: '/adviser/adviser-dashboard', primary: true },
        { label: 'Add New Client', path: '/adviser/create-client' }
      ]
    },
    {
      title: 'R&D Assessment (Legacy)',
      description: 'Traditional R&D assessment tools for client use',
      icon: '🔬',
      actions: [
        { label: 'New Assessment', path: '/rd-form' },
        { label: 'Assessment History', path: '/rd-history' }
      ]
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate insights and reports for your clients',
      icon: '📈',
      actions: [
        { label: 'View Clients', path: '/adviser/adviser-dashboard', primary: true }
      ]
    }
  ];

  const features = userRole === 'adviser' ? adviserFeatures : clientFeatures;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to R&D Assessment Platform
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            {userRole === 'adviser' 
              ? 'Professional tools for R&D tax credit analysis and client management'
              : 'Your comprehensive R&D tax credits and financial management platform'
            }
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <span className="mr-2">👤</span>
            Logged in as: {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'} - {user.email}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              {/* Feature Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{feature.icon}</span>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                </div>
              </div>

              {/* Feature Content */}
              <div className="p-6">
                <p className="text-gray-600 mb-6">{feature.description}</p>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {feature.actions.map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      onClick={() => navigate(action.path)}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        action.primary
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats or Recent Activity */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {userRole === 'adviser' ? 'Professional Features' : 'Getting Started'}
          </h2>
          
          {userRole === 'adviser' ? (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">AI-Powered</div>
                <div className="text-gray-600">Call transcript analysis with HMRC compliance checking</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-2">Client Portal</div>
                <div className="text-gray-600">Comprehensive client management and reporting tools</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 mb-2">Automated</div>
                <div className="text-gray-600">Streamlined R&D assessment and documentation</div>
              </div>
            </div>
          ) : (
                         <div className="grid md:grid-cols-2 gap-8">
               <div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-3">New to R&D Tax Credits?</h3>
                 <p className="text-gray-600 mb-4">
                   Start with our R&D assessment tool to evaluate your clients eligibility for tax credits. 
                   Our AI-powered analysis will help identify qualifying activities and estimate potential value.
                 </p>
                 <button
                   onClick={() => navigate('/rd-form')}
                   className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                 >
                   Start Assessment →
                 </button>
               </div>
               <div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-3">Analyze Call Transcripts</h3>
                 <p className="text-gray-600 mb-4">
                   Upload call transcripts to extract R&D-relevant information and get AI-powered 
                   insights for better documentation and compliance.
                 </p>
                 <button
                   onClick={() => navigate('/call-transcript-form')}
                   className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                 >
                   Analyze Call →
                 </button>
               </div>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p>Need help? Get in touch.</p>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage; 