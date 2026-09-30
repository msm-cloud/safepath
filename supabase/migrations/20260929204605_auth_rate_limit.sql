-- Server-side pieces for the auth-identifier edge function, which lets a
-- phone number be used to sign in or request a password reset without the
-- caller ever learning the account's email.
--
-- 1. auth_rate_limit_events: one row per counted attempt. Phones and IPs are
--    stored only as salted HMACs computed by the edge function.
-- 2. auth_rate_limit_hit(): check-and-record in one call, serialized per key,
--    so parallel requests can't all slip under the limit.
-- 3. auth_identifier_email_for_phone(): the phone -> email lookup, callable
--    only by service_role (resolve_login_identifier stays as-is for the
--    released mobile app until it moves over).
-- 4. Hourly purge of rows older than 24 h via pg_cron.
--
-- Nothing here is reachable by anon or authenticated.

-- 1. Table
create table public.auth_rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null check (bucket in ('ip', 'signin', 'reset')),
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index auth_rate_limit_events_lookup_idx
  on public.auth_rate_limit_events (bucket, key_hash, created_at desc);

alter table public.auth_rate_limit_events enable row level security;

-- No policies: only the security definer functions below touch this table.
revoke all on public.auth_rate_limit_events from public, anon, authenticated;

comment on table public.auth_rate_limit_events is
  'Attempts counted by the auth-identifier edge function. key_hash is an HMAC of the phone or IP, never the plain value. Rows older than 24 h are purged hourly.';

-- 2. Limiter. Returns 0 when the attempt is allowed (and records it), or the
-- number of seconds until the oldest counted attempt leaves the window.
-- Blocked attempts are not recorded, so a lockout always ends.
create or replace function public.auth_rate_limit_hit(
  p_bucket text,
  p_key_hash text,
  p_window_secs integer,
  p_max integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window interval := make_interval(secs => p_window_secs);
  v_count integer;
  v_oldest timestamptz;
begin
  -- Serializes callers on the same key until commit; the count below then
  -- sees every attempt that got in first.
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key_hash, 0));

  select count(*), min(created_at)
    into v_count, v_oldest
    from public.auth_rate_limit_events
   where bucket = p_bucket
     and key_hash = p_key_hash
     and created_at > clock_timestamp() - v_window;

  if v_count >= p_max then
    return greatest(1, ceil(extract(epoch from (v_oldest + v_window - clock_timestamp())))::integer);
  end if;

  insert into public.auth_rate_limit_events (bucket, key_hash, created_at)
  values (p_bucket, p_key_hash, clock_timestamp());

  return 0;
end;
$$;

revoke execute on function public.auth_rate_limit_hit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.auth_rate_limit_hit(text, text, integer, integer)
  to service_role;

-- 3. Phone -> email, for the edge function only.
create or replace function public.auth_identifier_email_for_phone(p_phone text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.phone is not null
     and public.normalize_phone(p.phone) = public.normalize_phone(p_phone)
   limit 1;
$$;

revoke execute on function public.auth_identifier_email_for_phone(text)
  from public, anon, authenticated;
grant execute on function public.auth_identifier_email_for_phone(text) to service_role;

-- 4. Purge
create or replace function public.purge_auth_rate_limit_events()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.auth_rate_limit_events where created_at < now() - interval '24 hours';
$$;

revoke execute on function public.purge_auth_rate_limit_events() from public, anon, authenticated;

do $$
begin
  perform cron.schedule(
    'purge-auth-rate-limit-events',
    '15 * * * *',
    'select public.purge_auth_rate_limit_events();'
  );
exception
  when others then
    raise notice 'Could not schedule purge_auth_rate_limit_events() via pg_cron (%).', sqlerrm;
end
$$;
