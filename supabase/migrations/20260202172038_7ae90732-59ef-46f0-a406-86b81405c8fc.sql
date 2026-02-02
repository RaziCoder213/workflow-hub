-- Create authenticator entries table for TOTP management
CREATE TABLE public.authenticator_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  app_name TEXT NOT NULL,
  login_identity TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.authenticator_entries ENABLE ROW LEVEL SECURITY;

-- Users can only read their own entries
CREATE POLICY "Users can read own authenticator entries"
ON public.authenticator_entries
FOR SELECT
USING (user_id = get_profile_id(auth.uid()));

-- Users can insert their own entries
CREATE POLICY "Users can insert own authenticator entries"
ON public.authenticator_entries
FOR INSERT
WITH CHECK (user_id = get_profile_id(auth.uid()));

-- Users can delete their own entries
CREATE POLICY "Users can delete own authenticator entries"
ON public.authenticator_entries
FOR DELETE
USING (user_id = get_profile_id(auth.uid()));

-- Admins can view all entries
CREATE POLICY "Admins can view all authenticator entries"
ON public.authenticator_entries
FOR SELECT
USING (has_admin_role(auth.uid()));

-- Create user_points table for tracking points from reviews
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  awarded_by TEXT,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  review_id UUID REFERENCES public.performance_reviews(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Users can read their own points
CREATE POLICY "Users can read own points"
ON public.user_points
FOR SELECT
USING (user_id = get_profile_id(auth.uid()));

-- Admins can manage all points
CREATE POLICY "Admins can manage points"
ON public.user_points
FOR ALL
USING (has_admin_role(auth.uid()));