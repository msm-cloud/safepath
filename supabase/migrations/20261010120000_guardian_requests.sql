-- Guardian invite requests (PR 3b, docs/plans/guardian-invite-requests.md).
--
-- The guardian creates a short-lived code; the student enters it, sees who
-- is asking, and accepts or declines. Linking always ends with the
-- student's explicit choice. The old flow (student code, guardian redeems)
-- is untouched and keeps working for installed 1.1/1.2 apps.
--
-- 1. guardian_requests. Guardians get no policies at all; every guardian
--    read and action goes through the functions below. A student can read
--    the rows they claimed, which also scopes their Realtime feed.
-- 2. Guardian functions: create, list (id, code, created_at and a
--    waiting/inactive state only) and cancel. A declined request looks
--    exactly like an unused code until expires_at and keeps its slot in the
--    3-code cap, so a decline can't be told apart from an expiry.
-- 3. Lookup limits: invite_lookup joins the auth_rate_limit_events
--    buckets, with a check-only helper and a record helper so that only
--    failed lookups count.
-- 4. claim_guardian_request and get_claimed_guardian_request, for the
--    claim-guardian-request Edge Function only (service_role).
-- 5. Student functions: list open requests, accept, decline.
-- 6. Cron: expire open requests at expires_at, purge after 30 days.
-- 7. Realtime for the student's Guardians tab.

-- 1. Table
create type public.guardian_request_status as enum (
  'waiting',
  'claimed',
  'accepted',
  'declined',
  'cancelled',
  'expired'
);

create table public.guardian_requests (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  status public.guardian_request_status not null default 'waiting',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  decided_at timestamptz,
  constraint guardian_requests_code_format check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$')
);

comment on table public.guardian_requests is
  'Guardian-created invite codes. Guardians only reach this table through security definer functions; a student can read the requests they claimed.';

-- Codes only need to be unique while someone can still look them up or
-- act on them.
create unique index guardian_requests_active_code
  on public.guardian_requests (code)
  where status in ('waiting', 'claimed');

create index guardian_requests_guardian_created_idx
  on public.guardian_requests (guardian_id, created_at desc);

create index guardian_requests_claimed_by_idx
  on public.guardian_requests (claimed_by)
  where claimed_by is not null;

alter table public.guardian_requests enable row level security;

revoke all on public.guardian_requests from public, anon, authenticated;
grant select on public.guardian_requests to authenticated;

-- Any status, so a cancel or expiry still reaches the student's Realtime
-- feed (Realtime checks UPDATEs against the new row). The app shows only
-- claimed, unexpired rows.
create policy "guardian_requests_select_claimed_by_self"
  on public.guardian_requests
  for select
  to authenticated
  using (claimed_by = auth.uid());

