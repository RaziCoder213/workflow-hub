-- Create official_holidays table for company-wide holidays
CREATE TABLE public.official_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  holiday_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.official_holidays ENABLE ROW LEVEL SECURITY;

-- Anyone can view holidays
CREATE POLICY "Anyone can view official holidays"
ON public.official_holidays
FOR SELECT
USING (true);

-- Only admins can manage holidays
CREATE POLICY "Admins can insert official holidays"
ON public.official_holidays
FOR INSERT
WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can update official holidays"
ON public.official_holidays
FOR UPDATE
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete official holidays"
ON public.official_holidays
FOR DELETE
USING (public.has_admin_role(auth.uid()));

-- Create index for date lookups
CREATE INDEX idx_official_holidays_date ON public.official_holidays(holiday_date);

-- Add official_holidays to role_permissions if not exists
INSERT INTO public.role_permissions (role, permission, can_view, can_create, can_edit, can_delete)
VALUES 
  ('Admin', 'official_holidays', true, true, true, true),
  ('HR', 'official_holidays', true, true, true, false),
  ('Employee', 'official_holidays', true, false, false, false)
ON CONFLICT (role, permission) DO NOTHING;