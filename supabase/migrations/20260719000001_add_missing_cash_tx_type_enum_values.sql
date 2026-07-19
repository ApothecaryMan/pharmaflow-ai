-- Migration: Add missing cash_tx_type enum values
-- Date: 2026-07-19
-- Description: Adds 'opening_balance' and 'closing_balance' to the existing
-- cash_tx_type enum. The earlier migration 20260513000000_fix_cash_system_schema
-- attempted to create these values but the CREATE TYPE was a no-op (type already
-- existed) and the ALTER TYPE statements only added 'purchase', 'purchase_return',
-- and 'adjustment' — not 'opening_balance' and 'closing_balance'.
-- The RPCs (open_shift, close_shift) use these values, causing 400 errors.

BEGIN;

ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'opening_balance';
ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'closing_balance';

COMMIT;
