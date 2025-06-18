-- R&D Tax Credits Assessment Database Schema
-- Run this in your Supabase SQL Editor

-- Create the rd_assessments table
CREATE TABLE IF NOT EXISTS public.rd_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_description text NOT NULL,
  eligibility_score integer NOT NULL CHECK (eligibility_score >= 0 AND eligibility_score <= 100),
  eligible boolean NOT NULL,
  reasoning text NOT NULL,
  recommendations jsonb DEFAULT '[]'::jsonb,
  next_steps jsonb DEFAULT '[]'::jsonb,
  estimated_value text,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Enable RLS on the rd_assessments table
ALTER TABLE public.rd_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rd_assessments
-- Users can only see their own assessments
CREATE POLICY "Users can view own assessments"
ON public.rd_assessments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own assessments
CREATE POLICY "Users can create assessments"
ON public.rd_assessments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own assessments
CREATE POLICY "Users can update own assessments"
ON public.rd_assessments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own assessments
CREATE POLICY "Users can delete own assessments"
ON public.rd_assessments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS rd_assessments_user_id_idx ON public.rd_assessments(user_id);
CREATE INDEX IF NOT EXISTS rd_assessments_created_at_idx ON public.rd_assessments(created_at DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_rd_assessments_updated_at 
BEFORE UPDATE ON public.rd_assessments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Keep existing profiles table structure with client/adviser roles
-- The rd_assessments table works with any authenticated user regardless of role 