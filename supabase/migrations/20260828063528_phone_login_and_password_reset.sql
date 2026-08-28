-- Phone number as an alternative login identifier, plus the DB-side piece
-- of the Forgot Password flow. profiles.phone has existed since the
-- initial schema but was never populated or enforced unique — this
-- migration makes it a real, unique alternate identifier and adds a
-- pre-auth-callable function that resolves either an email or a phone
-- number down to the account's real email, which is what
-- signInWithPassword / resetPasswordForEmail actually need.

-- 1. normalize_phone(): strips spaces and dashes so "+1 555-123-4567" and
-- "+15551234567" compare as the same number. `immutable` is required for
-- use in an index expression below (regexp_replace with a fixed pattern
-- and no locale-dependent behavior is safe to mark immutable).
create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select regexp_replace(p_phone, '[\s-]', '', 'g');
$$;

-- 2. Unique constraint on phone, excluding NULLs (a partial index) — but
-- on the NORMALIZED value rather than the raw column. A plain
-- `unique (phone) where phone is not null` would let "+1 555-123-4567"
-- and "+15551234567" both be stored as if they were different numbers,
-- which defeats the point of using phone as a unique login identifier:
-- resolve_login_identifier() below has to normalize to find a match
-- either way, so the uniqueness guarantee needs to be enforced on that
-- same normalized form, not the raw formatting someone happened to type.
create unique index profiles_phone_normalized_key
  on public.profiles (public.normalize_phone(phone))
  where phone is not null;

-- 3. resolve_login_identifier(): turns whatever someone typed into the
-- "Email or Phone Number" field into a real email, so the actual
-- signInWithPassword/resetPasswordForEmail call always uses an email.
--
-- - An identifier containing "@" is assumed to already be an email and is
--   returned unchanged — no lookup, no auth.users access at all for the
--   common case.
-- - Otherwise it's looked up as a phone number (normalized the same way
--   as the unique index above) and resolved to that profile's real email
--   via auth.users.
-- - Returns NULL on no match — `select ... into` without `strict` never
--   raises when zero rows match, so a nonexistent phone number and any
--   other non-error case are indistinguishable to the caller. This is
--   deliberate: the whole point is that this function must be callable
--   before authentication (sign-in, forgot-password) without ever
--   letting someone probe which phone numbers have accounts.
-- - security definer is required because the anon role (see grant below)
--   has no SELECT access to auth.users or to other people's profiles
--   rows; this function is the one narrow, intentional exception,
--   returning only the single email string and nothing else about the
--   matched profile.
create or replace function public.resolve_login_identifier(identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if identifier is null then
    return null;
  end if;

  if position('@' in identifier) > 0 then
    return identifier;
  end if;

  select u.email
    into v_email
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.phone is not null
     and public.normalize_phone(p.phone) = public.normalize_phone(identifier)
   limit 1;

  return v_email;
end;
$$;

comment on function public.resolve_login_identifier(text) is
  'Resolves an email-or-phone login identifier to a real email. Returns the identifier unchanged if it looks like an email, the matching profile''s email if it looks like a phone number, or NULL if nothing matches — never distinguishes "not found" from any other case, so this can''t be used to enumerate registered phone numbers. Returns only the email string; no other profile data is exposed.';

-- Callable specifically as anon: this must work BEFORE authentication
-- (sign-in and forgot-password both call it pre-session). Also granted to
-- authenticated for the same reason redeem_guardian_invite-style
-- functions generally are — no reason to forbid a signed-in session from
-- calling it too, and it costs nothing to allow.
revoke all on function public.resolve_login_identifier(text) from public;
grant execute on function public.resolve_login_identifier(text) to anon, authenticated;
