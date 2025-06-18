// src/components/Common/Documents/ClientDocumentsList.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { File, FileText, Image, PenTool, AlertTriangle, CheckCircle, Eye, Trash2, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ClientDocument } from '../../../@types/documents';



interface ClientDocumentsListProps {
  clientId: string;
  compact?: boolean;
  limit?: number;
  showActions?: boolean;
  className?: string;
  onViewAll?: () => void;
}

const ClientDocumentsList: React.FC<ClientDocumentsListProps> = ({
  clientId,
  compact = false,
  limit = 5,
  showActions = true,
  className = '',
  onViewAll
}) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('upload_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      // Find the document to get its file path
      const doc = documents.find((d) => d.id === docId);
      
      if (!doc) return;
      
      // First delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);
      
      if (storageError) throw storageError;
      
      // Then delete the record from the database
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', docId);
      
      if (dbError) throw dbError;
      
      // Update state
      setDocuments(documents.filter((d) => d.id !== docId));
      
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const getFileIcon = (fileType: string) => {
    const lowerType = fileType.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(lowerType)) {
      return <Image className="h-4 w-4 text-purple-500" />;
    } else if (lowerType === 'pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (['doc', 'docx'].includes(lowerType)) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    } else if (['xls', 'xlsx', 'csv'].includes(lowerType)) {
      return <FileText className="h-4 w-4 text-green-600" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDocumentTypeLabel = (type?: string) => {
    if (!type) return 'Unknown';
    
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className} p-4`}>
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow ${className} p-4`}>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow ${className} p-4`}>
        <h3 className="text-lg font-semibold mb-2">Documents</h3>
        <div className="text-center py-6 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">No documents uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Documents</h3>
        {onViewAll && documents.length > 0 && (
          <button 
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            View All <ArrowUpRight className="ml-1 h-3 w-3" />
          </button>
        )}
      </div>

      <div className="divide-y">
        {documents.map((doc) => (
          <div key={doc.id} className={`${compact ? 'p-2' : 'p-4'} hover:bg-gray-50`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                {getFileIcon(doc.file_type)}
                <div className={`ml-3 ${compact ? 'truncate' : ''}`}>
                  <p className={`font-medium text-gray-800 ${compact ? 'text-sm' : ''} truncate`}>{doc.file_name}</p>
                  <div className="flex items-center mt-1">
                    {!compact && (
                      <span className="text-xs text-gray-500 mr-2">
                        {formatDate(doc.upload_date)}
                      </span>
                    )}
                    {doc.document_type && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {getDocumentTypeLabel(doc.document_type)}
                      </span>
                    )}
                    {doc.processed && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" /> Processed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {showActions && (
                <div className="flex space-x-2 ml-2">
                  <a 
                    href={doc.file_url}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                    title="View document"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {onViewAll && documents.length > 0 && (
        <div className="p-2 border-t text-center">
          <button 
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View All Documents
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientDocumentsList;