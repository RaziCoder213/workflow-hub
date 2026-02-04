-- Add custom roles table for admin-defined roles
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default system roles
INSERT INTO public.custom_roles (name, description, is_system_role) VALUES
  ('Admin', 'Full system access', true),
  ('HR', 'Human resources management', true),
  ('Employee', 'Standard employee access', true)
ON CONFLICT (name) DO NOTHING;

-- Add reward categories table
CREATE TABLE IF NOT EXISTS public.reward_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'gift',
  points_required INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default reward categories
INSERT INTO public.reward_categories (name, description, icon, points_required) VALUES
  ('Daily Punctuality', 'Complete 8 hours to join daily lucky draw', 'clock', 0),
  ('Star Employee', 'High performance rewards based on points', 'star', 100),
  ('Monthly Champion', 'Top performer of the month', 'trophy', 200)
ON CONFLICT (name) DO NOTHING;

-- Add category_id to reward_items
ALTER TABLE public.reward_items 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.reward_categories(id),
ADD COLUMN IF NOT EXISTS points_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Separate permissions for leave/overtime requests vs approvals
DELETE FROM public.role_permissions WHERE permission IN ('leave_requests', 'leave_approvals', 'overtime_requests', 'overtime_approvals');

-- Add separate permissions
INSERT INTO public.role_permissions (role, permission, can_view, can_create, can_edit, can_delete) VALUES
  ('Admin', 'leave_requests', true, true, true, true),
  ('Admin', 'leave_approvals', true, true, true, true),
  ('Admin', 'overtime_requests', true, true, true, true),
  ('Admin', 'overtime_approvals', true, true, true, true),
  ('Admin', 'rewards_management', true, true, true, true),
  ('HR', 'leave_requests', true, true, true, false),
  ('HR', 'leave_approvals', true, true, true, false),
  ('HR', 'overtime_requests', true, true, true, false),
  ('HR', 'overtime_approvals', true, true, true, false),
  ('HR', 'rewards_management', true, true, true, false),
  ('Employee', 'leave_requests', true, true, false, false),
  ('Employee', 'leave_approvals', false, false, false, false),
  ('Employee', 'overtime_requests', true, true, false, false),
  ('Employee', 'overtime_approvals', false, false, false, false),
  ('Employee', 'rewards_management', false, false, false, false)
ON CONFLICT DO NOTHING;

-- RLS for custom_roles
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom roles"
ON public.custom_roles FOR SELECT
USING (true);

CREATE POLICY "Admins can manage custom roles"
ON public.custom_roles FOR ALL
USING (has_admin_role(auth.uid()));

-- RLS for reward_categories
ALTER TABLE public.reward_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward categories"
ON public.reward_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage reward categories"
ON public.reward_categories FOR ALL
USING (has_admin_role(auth.uid()));