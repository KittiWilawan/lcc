-- =========================================================
-- LookLanCare (LLC) Production Database Schema & Migration
-- =========================================================

-- 1. Profiles Table (User settings & Push Tokens)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  expo_push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Families Table
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'ครอบครัวสุขสันต์',
  family_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'สมาชิกครอบครัว',
  is_tracked BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Cameras Table
CREATE TABLE IF NOT EXISTS public.cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'rtsp',
  url TEXT,
  protocol TEXT DEFAULT 'rtsp',
  assigned_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Fall Events Table (Emergency Logs & Snapshots)
CREATE TABLE IF NOT EXISTS public.fall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL DEFAULT 'สมาชิกผู้สูงอายุ',
  camera_name TEXT NOT NULL DEFAULT 'กล้องวงจรปิด',
  image_url TEXT,
  details TEXT,
  ground_duration NUMERIC DEFAULT 1.5,
  torso_angle NUMERIC DEFAULT 18,
  event_type TEXT DEFAULT 'actual', -- 'actual' | 'simulated' | 'sos'
  status TEXT DEFAULT 'notified', -- 'notified' | 'responded' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relation TEXT DEFAULT 'ญาติใกล้ชิด',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Permissive Policies for Authenticated & Anonymous App Use
CREATE POLICY "Allow public read access profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public update profiles" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow public read families" ON public.families FOR SELECT USING (true);
CREATE POLICY "Allow public insert families" ON public.families FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public family_members" ON public.family_members FOR ALL USING (true);
CREATE POLICY "Allow public cameras" ON public.cameras FOR ALL USING (true);
CREATE POLICY "Allow public fall_events" ON public.fall_events FOR ALL USING (true);
CREATE POLICY "Allow public emergency_contacts" ON public.emergency_contacts FOR ALL USING (true);

-- Enable Supabase Realtime for Fall Events
ALTER PUBLICATION supabase_realtime ADD TABLE public.fall_events;

-- Supabase Storage Bucket Setup for Evidence Photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fall-evidence', 'fall-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public upload fall evidence" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fall-evidence');

CREATE POLICY "Allow public view fall evidence" 
ON storage.objects FOR SELECT USING (bucket_id = 'fall-evidence');
