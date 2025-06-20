-- Fix RLS policies for report_reviews table to work with service role

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Users can insert own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Users can update own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Users can delete own report reviews" ON report_reviews;
DROP POLICY IF EXISTS "Service role can manage all report reviews" ON report_reviews;

-- Create new policies that work with both authenticated users and service role
CREATE POLICY "Users can view own report reviews" ON report_reviews
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can insert own report reviews" ON report_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can update own report reviews" ON report_reviews
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can delete own report reviews" ON report_reviews
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Ensure service role has full access
CREATE POLICY "Service role full access" ON report_reviews
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Display success message
DO $$ 
BEGIN
    RAISE NOTICE 'RLS policies updated successfully for service role access!';
END $$; 