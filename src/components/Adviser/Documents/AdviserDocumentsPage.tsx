// src/components/Adviser/AdviserDocumentsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';
import DocumentUpload from 'components/Common/Documents/DocumentUpload';
import DocumentList from 'components/Common/Documents/DocumentList';
import DocumentDetails from 'components/Common/Documents/DocumentDetails';
import { ClientDocument } from '../../../@types/documents';

const AdviserDocumentsPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<ClientDocument | null>(null);
  const [clientDetails, setClientDetails] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!clientId) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', clientId)
          .single();
        
        if (error) throw error;
        setClientDetails(data);
      } catch (error) {
        console.error('Error fetching client details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClientDetails();
  }, [clientId]);
  
  const handleUploadSuccess = () => {
    setShowUpload(false);
    setRefreshKey(prev => prev + 1);
  };
  
  const handleDocumentSelect = (document: ClientDocument) => {
    setSelectedDocument(document);
  };

  const handleApplyData = (id: string) => {
    // Insert logic to apply data to the client profile
    alert('Data applied to client profile');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!clientId || !clientDetails) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-3xl mx-auto my-8">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600">Client not found or you don't have permission to view this client's documents.</p>
        <button 
          onClick={() => navigate('/adviser/adviser-dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button 
          onClick={() => navigate(`/adviser/client/${clientId}`)}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← Back to Client Details
        </button>
        
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Documents for {clientDetails.name}</h1>
            <p className="text-gray-600">{clientDetails.email}</p>
          </div>
          
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showUpload ? 'Cancel Upload' : 'Upload Document for Client'}
          </button>
        </div>
      </div>
      
      {showUpload && (
        <div className="mb-8">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-blue-800">
              <strong>Note:</strong> You are uploading a document on behalf of {clientDetails.name}.
              This document will appear in the client's documents list.
            </p>
          </div>
          <DocumentUpload 
            onUploadSuccess={handleUploadSuccess} 
            clientId={clientId}
            adviserMode={true}
          />
        </div>
      )}
      
      <div className="grid gap-6">
        <DocumentList 
          key={refreshKey}
          clientId={clientId}
          onSelectDocument={handleDocumentSelect}
          adviserMode={true}
        />
      </div>
      
      {selectedDocument && selectedDocument.processed && selectedDocument.extracted_data && (
        <DocumentDetails document={selectedDocument} onApplyData={handleApplyData} />
      )}
    </div>
  );
};

export default AdviserDocumentsPage;
