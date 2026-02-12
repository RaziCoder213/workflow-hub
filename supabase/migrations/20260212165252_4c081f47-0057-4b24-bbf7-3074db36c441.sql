
-- Create hours_adjustments table for admin/HR to adjust employee hours
CREATE TABLE public.hours_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  adjusted_by UUID NOT NULL,
  adjusted_by_name TEXT NOT NULL,
  adjustment_seconds INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hours_adjustments ENABLE ROW LEVEL SECURITY;

-- Admins/HR can manage adjustments
CREATE POLICY "Admins can manage hours adjustments"
ON public.hours_adjustments
FOR ALL
USING (has_admin_role(auth.uid()));

-- Employees can read their own adjustments
CREATE POLICY "Users can read own adjustments"
ON public.hours_adjustments
FOR SELECT
USING (employee_id = get_profile_id(auth.uid()));
