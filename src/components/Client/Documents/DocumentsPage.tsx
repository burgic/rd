// src/components/Client/DocumentsPage.tsx
import React, { useState } from 'react';
import DocumentUpload from 'components/Common/Documents/DocumentUpload';
import DocumentList from 'components/Common/Documents/DocumentList';
import DocumentDetails from 'components/Common/Documents/DocumentDetails';
import { ClientDocument } from '../../../@types/documents';

const DocumentsPage: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<ClientDocument | null>(null);
  
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Document Management</h1>
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-gray-600">
            Upload and manage documents.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showUpload ? 'Cancel Upload' : 'Upload New Document'}
        </button>
      </div>
      
      {showUpload && (
        <div className="mb-8">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      )}
      
      <div className="grid gap-6">
        <DocumentList 
          key={refreshKey}
          onSelectDocument={handleDocumentSelect}
        />
      </div>
      
      {selectedDocument && selectedDocument.processed && selectedDocument.extracted_data && (
        <DocumentDetails document={selectedDocument} onApplyData={handleApplyData} />
      )}
    </div>
  );
};

export default DocumentsPage;
