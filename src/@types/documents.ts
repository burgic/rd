// src/@types/documents.ts

export type DocumentType = 'bank_statement' | 'investment_statement' | 'utility_bill' | 'identity_document' | 'tax_return' | 'payslip' | 'pension_statement' | 'insurance_policy' | 'mortgage_statement' | 'credit_report' | 'other' | 'unknown';

export interface ExtractedDocumentData {
  // Common extracted data
  postcodes?: string[];
  addresses?: string[];
  phoneNumbers?: string[];
  emails?: string[];
  nationalInsurance?: string[];
  monetaryValues?: string[];
  dates?: string[];
  rawText?: string;
  
  // Document-specific data
  accountNumber?: string;
  sortCode?: string;
  portfolioValue?: number;
  transactions?: Transaction[];
  
  // Any other extracted data
  [key: string]: any;
}

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category?: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_url?: string;
  file_size?: number;
  upload_date: string;
  processed: boolean;
  processed_date?: string;
  document_type?: DocumentType;
  extracted_data?: ExtractedDocumentData;
  uploaded_by?: string; // Can be client_id or adviser_id
  signedUrl?: string;
}

export interface DocumentListProps {
  clientId?: string; // Optional: if used in adviser view
  showExtractedData?: boolean;
  onSelectDocument?: (document: ClientDocument) => void;
  adviserMode?: boolean;
  limit?: number;
  className?: string;
}

export interface DocumentUploadProps {
  onUploadSuccess?: (fileUrl: string, fileType: string, fileName: string) => void;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  bucketName?: string;
  clientId?: string; // Optional: for adviser uploading on behalf of client
  adviserMode?: boolean;
}