-- The single place that maps raw status to what the guardian sees.
-- Declined stays waiting until expires_at, like an unused code.
create or replace function public.guardian_request_is_waiting(
  p_status public.guardian_request_status,
  p_expires_at timestamptz
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status::text in ('waiting', 'claimed', 'declined') and now() < p_expires_at;
$$;

-- Same alphabet and byte trick as generate_invite_code(): 32 divides 256,
-- so byte % 32 is unbiased.
create or replace function public.generate_guardian_request_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea;
  new_code text;
begin
  loop
    b := extensions.gen_random_bytes(8);
    select string_agg(substr(chars, (get_byte(b, i) % 32) + 1, 1), '' order by i)
      into new_code
      from generate_series(0, 7) as i;
    exit when not exists (
      select 1
        from public.guardian_requests
       where code = new_code
         and status in ('waiting', 'claimed')
    );
  end loop;
  return new_code;
end;
$$;

-- Lookups ignore spaces, dashes and case.
create or replace function public.normalize_guardian_request_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
$$;

revoke execute on function public.guardian_request_is_waiting(public.guardian_request_status, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.generate_guardian_request_code() from public, anon, authenticated;
revoke execute on function public.normalize_guardian_request_code(text) from public, anon, authenticated;

-- 2. Guardian functions
create or replace function public.create_guardian_request()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.guardian_requests%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if (select role from public.profiles where id = v_uid) is distinct from 'guardian' then
    return jsonb_build_object('success', false, 'error', 'not_allowed');
  end if;

  -- Serializes one guardian's creates so parallel calls can't pass the
  -- caps below together.
  perform pg_advisory_xact_lock(hashtextextended('guardian_request_create:' || v_uid::text, 0));

  if (
    select count(*)
      from public.guardian_requests
     where guardian_id = v_uid
       and public.guardian_request_is_waiting(status, expires_at)
  ) >= 3 then
    return jsonb_build_object('success', false, 'error', 'too_many_waiting');
  end if;

  if (
    select count(*)
      from public.guardian_requests
     where guardian_id = v_uid
       and created_at > now() - interval '24 hours'
  ) >= 10 then
    return jsonb_build_object('success', false, 'error', 'daily_limit');
  end if;

  insert into public.guardian_requests (guardian_id, code, created_at, expires_at)
  values (v_uid, public.generate_guardian_request_code(), now(), now() + interval '24 hours')
  returning * into v_row;

  return jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'code', v_row.code,
    'created_at', v_row.created_at
  );
end;
$$;

create or replace function public.list_guardian_requests()
returns table (id uuid, code text, created_at timestamptz, state text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id,
         r.code,
         r.created_at,
         case when public.guardian_request_is_waiting(r.status, r.expires_at)
              then 'waiting' else 'inactive' end
    from public.guardian_requests r
   where r.guardian_id = auth.uid()
     and r.created_at > now() - interval '7 days'
   order by r.created_at desc;
$$;

-- Same result for waiting, claimed and declined, so cancelling never
-- reveals which one it was.
create or replace function public.cancel_guardian_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  update public.guardian_requests
     set status = 'cancelled'
   where id = p_request_id
     and guardian_id = auth.uid()
     and public.guardian_request_is_waiting(status, expires_at);

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.create_guardian_request() from public, anon;
revoke execute on function public.list_guardian_requests() from public, anon;
revoke execute on function public.cancel_guardian_request(uuid) from public, anon;
grant execute on function public.create_guardian_request() to authenticated;
grant execute on function public.list_guardian_requests() to authenticated;
grant execute on function public.cancel_guardian_request(uuid) to authenticated;

-- 3. Lookup limits
alter table public.auth_rate_limit_events
  drop constraint auth_rate_limit_events_bucket_check;
alter table public.auth_rate_limit_events
  add constraint auth_rate_limit_events_bucket_check
  check (bucket in ('ip', 'signin', 'reset', 'invite_lookup'));

-- Check only: seconds until the oldest counted attempt leaves the window,
-- or 0 when another attempt is allowed. Callers hold the same advisory
-- lock as auth_rate_limit_hit() for the key.
create or replace function public.auth_rate_limit_wait(
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
  select count(*), min(created_at)
    into v_count, v_oldest
    from public.auth_rate_limit_events
   where bucket = p_bucket
     and key_hash = p_key_hash
     and created_at > clock_timestamp() - v_window;

  if v_count >= p_max then
    return greatest(1, ceil(extract(epoch from (v_oldest + v_window - clock_timestamp())))::integer);
  end if;

  return 0;
end;
$$;

create or replace function public.auth_rate_limit_record(p_bucket text, p_key_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.auth_rate_limit_events (bucket, key_hash, created_at)
  values (p_bucket, p_key_hash, clock_timestamp());
$$;

revoke execute on function public.auth_rate_limit_wait(text, text, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.auth_rate_limit_record(text, text)
  from public, anon, authenticated;

-- 4. Claim (Edge Function only)

-- What the student's review screen needs. avatar_path is signed by the
-- Edge Function and never returned to the app.
create or replace function public.guardian_request_details(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'success', true,
           'request_id', r.id,
           'code', r.code,
           'expires_at', r.expires_at,
           'guardian_name', p.full_name,
           'avatar_path', p.avatar_url,
           'phone_last2', case
             when length(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')) >= 2
               then right(regexp_replace(p.phone, '\D', '', 'g'), 2)
           end
         )
    from public.guardian_requests r
    join public.profiles p on p.id = r.guardian_id
   where r.id = p_request_id;
$$;

revoke execute on function public.guardian_request_details(uuid) from public, anon, authenticated;

-- Not found, expired, cancelled, already claimed, the guardian's own code
-- and a non-student caller all give 'invalid_code' and count as a failed
-- lookup. Limits: 5 failures per 15 minutes and 20 per day per account.
create or replace function public.claim_guardian_request(p_student_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text := encode(extensions.digest('invite_lookup:' || p_student_id::text, 'sha256'), 'hex');
  v_wait integer;
  v_request public.guardian_requests%rowtype;
begin
  if p_student_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- Same lock key as auth_rate_limit_hit(), so parallel lookups by one
  -- account are counted one after another.
  perform pg_advisory_xact_lock(hashtextextended('invite_lookup:' || v_key, 0));

  v_wait := greatest(
    public.auth_rate_limit_wait('invite_lookup', v_key, 15 * 60, 5),
    public.auth_rate_limit_wait('invite_lookup', v_key, 24 * 60 * 60, 20)
  );
  if v_wait > 0 then
    return jsonb_build_object('success', false, 'error', 'rate_limited', 'retry_after_secs', v_wait);
  end if;

  select *
    into v_request
    from public.guardian_requests
   where code = public.normalize_guardian_request_code(p_code)
     and status = 'waiting'
     and expires_at > now()
   for update;

  if not found
    or v_request.guardian_id = p_student_id
    or (select role from public.profiles where id = p_student_id) is distinct from 'user'
  then
    perform public.auth_rate_limit_record('invite_lookup', v_key);
    return jsonb_build_object('success', false, 'error', 'invalid_code');
  end if;

  update public.guardian_requests
     set status = 'claimed',
         claimed_by = p_student_id,
         claimed_at = now()
   where id = v_request.id;

  return public.guardian_request_details(v_request.id);
end;
$$;

-- Re-opens the review screen for a request the student already claimed.
-- Not a lookup, so it never counts toward the limits.
create or replace function public.get_claimed_guardian_request(
  p_student_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.guardian_requests
     where id = p_request_id
       and claimed_by = p_student_id
       and status = 'claimed'
       and expires_at > now()
  ) then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  return public.guardian_request_details(p_request_id);
end;
$$;

revoke execute on function public.claim_guardian_request(uuid, text) from public, anon, authenticated;
revoke execute on function public.get_claimed_guardian_request(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_guardian_request(uuid, text) to service_role;
grant execute on function public.get_claimed_guardian_request(uuid, uuid) to service_role;

-- 5. Student functions

-- For the Guardians tab cards. The guardian's name only; the photo and
-- phone ending come from the Edge Function.
create or replace function public.list_my_guardian_requests()
returns table (id uuid, guardian_name text, created_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, p.full_name, r.created_at, r.expires_at
    from public.guardian_requests r
    join public.profiles p on p.id = r.guardian_id
   where r.claimed_by = auth.uid()
     and r.status = 'claimed'
     and r.expires_at > now()
   order by r.created_at desc;
$$;

-- An existing accepted link for the pair is kept and reported as success;
-- a revoked one stays revoked and a new accepted row is added.
create or replace function public.accept_guardian_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.guardian_requests%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
    into v_request
    from public.guardian_requests
   where id = p_request_id
     and claimed_by = v_uid
     and status = 'claimed'
     and expires_at > now()
   for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1
      from public.guardian_links
     where user_id = v_uid
       and guardian_id = v_request.guardian_id
       and status = 'accepted'
  ) then
    begin
      insert into public.guardian_links (user_id, guardian_id, status, accepted_at)
      values (v_uid, v_request.guardian_id, 'accepted', now());
    exception
      -- The pair got linked another way in the meantime.
      when unique_violation then
        null;
    end;
  end if;

  update public.guardian_requests
     set status = 'accepted',
         decided_at = now()
   where id = v_request.id;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.decline_guardian_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  update public.guardian_requests
     set status = 'declined',
         decided_at = now()
   where id = p_request_id
     and claimed_by = auth.uid()
     and status = 'claimed'
     and expires_at > now();

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.list_my_guardian_requests() from public, anon;
revoke execute on function public.accept_guardian_request(uuid) from public, anon;
revoke execute on function public.decline_guardian_request(uuid) from public, anon;
grant execute on function public.list_my_guardian_requests() to authenticated;
grant execute on function public.accept_guardian_request(uuid) to authenticated;
grant execute on function public.decline_guardian_request(uuid) to authenticated;

-- 6. Expire and purge. Declined rows keep their status; the guardian's
-- state already turns inactive at expires_at.
create or replace function public.expire_guardian_requests()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.guardian_requests
     set status = 'expired'
   where status in ('waiting', 'claimed')
     and expires_at <= now();

  delete from public.guardian_requests
   where created_at < now() - interval '30 days';
$$;

revoke execute on function public.expire_guardian_requests() from public, anon, authenticated;

do $$
begin
  perform cron.schedule(
    'expire-guardian-requests',
    '*/15 * * * *',
    'select public.expire_guardian_requests();'
  );
exception
  when others then
    raise notice 'Could not schedule expire_guardian_requests() via pg_cron (%).', sqlerrm;
end
$$;

-- 7. Realtime, for the student's Guardians tab. Skipped with a notice
-- where there is no supabase_realtime publication (the pglite RLS tests).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'guardian_requests'
    )
  then
    execute 'alter publication supabase_realtime add table public.guardian_requests';
  end if;
exception
  when others then
    raise notice 'Could not add guardian_requests to the supabase_realtime publication (%).', sqlerrm;
end
$$;
