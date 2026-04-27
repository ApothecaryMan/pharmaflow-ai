-- Add serial_id column to returns table
ALTER TABLE returns ADD COLUMN serial_id TEXT;
CREATE INDEX idx_returns_serial_id ON returns(serial_id);
