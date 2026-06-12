-- Add expires_at to employment_requests to allow time-limited invitations
ALTER TABLE public.employment_requests
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Drop and recreate the view/policies if needed? No, it's just a column addition.
