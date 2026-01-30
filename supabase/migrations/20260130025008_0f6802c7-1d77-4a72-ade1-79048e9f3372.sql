-- Create table for reward items (gifts available in the lucky draw)
CREATE TABLE public.reward_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'daily_punctuality', -- daily_punctuality, star, silver, keep_it_up
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for daily draws (tracks who is eligible each day)
CREATE TABLE public.daily_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  draw_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_winner BOOLEAN DEFAULT false,
  is_claimed BOOLEAN DEFAULT false,
  reward_id UUID REFERENCES public.reward_items(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, draw_date)
);

-- Create table for reward claims history
CREATE TABLE public.reward_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.reward_items(id),
  reward_name TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'Daily Punctuality',
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reward_items (everyone can read, admin can manage)
CREATE POLICY "Anyone can read reward items" ON public.reward_items FOR SELECT USING (true);
CREATE POLICY "Admin can manage reward items" ON public.reward_items FOR ALL USING (true);

-- RLS Policies for daily_draws
CREATE POLICY "Anyone can read daily draws" ON public.daily_draws FOR SELECT USING (true);
CREATE POLICY "System can insert daily draws" ON public.daily_draws FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update daily draws" ON public.daily_draws FOR UPDATE USING (true);

-- RLS Policies for reward_claims
CREATE POLICY "Anyone can read reward claims" ON public.reward_claims FOR SELECT USING (true);
CREATE POLICY "Users can insert claims" ON public.reward_claims FOR INSERT WITH CHECK (true);

-- Insert default daily punctuality gift rewards
INSERT INTO public.reward_items (name, category, image_url) VALUES
  ('Cappuccino Coffee', 'daily_punctuality', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=200&h=200&fit=crop'),
  ('Chocolate', 'daily_punctuality', 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=200&h=200&fit=crop'),
  ('Ice Cream', 'daily_punctuality', 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop'),
  ('Rs. 300', 'daily_punctuality', 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=200&h=200&fit=crop'),
  ('Pepsi Cold Drink', 'daily_punctuality', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200&h=200&fit=crop'),
  ('Brownie', 'daily_punctuality', 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=200&h=200&fit=crop'),
  ('Cup Cake', 'daily_punctuality', 'https://images.unsplash.com/photo-1519869325930-281384150729?w=200&h=200&fit=crop'),
  ('Single Pizza Slice', 'daily_punctuality', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop'),
  ('Shake', 'daily_punctuality', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=200&h=200&fit=crop'),
  ('Juice', 'daily_punctuality', 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=200&h=200&fit=crop'),
  ('Chips', 'daily_punctuality', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&h=200&fit=crop'),
  ('Biryani', 'daily_punctuality', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop'),
  ('Zinger Burger', 'daily_punctuality', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop');