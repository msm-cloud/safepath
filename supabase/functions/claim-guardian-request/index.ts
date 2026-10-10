// claim-guardian-request — Edge Function
//
// The student's side of a guardian invite request: look up a guardian's
// code, or re-open a request the student already claimed, and get what the
// review screen shows. The avatar comes back as a short-lived signed URL,
// so its storage path never reaches the app.
//
//   POST { code }         claims the code for the signed-in student
//   POST { requestId }    the same details again, for a request the
//                         student claimed that is still open
//     200 { request: { requestId, code, expiresAt, guardianName,
//                      phoneLast2, avatarUrl } }
//     401 { error: 'not_authenticated' }
//     404 { error: 'invalid_code' }   any failed code lookup, whatever the reason
//     404 { error: 'not_found' }      any failed requestId lookup
//     429 { error: 'rate_limited' } + Retry-After
//
// Limits, roles and expiry are enforced in claim_guardian_request and
// get_claimed_guardian_request
// (supabase/migrations/20261010120000_guardian_requests.sql), which only
// service_role can call. The logic is in handler.ts.
//
// Deployed with JWT verification on; the handler then resolves the
// caller's access token to a user, so the anon key alone gets a 401.
//
// Env vars used:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — provided by the Edge
//     Function runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

import { createHandler, type RpcResult } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getUserId(accessToken: string): Promise<string | null> {
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user.id;
}

async function rpc(name: string, args: Record<string, string>): Promise<RpcResult> {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error(`${name} failed: ${error.code ?? error.message}`);
  return data as RpcResult;
}

async function signAvatar(path: string, expiresInSecs: number): Promise<string> {
  const { data, error } = await admin.storage.from('avatars').createSignedUrl(path, expiresInSecs);
  if (error || !data) throw new Error(`signing failed: ${error?.message ?? 'no data'}`);
  return data.signedUrl;
}

Deno.serve(
  createHandler({
    getUserId,
    claim: (studentId, code) =>
      rpc('claim_guardian_request', { p_student_id: studentId, p_code: code }),
    getClaimed: (studentId, requestId) =>
      rpc('get_claimed_guardian_request', { p_student_id: studentId, p_request_id: requestId }),
    signAvatar,
  })
);
