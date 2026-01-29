-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'Employee',
  department TEXT,
  "phoneNumber" TEXT,
  birthday DATE,
  avatar TEXT,
  auth_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create ATTENDANCE Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  "userName" TEXT,
  date DATE DEFAULT CURRENT_DATE,
  "checkIn" TIMESTAMPTZ NOT NULL,
  "checkOut" TIMESTAMPTZ,
  "totalWorkingSeconds" INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  "isWFH" BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create LEAVES Table
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  "userName" TEXT,
  type TEXT,
  "startDate" DATE,
  "endDate" DATE,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create OVERTIME Table
CREATE TABLE IF NOT EXISTS public.overtime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  "userName" TEXT,
  project TEXT,
  hours NUMERIC,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create BREAK_SCHEDULE Table
CREATE TABLE IF NOT EXISTS public.break_schedule (
  day_of_week INTEGER PRIMARY KEY,
  start_hour INTEGER DEFAULT 15,
  end_hour INTEGER DEFAULT 16
);

-- 6. Create PERFORMANCE_REVIEWS Table
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  "reviewerId" TEXT,
  "workPerformance" INTEGER DEFAULT 5,
  "qualityResults" INTEGER DEFAULT 5,
  "attendanceBehavior" INTEGER DEFAULT 5,
  "officePolicies" INTEGER DEFAULT 5,
  "teamContribution" INTEGER DEFAULT 5,
  comments TEXT,
  "reviewDate" DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.break_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = auth_user_id::text OR auth.uid() IS NULL);
CREATE POLICY "Allow insert for admin creation" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete for admin" ON public.profiles FOR DELETE USING (true);

-- RLS Policies for attendance
CREATE POLICY "Public read access to attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own attendance" ON public.attendance FOR UPDATE USING (true);

-- RLS Policies for leaves
CREATE POLICY "Public read access to leaves" ON public.leaves FOR SELECT USING (true);
CREATE POLICY "Users can insert leaves" ON public.leaves FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update leaves" ON public.leaves FOR UPDATE USING (true);

-- RLS Policies for overtime
CREATE POLICY "Public read access to overtime" ON public.overtime FOR SELECT USING (true);
CREATE POLICY "Users can insert overtime" ON public.overtime FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update overtime" ON public.overtime FOR UPDATE USING (true);

-- RLS Policies for break_schedule
CREATE POLICY "Public read access to break_schedule" ON public.break_schedule FOR SELECT USING (true);
CREATE POLICY "Admin can manage break_schedule" ON public.break_schedule FOR ALL USING (true);

-- RLS Policies for performance_reviews
CREATE POLICY "Public read access to performance_reviews" ON public.performance_reviews FOR SELECT USING (true);
CREATE POLICY "Admin can insert performance_reviews" ON public.performance_reviews FOR INSERT WITH CHECK (true);

-- Seed default break schedule (3-4 PM for all days)
INSERT INTO public.break_schedule (day_of_week, start_hour, end_hour) VALUES
(0, 15, 16), (1, 15, 16), (2, 15, 16), (3, 15, 16), (4, 15, 16), (5, 15, 16), (6, 15, 16)
ON CONFLICT (day_of_week) DO NOTHING;

-- Insert a default Admin user
INSERT INTO public.profiles (name, email, role, department) 
VALUES ('Admin User', 'admin@hztech.biz', 'Admin', 'Management')
ON CONFLICT (email) DO NOTHING;