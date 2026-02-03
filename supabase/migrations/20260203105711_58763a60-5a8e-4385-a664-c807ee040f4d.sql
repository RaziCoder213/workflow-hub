-- Create role permissions table for granular access control
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions
  FOR ALL
  USING (has_admin_role(auth.uid()));

-- Everyone can read permissions (needed for UI)
CREATE POLICY "Anyone can read role permissions"
  ON public.role_permissions
  FOR SELECT
  USING (true);

-- Insert default permissions for each role
-- Admin has full access to everything
INSERT INTO public.role_permissions (role, permission, can_view, can_create, can_edit, can_delete) VALUES
  ('Admin', 'employees', true, true, true, true),
  ('Admin', 'leaves', true, true, true, true),
  ('Admin', 'overtime', true, true, true, true),
  ('Admin', 'performance', true, true, true, true),
  ('Admin', 'attendance', true, true, true, true),
  ('Admin', 'breaks', true, true, true, true),
  ('Admin', 'rewards', true, true, true, true),
  ('Admin', 'roles', true, true, true, true),
  ('Admin', 'permissions', true, true, true, true);

-- HR has most access except role/permission management
INSERT INTO public.role_permissions (role, permission, can_view, can_create, can_edit, can_delete) VALUES
  ('HR', 'employees', true, true, true, false),
  ('HR', 'leaves', true, true, true, false),
  ('HR', 'overtime', true, true, true, false),
  ('HR', 'performance', true, true, true, false),
  ('HR', 'attendance', true, false, false, false),
  ('HR', 'breaks', true, true, true, false),
  ('HR', 'rewards', true, true, true, false),
  ('HR', 'roles', false, false, false, false),
  ('HR', 'permissions', false, false, false, false);

-- Employee has limited view access
INSERT INTO public.role_permissions (role, permission, can_view, can_create, can_edit, can_delete) VALUES
  ('Employee', 'employees', false, false, false, false),
  ('Employee', 'leaves', true, true, false, false),
  ('Employee', 'overtime', true, true, false, false),
  ('Employee', 'performance', true, false, false, false),
  ('Employee', 'attendance', true, false, false, false),
  ('Employee', 'breaks', true, false, false, false),
  ('Employee', 'rewards', true, false, false, false),
  ('Employee', 'roles', false, false, false, false),
  ('Employee', 'permissions', false, false, false, false);

-- Add status column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE public.profiles ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;