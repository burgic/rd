-- Report Reviews Table Schema
-- This table stores R&D report analyses and reviews

CREATE TABLE IF NOT EXISTS report_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    report_type TEXT DEFAULT 'rd_report',
    content_preview TEXT,
    
    -- Document relationship
    document_id UUID, -- Link to documents table if uploaded through storage
    
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_report_reviews_user_id ON report_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_report_reviews_created_at ON report_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_reviews_overall_score ON report_reviews(overall_score);

-- Enable Row Level Security (RLS)
ALTER TABLE report_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own report reviews
CREATE POLICY "Users can view own report reviews" ON report_reviews
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own report reviews
CREATE POLICY "Users can insert own report reviews" ON report_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own report reviews
CREATE POLICY "Users can update own report reviews" ON report_reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own report reviews
CREATE POLICY "Users can delete own report reviews" ON report_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Advisers can see all report reviews (assuming they have role 'adviser')
CREATE POLICY "Advisers can view all report reviews" ON report_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'adviser'
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to report_reviews table
CREATE TRIGGER update_report_reviews_updated_at 
    BEFORE UPDATE ON report_reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON report_reviews TO authenticated;
GRANT ALL ON report_reviews TO service_role; 