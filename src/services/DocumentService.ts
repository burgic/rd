// src/services/DocumentService.ts
import { supabase } from './supabaseClient';
import { ClientDocument, ExtractedDocumentData } from '../@types/documents';

export class DocumentService {
  /**
   * Fetch all documents for a specific client
   * @param clientId The ID of the client whose documents to fetch
   * @returns Array of financial documents
   */
  static async getDocuments(clientId: string): Promise<ClientDocument[]> {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('upload_date', { ascending: false });
        
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }
  
  /**
   * Get a single document by ID
   * @param documentId The ID of the document to retrieve
   * @returns A document object if found
   */
  static async getDocumentById(documentId: string): Promise<ClientDocument | null> {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('id', documentId)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }
  
  /**
   * Create a signed URL for a document
   * @param filePath The path of the file in storage
   * @param expiresIn Expiry time in seconds (default: 3600 = 1 hour)
   * @returns A signed URL for accessing the document
   */
  static async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, expiresIn);
        
      if (error) throw error;
      
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }
  
  /**
   * Delete a document and its associated file
   * @param documentId The ID of the document to delete
   * @returns True if deletion was successful
   */
  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // First get the document to retrieve the file path
      const document = await this.getDocumentById(documentId);
      
      if (!document || !document.file_path) {
        throw new Error('Document not found or missing file path');
      }
      
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);
        
      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Continue anyway to ensure DB record is removed
      }
      
      // Delete the record from the database
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);
        
      if (dbError) throw dbError;
      
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
  
  /**
   * Process a document to extract relevant data
   * @param documentId The ID of the document to process
   * @returns The updated document with extracted data
   */
  static async processDocument(documentId: string): Promise<ClientDocument> {
    try {
      // Get the document
      const document = await this.getDocumentById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Call the serverless function to process the document
      const response = await fetch('/.netlify/functions/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          clientId: document.client_id,
          filePath: document.file_path,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Document processing failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the document in the database
      const { data, error } = await supabase
        .from('client_documents')
        .update({
          processed: true,
          processed_date: new Date().toISOString(),
          document_type: result.documentType,
          extracted_data: result.extractedData
        })
        .eq('id', documentId)
        .select()
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
  
  /**
   * Apply extracted document data to a client's profile
   * @param clientId The ID of the client
   * @param documentId The ID of the document
   * @param extractedData The data extracted from the document
   * @returns Success status
   */
  static async applyExtractedData(
    clientId: string, 
    documentId: string, 
    extractedData: ExtractedDocumentData,
    documentType?: string
  ): Promise<boolean> {
    try {
      // Call the serverless function to apply the extracted data
      const response = await fetch('/.netlify/functions/apply-extracted-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          documentId,
          extractedData,
          documentType
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to apply data: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (error) {
      console.error('Error applying extracted data:', error);
      throw error;
    }
  }
  
  /**
   * Upload a document for a client
   * @param file The file to upload
   * @param clientId The ID of the client the document belongs to
   * @param uploaderId The ID of the user uploading the document
   * @param documentType Optional document type
   * @param notes Optional notes about the document
   * @returns The created document record
   */
  static async uploadDocument(
    file: File, 
    clientId: string, 
    uploaderId: string,
    documentType?: string,
    notes?: string
  ): Promise<ClientDocument> {
    try {
      // Create a unique file path
      const fileExtension = file.name.split('.').pop() || '';
      const timestamp = new Date().getTime();
      const filePath = `${clientId}/${timestamp}_${file.name}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) throw uploadError;
      
      // Create a signed URL for access
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);
        
      if (signedUrlError) {
        console.warn('Error creating signed URL:', signedUrlError);
        // Continue anyway as the file was uploaded successfully
      }
      
      // Insert document record
      const { data, error } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          file_name: file.name,
          file_type: fileExtension,
          file_path: filePath,
          file_url: signedUrlData?.signedUrl || '',
          upload_date: new Date().toISOString(),
          uploaded_by: uploaderId,
          processed: false,
          document_type: documentType || null,
          notes: notes || null
        })
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to create document record');
      
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }
}