// src/App.tsx
import React from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SignIn from './components/Auth/SignIn';
import SignUp from './components/Auth/SignUp';
import ResetPassword from './components/Auth/ResetPassword';
import CompanyDescriptionForm from './components/RDAssessment/CompanyDescriptionForm';
import AssessmentResults from './components/RDAssessment/AssessmentResults';
import AssessmentHistory from './components/RDAssessment/AssessmentHistory';
import AssessmentViewer from './components/RDAssessment/AssessmentViewer';
import Navbar from './components/Navbar';
import AdviserDashboard from './components/Adviser/Dashboard';
import Insights from './components/Adviser/Insights';
import Reports from './components/Adviser/Reports';
import CreateClient from './components/Adviser/CreateClient';
import ClientDashboard from './components/Client/Dashboard';
import { AuthProvider } from './context/AuthContext';
import IncomeForm from './components/Client/IncomeForm';
import ExpenditureForm from './components/Client/ExpenditureForm';
import AssetsForm from './components/Client/AssetsForm';
import LiabilitiesForm from './components/Client/LiabilitiesForm';
import GoalsForm from './components/Client/GoalsForm';
import ClientDetails from './components/Adviser/ClientDetails';
import ProfileForm from './components/Client/ProfileForm';
import DocumentsPage from 'components/Client/Documents/DocumentsPage';
import AdviserDocumentsPage from 'components/Adviser/Documents/AdviserDocumentsPage';
import SuitabilityReportGenerator from './components/Adviser/SuitabilityReportGenerator';
import './styles.css';
import './styles/globals.css';
import Chatbot from './components/Chat/Chat';
import RiskAssessmentForm from 'components/Client/Risk/RiskAssessmentForm';
import TranscriptForm from './components/CallTranscripts/TranscriptForm';
import TranscriptAnalysis from './components/CallTranscripts/TranscriptAnalysis';
import TranscriptHistory from './components/CallTranscripts/TranscriptHistory';
import TranscriptViewer from './components/CallTranscripts/TranscriptViewer';
import OverviewPage from './components/Dashboard/OverviewPage';
import { Toaster } from 'react-hot-toast';



  const App: React.FC = () => {

    return (
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Overview/Dashboard Route */}
            <Route 
              path="/overview" 
              element={
                <ProtectedRoute>
                  <OverviewPage />
                </ProtectedRoute>
              } 
            />
            
            {/* R&D Assessment Routes */}
            <Route 
              path="/rd-form" 
              element={
                <ProtectedRoute requiredRole="client">
                  <CompanyDescriptionForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rd-assessment" 
              element={
                <ProtectedRoute requiredRole="client">
                  <AssessmentResults />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rd-history" 
              element={
                <ProtectedRoute requiredRole="client">
                  <AssessmentHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rd-assessment/:assessmentId" 
              element={
                <ProtectedRoute requiredRole="client">
                  <AssessmentViewer />
                </ProtectedRoute>
              } 
            />

            {/* Call Transcript Analysis Routes */}
            <Route 
              path="/call-transcript-form" 
              element={
                <ProtectedRoute>
                  <TranscriptForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call-transcript-analysis" 
              element={
                <ProtectedRoute>
                  <TranscriptAnalysis />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call-transcript-history" 
              element={
                <ProtectedRoute>
                  <TranscriptHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call-transcript/:analysisId" 
              element={
                <ProtectedRoute>
                  <TranscriptViewer />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/adviser/adviser-dashboard" element={<ProtectedRoute requiredRole = "adviser"> <AdviserDashboard /> </ProtectedRoute>} />
            <Route path="/adviser/create-client" element={<ProtectedRoute requiredRole = "adviser"> <CreateClient /></ProtectedRoute>} />
            <Route
              path="/adviser/client/:clientId"
              element={
                <ProtectedRoute requiredRole="adviser">
                  <ClientDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/adviser/client/:clientId/insights"
              element={
                <ProtectedRoute requiredRole="adviser">
                  <Insights />
                </ProtectedRoute>
              }
            />
            <Route
              path="/adviser/client/:clientId/reports"
              element={
                <ProtectedRoute requiredRole="adviser">
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/adviser/client/:clientId/suitability-report"
              element={
                <ProtectedRoute requiredRole="adviser">
                  <SuitabilityReportGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/adviser/client/:clientId/documents"
              element={
                <ProtectedRoute requiredRole="adviser">
                  <AdviserDocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/client/client-dashboard" element={<ProtectedRoute requiredRole = "client"><ClientDashboard /></ProtectedRoute>} />
            <Route
              path="/client/income"
              element={
                <ProtectedRoute requiredRole="client">
                  <IncomeForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/expenditure"
              element={
                <ProtectedRoute requiredRole="client">
                  <ExpenditureForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/profile"
              element={
                <ProtectedRoute requiredRole="client">
                  <ProfileForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/assets"
              element={
                <ProtectedRoute requiredRole="client">
                  <AssetsForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/liabilities"
              element={
                <ProtectedRoute requiredRole="client">
                  <LiabilitiesForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/liabilities:id"
              element={
                <ProtectedRoute requiredRole="client">
                  <LiabilitiesForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/goals"
              element={
                <ProtectedRoute requiredRole="client">
                  <GoalsForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/chat"
              element={
                <ProtectedRoute requiredRole="client">
                  <Chatbot /> 
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/risk-assessment"
              element={
                <ProtectedRoute requiredRole="client">
                  <RiskAssessmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/documents"
              element={
                <ProtectedRoute requiredRole="client">
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
      
    );
  };

  export default App;
