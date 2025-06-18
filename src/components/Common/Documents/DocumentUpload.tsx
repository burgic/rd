// src/components/Common/Documents/EnhancedDocumentUpload.tsx
import React, { useState, useRef, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabaseClient';
import { UploadCloud, X, AlertCircle, CheckCircle, Loader2, File, Upload } from 'lucide-react';


export interface DocumentUploadProps {
  onUploadSuccess: (url: string, fileType: string, fileName: string) => void;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  bucketName?: string;
  clientId?: string;
  adviserMode?: boolean;
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadSuccess,
  allowedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.csv', '.xls', '.xlsx'],
  maxFileSizeMB = 10,
  bucketName = 'documents',
  clientId,
  adviserMode = false,
  className = '',
}) => {
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [documentNote, setDocumentNote] = useState<string>('');
  
  const financialDocumentTypes = [
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'investment_statement', label: 'Investment Statement' },
    { value: 'utility_bill', label: 'Utility Bill' },
    { value: 'identity_document', label: 'ID Document' },
    { value: 'tax_return', label: 'Tax Return' },
    { value: 'payslip', label: 'Payslip' },
    { value: 'pension_statement', label: 'Pension Statement' },
    { value: 'insurance_policy', label: 'Insurance Policy' },
    { value: 'mortgage_statement', label: 'Mortgage Statement' },
    { value: 'credit_report', label: 'Credit Report' },
    { value: 'other', label: 'Other Document' }
  ];
  
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };
  
  const validateAndSetFile = (file: File) => {
    setError(null);
    
    // Check file type
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedFileTypes.includes(fileExtension)) {
      setError(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`);
      return;
    }
    
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSizeMB) {
      setError(`File size exceeds ${maxFileSizeMB}MB limit`);
      return;
    }
    
    setFile(file);
  };
  
  const clearFile = () => {
    setFile(null);
    setDocumentType('');
    setDocumentNote('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const simulateProgress = () => {
    // Simulate upload progress for better UX
    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return prev;
        }
        return prev + 10;
      });
    }, 300);

    return () => clearInterval(timer);
  };
  
  const uploadFile = async () => {
    if (!file || !user) return;
    
    // Validate document type selection
    if (!documentType) {
      setError('Please select a document type');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Start simulated progress
      const stopSimulation = simulateProgress();
      
      // Determine the client ID to use
      const targetClientId = adviserMode && clientId ? clientId : user.id;
      
      // Create a unique file path including client ID for better organization
      const fileExtension = file.name.split('.').pop() || '';
      const timestamp = new Date().getTime();
      const sanitizedFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filePath = `${targetClientId}/${timestamp}_${sanitizedFileName}`;
      
      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Stop simulated progress
      stopSimulation();
      setUploadProgress(95);
      
      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      // Record the file in the client_documents table 
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: targetClientId,
          file_name: file.name,
          file_type: fileExtension,
          file_path: filePath,
          file_url: publicUrl,
          upload_date: new Date().toISOString(),
          uploaded_by: user.id,
          processed: false,
          document_type: documentType,
          notes: documentNote || null
        });
      
      if (dbError) throw dbError;
      
      // Complete the progress
      setUploadProgress(100);
      
      // Notify parent component of successful upload
      if (onUploadSuccess) {
        onUploadSuccess(publicUrl, fileExtension, file.name);
      }
      
      // Clear the form after a short delay
      setTimeout(() => {
        setIsUploading(false);
        clearFile();
      }, 1000);
      
    } catch (error) {
      setIsUploading(false);
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    }
  };

  const displayFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <File className="h-6 w-6 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-6 w-6 text-blue-600" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <File className="h-6 w-6 text-green-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <File className="h-6 w-6 text-purple-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };
  
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <UploadCloud className="mr-2 h-5 w-5" />
        Document Upload
      </h3>
      
      {/* Drop zone */}
      {!file ? (
        <div 
          className="border-2 border-dashed rounded-lg p-8 text-center mb-4 cursor-pointer
            border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept={allowedFileTypes.join(',')}
          />
          
          <div>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-lg text-gray-600 mb-1">Drag and drop files here</p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: {allowedFileTypes.join(', ')} (Max: {maxFileSizeMB}MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          {/* Selected file preview */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {getFileIcon(file.name)}
                <div className="ml-3">
                  <p className="font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{displayFileSize(file.size)}</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="text-gray-500 hover:text-red-500 transition-colors"
                disabled={isUploading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Document type selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isUploading}
              required
            >
              <option value="">-- Select Document Type --</option>
              {financialDocumentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Notes field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={documentNote}
              onChange={(e) => setDocumentNote(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Add any relevant notes about this document"
              disabled={isUploading}
            />
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Upload progress */}
      {isUploading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Upload success message */}
      {uploadProgress === 100 && !isUploading && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>Document uploaded successfully!</span>
        </div>
      )}
      
      {/* Upload button */}
      {file && (
        <button
          onClick={uploadFile}
          disabled={!file || isUploading || !documentType}
          className={`w-full px-4 py-2 rounded-lg flex items-center justify-center ${
            !file || isUploading || !documentType
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              Upload Document
            </>
          )}
        </button>
      )}
      
      {/* Select another file button */}
      {!file && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
        >
          <UploadCloud className="h-5 w-5 mr-2" />
          Select Document
        </button>
      )}
    </div>
  );
};

export default DocumentUpload;