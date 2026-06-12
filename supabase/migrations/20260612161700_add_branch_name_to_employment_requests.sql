-- Add branch_name to employment_requests to allow denormalized access before employee accepts invite
ALTER TABLE public.employment_requests
ADD COLUMN IF NOT EXISTS branch_name TEXT;
