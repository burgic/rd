// src/components/Common/Documents/DocumentList.tsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabaseClient';
import { FileText, Eye, Download, BarChart2, Trash2, AlertCircle, CheckCircle, Loader2, FileCheck } from 'lucide-react';
import { ClientDocument, DocumentType, Transaction, DocumentListProps } from '../../../@types/documents';

const DocumentList: React.FC<DocumentListProps> = ({
  clientId,
  showExtractedData = true,
  onSelectDocument,
  adviserMode = false,
  limit = 10,
  className = '',
}) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchDocuments();
  }, [clientId, user?.id]);
  
  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Determine which client ID to use
      const targetClientId = clientId || user?.id;
      
      if (!targetClientId) {
        throw new Error('No client ID available');
      }
      
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', targetClientId)
        .order('upload_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      if (data) {
        setDocuments(data);
        
        // Generate signed URLs for each document
        const urls: Record<string, string> = {};
        for (const doc of data) {
          if (doc.file_path) {
            try {
              const { data: urlData, error: urlError } = await supabase.storage
                .from('documents')
                .createSignedUrl(doc.file_path, 3600); // 1 hour expiry
              
              if (!urlError && urlData?.signedUrl) {
                urls[doc.id] = urlData.signedUrl;
              } else {
                console.warn(`Failed to get URL for ${doc.file_name}:`, urlError?.message);
              }
            } catch (err) {
              console.error(`Error getting URL for ${doc.file_name}:`, err);
            }
          }
        }
        setSignedUrls(urls);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => {
      if (searchTerm === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        doc.file_name.toLowerCase().includes(searchLower) ||
        (doc.document_type || '').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.upload_date).getTime();
        const dateB = new Date(b.upload_date).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortBy === 'name') {
        return sortDirection === 'asc'
          ? a.file_name.localeCompare(b.file_name)
          : b.file_name.localeCompare(a.file_name);
      }
      
      if (sortBy === 'type') {
        const typeA = a.document_type || '';
        const typeB = b.document_type || '';
        return sortDirection === 'asc'
          ? typeA.localeCompare(typeB)
          : typeB.localeCompare(typeA);
      }
      
      return 0;
    });
  
  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      setDeletingId(docId);
      
      // Find the document to get its file path
      const doc = documents.find((d) => d.id === docId);
      
      if (!doc) return;
      
      // First delete the file from storage
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_path]);
        
        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Continue anyway to ensure DB record is removed
        }
      }
      
      // Then delete the record from the database
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', docId);
      
      if (dbError) throw dbError;
      
      // Update state
      setDocuments(documents.filter((d) => d.id !== docId));
      
      // Clear selection if the deleted document was selected
      if (selectedDocId === docId) {
        setSelectedDocId(null);
      }
      
      // Remove signed URL
      if (signedUrls[docId]) {
        const newUrls = { ...signedUrls };
        delete newUrls[docId];
        setSignedUrls(newUrls);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };
  
  const handleProcessDocument = async (docId: string) => {
    try {
      setProcessingId(docId);
      
      const doc = documents.find((d) => d.id === docId);
      
      if (!doc) return;
      
      // Call serverless function to process document
      const response = await fetch('/.netlify/functions/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: docId,
          clientId: doc.client_id,
          filePath: doc.file_path,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the document in the UI
      setDocuments((docs) =>
        docs.map((d) => {
          if (d.id === docId) {
            return {
              ...d,
              processed: true,
              processed_date: new Date().toISOString(),
              document_type: result.documentType,
              extracted_data: result.extractedData,
            };
          }
          return d;
        })
      );
      
      // If the processed document was selected, update the selection to show new data
      if (selectedDocId === docId && onSelectDocument) {
        const updatedDoc = documents.find(d => d.id === docId);
        if (updatedDoc) {
          onSelectDocument({
            ...updatedDoc,
            processed: true,
            processed_date: new Date().toISOString(),
            document_type: result.documentType,
            extracted_data: result.extractedData,
            signedUrl: signedUrls[docId]
          });
        }
      }
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to process document');
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleApplyData = async (docId: string) => {
    try {
      const doc = documents.find((d) => d.id === docId);
      if (!doc || !doc.extracted_data) return;
      
      // Call function to apply extracted data to client profile
      const response = await fetch('/.netlify/functions/apply-extracted-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: doc.client_id,
          documentId: docId,
          extractedData: doc.extracted_data,
          documentType: doc.document_type
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to apply data: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      alert('Document data applied to client profile successfully');
    } catch (error) {
      console.error('Error applying data:', error);
      alert('Failed to apply document data');
    }
  };
  
  const handleViewDocument = (document: ClientDocument) => {
    const url = signedUrls[document.id];
    if (url) {
      window.open(url, '_blank');
    } else if (document.file_path) {
      // If URL not in state, try to generate it on-demand
      const generateAndOpenUrl = async () => {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(document.file_path, 3600);
            
          if (error) throw error;
          
          if (data?.signedUrl) {
            // Save for future reference
            setSignedUrls(prev => ({
              ...prev,
              [document.id]: data.signedUrl
            }));
            // Open in new tab
            window.open(data.signedUrl, '_blank');
          }
        } catch (err) {
          console.error('Error generating signed URL:', err);
          alert('Unable to view document at this time');
        }
      };
      
      generateAndOpenUrl();
    }
  };
  
  const handleSelectDocument = (document: ClientDocument) => {
    setSelectedDocId(document.id);
    
    if (onSelectDocument) {
      onSelectDocument({
        ...document,
        signedUrl: signedUrls[document.id]
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const getDocumentTypeLabel = (type?: DocumentType) => {
    switch (type) {
      case 'bank_statement':
        return 'Bank Statement';
      case 'investment_statement':
        return 'Investment Statement';
      case 'utility_bill':
        return 'Utility Bill';
      case 'identity_document':
        return 'ID Document';
      case 'tax_return':
        return 'Tax Return';
      case 'payslip':
        return 'Payslip';
      case 'pension_statement':
        return 'Pension Statement';
      case 'insurance_policy':
        return 'Insurance Policy';
      case 'mortgage_statement':
        return 'Mortgage Statement';
      case 'credit_report':
        return 'Credit Report';
      default:
        return 'Document';
    }
  };
  
  const getFileIcon = (fileType: string) => {
    const lowerType = fileType.toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', 'jpg', 'jpeg', 'png', 'gif'].some(ext => lowerType.includes(ext))) {
      return (
        <svg
          className="w-6 h-6 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    } else if (lowerType.includes('pdf')) {
      return (
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    } else if (['doc', 'docx'].some(ext => lowerType.includes(ext))) {
      return (
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-6 h-6 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    }
  };
  
  if (isLoading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-semibold">Documents</h3>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          
          <div className="flex">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-l-md"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="type">Type</option>
            </select>
            
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 rounded-r-md"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
      
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">
            {searchTerm ? 'No matching documents found' : 'No documents uploaded yet'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-1 gap-6">
          {/* Document list */}
          <div className="border rounded-lg overflow-hidden">
            <h4 className="p-3 bg-gray-50 border-b font-medium">Uploaded Files</h4>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition ${selectedDocId === doc.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectDocument(doc)}
                >
                  <div className="flex items-start">
                    <div className="mr-3">
                      {getFileIcon(doc.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{doc.file_name}</p>
                      <p className="text-sm text-gray-500">{formatDate(doc.upload_date)}</p>
                      <div className="flex items-center mt-1">
                        {doc.processed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {doc.document_type ? getDocumentTypeLabel(doc.document_type) : 'Processed'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Not Processed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex flex-col space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDocument(doc);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id);
                        }}
                        className={`text-sm text-red-600 hover:text-red-800 flex items-center ${
                          deletingId === doc.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={deletingId === doc.id}
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end space-x-2">
                    {!doc.processed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProcessDocument(doc.id);
                        }}
                        className={`text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center ${
                          processingId === doc.id ? 'opacity-50 cursor-wait' : ''
                        }`}
                        disabled={processingId === doc.id}
                      >
                        {processingId === doc.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <FileCheck className="w-3 h-3 mr-1" />
                            Process Document
                          </>
                        )}
                      </button>
                    )}
                    
                    {doc.processed && doc.extracted_data && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyData(doc.id);
                        }}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Apply to Profile
                      </button>
                    )}
                    
                    {adviserMode && doc.processed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to insights or analysis page
                          navigate(`/adviser/document/${doc.id}/insights`);
                        }}
                        className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                      >
                        <BarChart2 className="w-3 h-3 mr-1" />
                        View Insights
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;