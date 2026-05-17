-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  actual_date date NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  type text NOT NULL CHECK (type IN ('national', 'religious', 'observance')),
  is_day_off boolean DEFAULT true NOT NULL,
  purchasing_alert_ar text,
  purchasing_alert_en text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Allow select to everyone
CREATE POLICY "Allow public read access to holidays" ON public.holidays
  FOR SELECT USING (true);

-- Allow all write operations for authenticated users
CREATE POLICY "Allow authenticated users to write holidays" ON public.holidays
  FOR ALL TO authenticated USING (true);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.holidays;
