-- R&D Tax Credits Assessment - Simple Database Setup
-- Run this in your Supabase SQL Editor

-- STEP 1: Drop all existing RLS policies on profiles table only
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

-- STEP 2: Clean up the profiles table
-- Temporarily disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop the adviser_id column and related constraints
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS adviser_id CASCADE;

-- First, let's see what roles currently exist (for debugging)
-- You can comment this out after running once
DO $$
DECLARE
    role_record RECORD;
BEGIN
    RAISE NOTICE 'Current roles in profiles table:';
    FOR role_record IN SELECT DISTINCT role, COUNT(*) as count FROM public.profiles GROUP BY role
    LOOP
        RAISE NOTICE 'Role: %, Count: %', COALESCE(role_record.role, 'NULL'), role_record.count;
    END LOOP;
END $$;

-- Drop the existing constraint first (in case it exists)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Set ALL users to 'user' role (handles any possible role value including NULL)
UPDATE public.profiles SET role = 'user';

-- Make sure the role column is NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN role SET NOT NULL;

-- Now add the constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user'));

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create simple RLS policies for profiles
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

-- STEP 4: Create the rd_assessments table
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

-- STEP 5: Clean up any remaining policies on non-existent tables (safe approach)
-- This will only execute if the tables exist, otherwise it will be ignored
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Get all policy names that might reference non-existent tables
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (tablename IN ('incomes', 'expenditures', 'assets', 'liabilities', 'goals', 'risk_assessments'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$; 