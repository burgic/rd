-- R&D Tax Credits Assessment - Database Cleanup and Setup
-- Run this in your Supabase SQL Editor

-- STEP 1: Drop all existing RLS policies that might conflict
DROP POLICY IF EXISTS "Allow users to select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Advisers can select their clients' profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow reading adviser profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Advisers can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Advisers can read client profiles" ON public.profiles;

-- Drop policies on financial tables (only if tables exist)
DO $$
BEGIN
    -- Drop policies on incomes table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incomes') THEN
        DROP POLICY IF EXISTS "Clients can manage their own data" ON public.incomes;
        DROP POLICY IF EXISTS "Advisers can access their clients' data" ON public.incomes;
    END IF;
    
    -- Drop policies on expenditures table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenditures') THEN
        DROP POLICY IF EXISTS "Clients can manage their own data" ON public.expenditures;
        DROP POLICY IF EXISTS "Advisers can access their clients' data" ON public.expenditures;
    END IF;
    
    -- Drop policies on assets table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        DROP POLICY IF EXISTS "Clients can manage their own data" ON public.assets;
        DROP POLICY IF EXISTS "Advisers can access their clients' data" ON public.assets;
    END IF;
    
    -- Drop policies on liabilities table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'liabilities') THEN
        DROP POLICY IF EXISTS "Clients can manage their own data" ON public.liabilities;
        DROP POLICY IF EXISTS "Advisers can access their clients' data" ON public.liabilities;
    END IF;
    
    -- Drop policies on goals table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
        DROP POLICY IF EXISTS "Clients can manage their own data" ON public.goals;
        DROP POLICY IF EXISTS "Advisers can access their clients' data" ON public.goals;
    END IF;
END $$;

-- STEP 2: Drop financial tables we don't need for R&D assessment
-- (Keep them if you want to preserve data, or drop if starting fresh)
-- DROP TABLE IF EXISTS public.risk_assessments CASCADE;
-- DROP TABLE IF EXISTS public.goals CASCADE;
-- DROP TABLE IF EXISTS public.liabilities CASCADE;
-- DROP TABLE IF EXISTS public.assets CASCADE;
-- DROP TABLE IF EXISTS public.expenditures CASCADE;
-- DROP TABLE IF EXISTS public.incomes CASCADE;

-- STEP 3: Clean up the profiles table
-- Temporarily disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop the adviser_id column and related constraints
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS adviser_id CASCADE;

-- Update the role constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user'));

-- Set existing users to 'user' role
UPDATE public.profiles SET role = 'user' WHERE role IN ('client', 'adviser');

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create simple RLS policies for profiles
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- STEP 5: Create the rd_assessments table
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
CREATE POLICY "Users can view own assessments"
ON public.rd_assessments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create assessments"
ON public.rd_assessments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own assessments"
ON public.rd_assessments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own assessments"
ON public.rd_assessments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create indexes for performance
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
DROP TRIGGER IF EXISTS update_rd_assessments_updated_at ON public.rd_assessments;
CREATE TRIGGER update_rd_assessments_updated_at 
BEFORE UPDATE ON public.rd_assessments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 