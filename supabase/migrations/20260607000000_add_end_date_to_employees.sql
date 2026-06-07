-- Add end_date column to employees table for tracking employment end dates
ALTER TABLE employees ADD COLUMN end_date DATE;

COMMENT ON COLUMN employees.end_date IS 'ISO date (YYYY-MM-DD) when the employee left or was terminated. NULL means currently employed. Populated automatically when status changes to inactive.';
