-- Reshape public.push_tokens for the Android Tier-A push path: it now
-- stores raw FCM device registration tokens (not Expo push tokens), one
-- row per (user, device), upserted in place as the FCM token rotates.
--
-- Safe to reshape rather than add-only: the table has been schema-only
-- since it was created (see 20260821190626_push_tokens.sql — "no
-- application code reads/writes this table yet") and is empty.

-- 1. It is an FCM token now, not an Expo one.
alter table public.push_tokens rename column expo_push_token to token;

-- The old standalone unique(token) is wrong: one physical device (hence
-- one FCM token) can legitimately belong to different users over time
-- (a guardian signs out, another signs in on the same phone). Dedupe on
-- the device, not the token.
alter table public.push_tokens drop constraint push_tokens_expo_push_token_key;

-- 2. Token kind. Only 'fcm' is produced today; 'expo' is left as a
-- possible future value (web push, or a non-full-screen-intent fallback)
-- so adding it later is not a column-type change.
alter table public.push_tokens
  add column token_type text not null default 'fcm'
  check (token_type in ('fcm', 'expo'));

-- 3. Stable per-installation id — a UUID generated once and persisted
-- client-side in AsyncStorage. One token row per (user, device); a
-- rotated FCM token updates the existing row instead of accumulating
-- dead ones.
alter table public.push_tokens add column device_id text not null;

alter table public.push_tokens
  add constraint push_tokens_user_device_key unique (user_id, device_id);

-- 4. Bumped on every upsert — lets the send path age out tokens that have
-- gone quiet, and is a cheap "last seen".
alter table public.push_tokens
  add column updated_at timestamptz not null default now();

comment on table public.push_tokens is
  'Push delivery targets, one row per (user_id, device_id). token is a raw FCM registration token (token_type = ''fcm''); it rotates, so the client upserts on (user_id, device_id). Rows are pruned on sign-out by the client, and by send-alert-push (service role) when FCM reports a token unregistered.';

-- 5. Upsert needs UPDATE — the original policies only covered
-- select / insert / delete (see 20260821190626_push_tokens.sql).
create policy "push_tokens_update_own"
  on public.push_tokens
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant update on public.push_tokens to authenticated;
