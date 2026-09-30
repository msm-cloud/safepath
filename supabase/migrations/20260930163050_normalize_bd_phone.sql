-- One stored format for Bangladesh mobile numbers.
--
-- normalize_phone() used to strip only spaces and dashes, so 01711000555
-- and +8801711000555 counted as different numbers: the unique index let
-- two accounts hold the same number, and phone sign-in found whichever
-- account matched the format that was typed.
--
-- 1. normalize_phone() now maps local (01…), 880… and 00880… forms to
--    +8801XXXXXXXXX and also strips parentheses. Other numbers only lose
--    their formatting characters.
-- 2. The unique index is built on normalize_phone(), so it's dropped first
--    and rebuilt after the stored values are converted.
-- 3. Stops with an error if any two profiles would share a number; those
--    have to be resolved by hand before this runs.
-- 4. Existing profiles.phone values are rewritten to the normalized form.
-- 5. A trigger normalizes phone on every insert and update, so every
--    sign-up and settings path stores the same format without app changes.
--
-- resolve_login_identifier() and auth_identifier_email_for_phone() already
-- compare normalize_phone() on both sides and pick up the new rule as is.
-- The auth-identifier edge function's normalizePhone() mirrors it.

-- 1 + 2
drop index public.profiles_phone_normalized_key;

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when s ~ '^01[3-9][0-9]{8}$'     then '+88' || s
    when s ~ '^8801[3-9][0-9]{8}$'   then '+' || s
    when s ~ '^008801[3-9][0-9]{8}$' then '+' || pg_catalog.substr(s, 3)
    else s
  end
  from (select pg_catalog.regexp_replace(p_phone, '[\s()-]', '', 'g') as s) as x;
$$;

-- 3
do $$
declare
  v_clashes int;
begin
  select count(*) into v_clashes
    from (
      select public.normalize_phone(phone)
        from public.profiles
       where phone is not null
       group by 1
      having count(*) > 1
    ) as dup;

  if v_clashes > 0 then
    raise exception '% phone number(s) are held by more than one profile after normalization; clear the duplicates first', v_clashes;
  end if;
end;
$$;

-- 4
update public.profiles
   set phone = public.normalize_phone(phone)
 where phone is distinct from public.normalize_phone(phone);

create unique index profiles_phone_normalized_key
  on public.profiles (public.normalize_phone(phone))
  where phone is not null;

-- 5. An empty string becomes NULL so it can't claim a slot in the index.
create or replace function public.normalize_profile_phone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is not null then
    new.phone := nullif(public.normalize_phone(new.phone), '');
  end if;
  return new;
end;
$$;

create trigger profiles_phone_normalize
  before insert or update of phone on public.profiles
  for each row
  execute function public.normalize_profile_phone();

revoke execute on function public.normalize_profile_phone() from public, anon, authenticated;
