-- Documents Table Schema
-- This table stores metadata for files uploaded to the Supabase storage bucket

CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- File metadata
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL, -- Original name before any processing
    file_path TEXT NOT NULL, -- Path in storage bucket
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL, -- MIME type
    file_extension TEXT, -- .pdf, .docx, etc.
    
    -- Document categorization
    document_type TEXT DEFAULT 'general' CHECK (document_type IN (
        'general', 
        'rd_report', 
        'hmrc_submission', 
        'project_documentation', 
        'technical_specification',
        'financial_document',
        'call_transcript',
        'analysis_report'
    )),
    
    -- Content and processing
    content_preview TEXT, -- First 500 chars for search/preview
    extracted_text TEXT, -- Full extracted text content (for searchability)
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 
        'processing', 
        'completed', 
        'failed'
    )),
    
    -- Relationships
    related_assessment_id UUID, -- Link to rd_assessments if applicable
    related_transcript_id UUID, -- Link to call_transcript_analyses if applicable
    related_report_review_id UUID, -- Link to report_reviews if applicable
    
    -- Tags and metadata
    tags JSONB DEFAULT '[]'::jsonb, -- Searchable tags
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata (client info, project details, etc.)
    
    -- Security and access
    is_public BOOLEAN DEFAULT false,
    access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'client', 'adviser', 'public')),
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN(metadata);

-- Full text search index on extracted content
CREATE INDEX IF NOT EXISTS idx_documents_content_search ON documents USING GIN(to_tsvector('english', COALESCE(extracted_text, '') || ' ' || COALESCE(content_preview, '') || ' ' || file_name));

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own documents
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- Advisers can view all documents (assuming they have role 'adviser')
CREATE POLICY "Advisers can view all documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'adviser'
        )
    );

-- Public documents can be viewed by anyone (for shared reports, etc.)
CREATE POLICY "Public documents viewable by all" ON documents
    FOR SELECT USING (is_public = true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to documents table
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON documents TO authenticated;
GRANT ALL ON documents TO service_role;

-- Create a view for easy document searching
CREATE OR REPLACE VIEW documents_search AS
SELECT 
    d.*,
    to_tsvector('english', COALESCE(d.extracted_text, '') || ' ' || COALESCE(d.content_preview, '') || ' ' || d.file_name) as search_vector,
    p.role as user_role
FROM documents d
LEFT JOIN profiles p ON d.user_id = p.id;

-- Create a function to search documents
CREATE OR REPLACE FUNCTION search_documents(
    search_query TEXT,
    user_filter UUID DEFAULT NULL,
    document_type_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    document_type TEXT,
    content_preview TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.file_name,
        d.document_type,
        d.content_preview,
        d.uploaded_at,
        ts_rank(d.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM documents_search d
    WHERE 
        (user_filter IS NULL OR d.user_id = user_filter)
        AND (document_type_filter IS NULL OR d.document_type = document_type_filter)
        AND d.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, d.uploaded_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket policies (run these in Supabase dashboard)
-- These are SQL comments showing what policies to create in the Storage section:

/*
-- Storage bucket policies for 'documents' bucket:

-- 1. Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Allow users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow advisers to view all files
CREATE POLICY "Advisers can view all files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'adviser'
    )
);
*/ 