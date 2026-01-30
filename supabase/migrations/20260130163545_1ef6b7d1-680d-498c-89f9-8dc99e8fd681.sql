-- Create helper functions for RLS policies

-- Create a security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = _user_id
      AND role IN ('Admin', 'HR')
  )
$$;

-- Create a security definer function to get profile id from auth user
CREATE OR REPLACE FUNCTION public.get_profile_id(_auth_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = _auth_user_id
  LIMIT 1
$$;

-- Users can read their own leave requests
CREATE POLICY "Users can read own leaves" 
  ON public.leaves 
  FOR SELECT 
  USING (
    "userId" = public.get_profile_id(auth.uid())
  );

-- Admins and HR can read all leave requests
CREATE POLICY "Admins can read all leaves" 
  ON public.leaves 
  FOR SELECT 
  USING (
    public.has_admin_role(auth.uid())
  );

-- Only Admins and HR can update leave requests (approve/reject)
CREATE POLICY "Only admins can update leaves" 
  ON public.leaves 
  FOR UPDATE 
  USING (
    public.has_admin_role(auth.uid())
  );