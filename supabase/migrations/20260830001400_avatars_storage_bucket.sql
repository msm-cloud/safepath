-- Private storage bucket backing profiles.avatar_url (previous
-- migration). Second slice of the avatar feature: bucket + storage RLS
-- only — no application code uploads or reads objects yet.
--
-- PRIVATE, deliberately (public = false): a profile photo of an at-risk
-- user, sitting alongside their name and last known location elsewhere
-- in the app, is sensitive enough that it must never be world-readable
-- by a guessable URL. The client fetches each photo through a
-- short-lived signed URL instead.
--
-- Path convention: '<owner-uid>/<filename>', e.g.
-- 'a1b2c3d4-.../avatar.jpg'. The first path segment is always the
-- owning user's auth.uid(); every policy below keys off that via
-- storage.foldername(name)[1].

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152, -- 2 MiB — a client-downscaled square avatar is comfortably under this
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- RLS on storage.objects is already enabled by Supabase. Every policy
-- below is additive and scoped to bucket_id = 'avatars', so none of
-- this affects any other bucket.

-- Write access: a user may create / replace / remove objects only under
-- their own '<uid>/...' prefix.
create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read access: the owner always; plus either side of an ACCEPTED
-- guardian link may read the other's avatar. This mirrors the profiles
-- table's own paired policies exactly —
-- profiles_select_by_accepted_guardian (guardian -> student, in
-- 20260821190559_guardian_links.sql) and profiles_select_by_own_guardian
-- (student -> guardian, in 20260822101414_profiles_select_by_own_guardian.sql)
-- — so an avatar is visible to precisely the same people who can already
-- see that user's full_name, and no one else.
create policy "avatars_select_own_or_linked"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.guardian_links gl
        where gl.status = 'accepted'
          and gl.guardian_id = auth.uid()
          and gl.user_id::text = (storage.foldername(name))[1]
      )
      or exists (
        select 1
        from public.guardian_links gl
        where gl.status = 'accepted'
          and gl.user_id = auth.uid()
          and gl.guardian_id::text = (storage.foldername(name))[1]
      )
    )
  );
