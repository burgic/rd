-- Simplified Report Reviews Table Schema
-- This is a minimal version without document_id to avoid schema issues

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

-- Grant necessary permissions
GRANT ALL ON report_reviews TO authenticated;
GRANT ALL ON report_reviews TO service_role; 