-- Storage bucket futto-bucket + policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'futto-bucket',
  'futto-bucket',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read
drop policy if exists futto_bucket_public_read on storage.objects;
create policy futto_bucket_public_read on storage.objects
  for select to public
  using (bucket_id = 'futto-bucket');

-- Authenticated upload (compressed client-side before save)
drop policy if exists futto_bucket_auth_insert on storage.objects;
create policy futto_bucket_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'futto-bucket');

drop policy if exists futto_bucket_auth_update on storage.objects;
create policy futto_bucket_auth_update on storage.objects
  for update to authenticated
  using (bucket_id = 'futto-bucket' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'futto-bucket');

drop policy if exists futto_bucket_auth_delete on storage.objects;
create policy futto_bucket_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'futto-bucket'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superAdmin')
    )
  );

