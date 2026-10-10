import { functionRegion } from '@/lib/function-region';
import { supabase } from '@/lib/supabase';

// Client for guardian invite requests: the guardian creates a code, the
// student enters it, reviews who is asking and accepts or declines. The
// server side is supabase/migrations/20261010120000_guardian_requests.sql
// and supabase/functions/claim-guardian-request.

// --- Guardian ---

// A guardian only ever sees two states, so a decline looks exactly like a
// code nobody used.
export type GuardianRequestSummary = {
  id: string;
  code: string;
  createdAt: string;
  state: 'waiting' | 'inactive';
};

export type CreateRequestResult =
  | { kind: 'ok'; code: string }
  | { kind: 'too_many_waiting' }
  | { kind: 'daily_limit' }
  | { kind: 'error' };

type RpcFailure = { success: false; error: string };

// null when the list couldn't be loaded.
export async function listGuardianRequests(): Promise<GuardianRequestSummary[] | null> {
  const { data, error } = await supabase.rpc('list_guardian_requests');
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    createdAt: row.created_at,
    state: row.state === 'waiting' ? 'waiting' : 'inactive',
  }));
}

export async function createGuardianRequest(): Promise<CreateRequestResult> {
  const { data, error } = await supabase.rpc('create_guardian_request');
  if (error) return { kind: 'error' };
  const result = data as unknown as { success: true; code: string } | RpcFailure;
  if (result.success) return { kind: 'ok', code: result.code };
  if (result.error === 'too_many_waiting' || result.error === 'daily_limit') {
    return { kind: result.error };
  }
  return { kind: 'error' };
}

// not_found means the code is already inactive, which is what the guardian
// wanted.
export async function cancelGuardianRequest(requestId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_guardian_request', {
    p_request_id: requestId,
  });
  if (error) return false;
  const result = data as unknown as { success: true } | RpcFailure;
  return result.success || result.error === 'not_found';
}

// --- Student ---

export type ClaimedRequest = {
  requestId: string;
  code: string;
  expiresAt: string;
  guardianName: string | null;
  // Last two digits, or null when the guardian has no phone on file.
  phoneLast2: string | null;
  // Signed for about ten minutes; null when the guardian has no photo.
  avatarUrl: string | null;
};

export type ClaimResult =
  | { kind: 'ok'; request: ClaimedRequest }
  // A code that can't be used, whatever the reason, or a request that is
  // no longer open.
  | { kind: 'not_available' }
  | { kind: 'rate_limited'; retryAfterSecs: number }
  | { kind: 'not_authenticated' }
  | { kind: 'error' };

export type OpenRequest = {
  id: string;
  guardianName: string | null;
  createdAt: string;
  expiresAt: string;
};

export type DecideResult = 'ok' | 'not_available' | 'error';

// Looks up a guardian's code (claiming it for this student), or re-opens a
// request the student already claimed.
export async function claimGuardianRequest(
  input: { code: string } | { requestId: string }
): Promise<ClaimResult> {
  let data: unknown;
  let response: Response | undefined;
  try {
    ({ data, response } = await supabase.functions.invoke('claim-guardian-request', {
      body: input,
      region: functionRegion(),
    }));
  } catch {
    return { kind: 'error' };
  }

  switch (response?.status) {
    case 200: {
      const request = (data as { request?: ClaimedRequest } | null)?.request;
      return request ? { kind: 'ok', request } : { kind: 'error' };
    }
    case 404:
      return { kind: 'not_available' };
    case 429:
      return {
        kind: 'rate_limited',
        retryAfterSecs: Number(response.headers.get('Retry-After')) || 60,
      };
    case 401:
      return { kind: 'not_authenticated' };
    default:
      return { kind: 'error' };
  }
}

// null when the list couldn't be loaded.
export async function listMyGuardianRequests(): Promise<OpenRequest[] | null> {
  const { data, error } = await supabase.rpc('list_my_guardian_requests');
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    guardianName: row.guardian_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export function acceptGuardianRequest(requestId: string): Promise<DecideResult> {
  return decide('accept_guardian_request', requestId);
}

export function declineGuardianRequest(requestId: string): Promise<DecideResult> {
  return decide('decline_guardian_request', requestId);
}

async function decide(
  fn: 'accept_guardian_request' | 'decline_guardian_request',
  requestId: string
): Promise<DecideResult> {
  const { data, error } = await supabase.rpc(fn, { p_request_id: requestId });
  if (error) return 'error';
  const result = data as unknown as { success: true } | RpcFailure;
  if (result.success) return 'ok';
  return result.error === 'not_found' ? 'not_available' : 'error';
}

// The claim already returns everything the review screen shows, so it is
// handed over once instead of fetched again. Re-opening the screen later
// fetches fresh details, with a new signed photo URL.
const justClaimed = new Map<string, ClaimedRequest>();

export function rememberClaimedRequest(request: ClaimedRequest): void {
  justClaimed.set(request.requestId, request);
}

export function takeClaimedRequest(requestId: string): ClaimedRequest | null {
  const request = justClaimed.get(requestId) ?? null;
  justClaimed.delete(requestId);
  return request;
}
