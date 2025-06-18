-- Fix for RLS Policy Infinite Recursion Issue
-- Run these commands in your Supabase SQL Editor

-- First, disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Allow advisers to read their clients' profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Allow reading adviser profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Advisers can read all profiles" ON public.profiles;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies without circular references
-- 1. Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 4. Simple approach for advisers - allow them to read profiles where they are the adviser
CREATE POLICY "Advisers can read client profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can read their own profile
  id = auth.uid()
  OR
  -- User can read profiles where they are listed as the adviser
  adviser_id = auth.uid()
);

-- 5. Allow reading of adviser profiles (for client selection, etc.)
CREATE POLICY "Allow reading adviser profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'adviser');

-- Alternative ultra-simple approach if above still causes issues:
-- Uncomment the lines below and comment out the policies above for testing

-- CREATE POLICY "Allow all authenticated users to read profiles"
-- ON public.profiles
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- CREATE POLICY "Allow users to manage own profile"
-- ON public.profiles
-- FOR ALL
-- TO authenticated
-- USING (id = auth.uid())
-- WITH CHECK (id = auth.uid()); 