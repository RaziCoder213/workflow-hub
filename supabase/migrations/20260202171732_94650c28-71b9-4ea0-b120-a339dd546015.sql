-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (user_id = get_profile_id(auth.uid()) OR true);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (true);

-- Add winner_selected_at to daily_draws to track when winner was selected
ALTER TABLE public.daily_draws 
ADD COLUMN IF NOT EXISTS winner_selected_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add email_sent to daily_draws to track notification status
ALTER TABLE public.daily_draws 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;