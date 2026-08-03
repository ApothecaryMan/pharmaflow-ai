-- ============================================================
-- Employee photo storage bucket
-- Date: 2026-08-06
--
-- Moves employee profile photos from base64-in-column to Supabase
-- Storage: `employees.photo` / `user_profiles.image` now store the
-- public CDN URL returned by getPublicUrl.
--
-- Tenant isolation:
--   Uploads live under `{orgId}/avatars/{id}-{timestamp}.{ext}` and the
--   write policies only allow a path whose top folder is one of the
--   caller's own organizations. A user from pharmacy A can never write
--   into pharmacy B's folder (no JWT claims are needed — membership is
--   resolved from employees / org_members / organizations owner).
--
--   Public-read is intentional: profile photos are non-sensitive and the
--   bucket is served by the Supabase CDN with long-lived Cache-Control.
--   The timestamp in the filename makes every upload a fresh URL, so the
--   long cache can never serve a stale photo after a change.
-- ============================================================

BEGIN;

insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', true)
on conflict (id) do nothing;

-- Caller's organizations (via employee link, org membership, or ownership)
create or replace function public.employee_photo_orgs()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select org_id::text from public.employees where auth_user_id = auth.uid()
  union
  select org_id::text from public.org_members where user_id = auth.uid()
  union
  select id::text from public.organizations where owner_id = auth.uid()
$$;

drop policy if exists "Public read employee photos" on storage.objects;
create policy "Public read employee photos"
  on storage.objects for select
  using (bucket_id = 'employee-photos');

drop policy if exists "Authenticated insert employee photos" on storage.objects;
create policy "Authenticated insert employee photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] in (select public.employee_photo_orgs())
  );

drop policy if exists "Authenticated update employee photos" on storage.objects;
create policy "Authenticated update employee photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] in (select public.employee_photo_orgs())
  )
  with check (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] in (select public.employee_photo_orgs())
  );

drop policy if exists "Authenticated delete employee photos" on storage.objects;
create policy "Authenticated delete employee photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] in (select public.employee_photo_orgs())
  );

COMMIT;
