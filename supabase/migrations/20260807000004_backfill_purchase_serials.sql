-- Backfill legacy purchase serials to the canonical {BranchCode}-PU-{YY}-{seq}
-- scheme (6-digit zero-padded), then advance the per-(branch, year) PU counter
-- so newly minted numbers continue after the backfilled ones (no collisions).
--
-- Legacy rows used the old format e.g. INV-000019. New documents are minted by
-- generate_serial_id as {BranchCode}-PU-{YY}-{000001}. Existing rows never got
-- renamed, so the UI kept showing INV-…. This backfills them in chronological
-- order per (branch, year) and bumps sequence_counters('PU') to the max.

DO $backfill$
DECLARE
  r         RECORD;
  v_code    TEXT;
  v_yy      TEXT;
  v_new_inv TEXT;
BEGIN
  -- 1) Rename every non-canonical invoice in chronological order per (branch, year).
  FOR r IN
    SELECT p.id,
           p.branch_id,
           date_part('year', p.date)::int AS year,
           row_number() OVER (
             PARTITION BY p.branch_id, date_part('year', p.date)
             ORDER BY p.date, p.created_at, p.id
           )::bigint AS seq
    FROM purchases p
    WHERE NOT (p.invoice_id ~ '^[^-]+-PU-[0-9]{2}-[0-9]{6}$')
    ORDER BY p.branch_id, p.date, p.created_at, p.id
  LOOP
    SELECT code INTO v_code FROM branches WHERE id = r.branch_id;
    v_code   := COALESCE(NULLIF(v_code, ''), 'PF');
    v_yy     := to_char(make_date(r.year, 1, 1), 'YY');
    v_new_inv := v_code || '-PU-' || v_yy || '-' || lpad(r.seq::text, 6, '0');
    UPDATE purchases SET invoice_id = v_new_inv WHERE id = r.id;
  END LOOP;

  -- 2) Advance the PU sequence counter to the highest backfilled number so the
  --    next generate_serial_id call continues (e.g. …000023) not resets to 1.
  FOR r IN
    SELECT p.branch_id,
           date_part('year', p.date)::int AS year,
           count(*)::bigint               AS max_seq,
           resolve_tenant_id(p.branch_id) AS tenant
    FROM purchases p
    WHERE p.invoice_id ~ '^[^-]+-PU-[0-9]{2}-[0-9]{6}$'
    GROUP BY p.branch_id, date_part('year', p.date)
  LOOP
    INSERT INTO sequence_counters (tenant_id, branch_id, doc_type, year, last_number, updated_at)
    VALUES (r.tenant, r.branch_id, 'PU', r.year, r.max_seq, now())
    ON CONFLICT (tenant_id, branch_id, doc_type, year) WHERE branch_id IS NOT NULL
    DO UPDATE SET last_number = GREATEST(sequence_counters.last_number, EXCLUDED.last_number),
                  updated_at  = now();
  END LOOP;
END $backfill$;