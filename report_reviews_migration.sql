-- Report Reviews Table Migration
-- This script safely updates the existing table and policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Users can insert own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Users can update own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Users can delete own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Advisers can view all report reviews" ON report_reviews;

-- Create the table if it doesn't exist (simplified version without document_id)
CREATE TABLE IF NOT EXISTS report_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    report_type TEXT DEFAULT 'rd_report',
    content_preview TEXT,
    
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    strengths JSONB DEFAULT '[]'::jsonb,
    improvements JSONB DEFAULT '[]'::jsonb,
    hmrc_compliance JSONB DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    detailed_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add document_id column if it doesn't exist (for future use)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'report_reviews' AND column_name = 'document_id') THEN
        ALTER TABLE report_reviews ADD COLUMN document_id UUID;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_report_reviews_user_id ON report_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_report_reviews_created_at ON report_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_reviews_overall_score ON report_reviews(overall_score);
CREATE INDEX IF NOT EXISTS idx_report_reviews_document_id ON report_reviews(document_id);

-- Enable Row Level Security (RLS)
ALTER TABLE report_reviews ENABLE ROW LEVEL SECURITY;

-- Create fresh RLS policies
CREATE POLICY "Users can view own report reviews" ON report_reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own report reviews" ON report_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own report reviews" ON report_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own report reviews" ON report_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_report_reviews_updated_at ON report_reviews;
CREATE TRIGGER update_report_reviews_updated_at 
    BEFORE UPDATE ON report_reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON report_reviews TO authenticated;
GRANT ALL ON report_reviews TO service_role;

-- Display success message
DO $$ 
BEGIN
    RAISE NOTICE 'Report reviews table migration completed successfully!';
END $$; 