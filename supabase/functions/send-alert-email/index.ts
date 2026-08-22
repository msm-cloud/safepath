// send-alert-email — Edge Function
//
// Triggered by the alerts_notify_guardians_on_insert trigger (see
// supabase/migrations/20260822153852_alert_guardian_notification_trigger.sql)
// whenever a new alert is inserted for an at-risk user. Looks up that
// user's accepted guardians and emails each one via Resend.
//
// Deploy with: supabase functions deploy send-alert-email
//
// Env vars used:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided by the Edge
//     Function runtime, not something to configure manually.
//   RESEND_API_KEY — set as a project secret in the dashboard already.
//   DASHBOARD_URL — optional; defaults to http://localhost:3000 below.
//
// This function intentionally does NOT import types from
// packages/shared-types/ — Deno Edge Functions are bundled/deployed as a
// self-contained unit rooted at supabase/functions/, and a relative import
// reaching outside that tree is not guaranteed to be resolvable by the
// deploy bundler. Minimal local types instead.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const RESEND_API_URL = 'https://api.resend.com/emails';
// Resend's shared test/sandbox sender — swap for a verified domain's
// address once one exists.
const FROM_ADDRESS = 'onboarding@resend.dev';
const DASHBOARD_URL = Deno.env.get('DASHBOARD_URL') ?? 'http://localhost:3000';

type RequestBody = {
  alert_id?: unknown;
};

type AlertRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
};

type ProfileRow = {
  full_name: string;
};

type GuardianLinkRow = {
  guardian_id: string | null;
};

type GuardianNotifyResult = {
  guardian_id: string;
  email: string | null;
  status: 'sent' | 'failed' | 'no_email';
  error?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'method_not_allowed' }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'invalid_json_body' }, 400);
  }

  const alertId = body.alert_id;
  if (!alertId || typeof alertId !== 'string') {
    return jsonResponse({ success: false, error: 'missing_alert_id' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    // Both are auto-provided by the Edge Function runtime — only missing
    // if something is deeply misconfigured.
    console.error('send-alert-email: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
    return jsonResponse({ success: false, error: 'server_misconfigured' }, 500);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('send-alert-email: RESEND_API_KEY not set.');
    return jsonResponse({ success: false, error: 'server_misconfigured' }, 500);
  }

  // Bypasses RLS — this function only ever runs server-side, invoked by the
  // alerts_notify_guardians_on_insert trigger with a service_role bearer
  // token, never called directly by mobile/dashboard clients.
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: alertData, error: alertError } = await supabase
    .from('alerts')
    .select('id, user_id, status, created_at')
    .eq('id', alertId)
    .single();

  if (alertError || !alertData) {
    return jsonResponse({ success: false, error: 'alert_not_found' }, 404);
  }
  const alert = alertData as AlertRow;

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', alert.user_id)
    .single();

  if (profileError || !profileData) {
    return jsonResponse({ success: false, error: 'profile_not_found' }, 404);
  }
  const profile = profileData as ProfileRow;
  const displayName = profile.full_name.trim() || 'Someone';

  const { data: linksData, error: linksError } = await supabase
    .from('guardian_links')
    .select('guardian_id')
    .eq('user_id', alert.user_id)
    .eq('status', 'accepted');

  if (linksError) {
    console.error('send-alert-email: failed to load guardian_links —', linksError.message);
    return jsonResponse({ success: false, error: 'guardian_lookup_failed' }, 500);
  }

  const guardianIds = ((linksData ?? []) as GuardianLinkRow[])
    .map((link) => link.guardian_id)
    .filter((id): id is string => !!id);

  if (guardianIds.length === 0) {
    return jsonResponse({
      success: true,
      alert_id: alert.id,
      notified: 0,
      failed: 0,
      message: 'No accepted guardians linked to this user — no one to notify.',
    });
  }

  const results: GuardianNotifyResult[] = [];

  for (const guardianId of guardianIds) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(guardianId);
    const email = userData?.user?.email ?? null;

    if (userError || !email) {
      results.push({
        guardian_id: guardianId,
        email: null,
        status: 'no_email',
        error: userError?.message ?? 'guardian has no email on file',
      });
      continue;
    }

    const sendResult = await sendAlertEmail({
      resendApiKey,
      to: email,
      fullName: displayName,
      alertCreatedAt: alert.created_at,
    });

    results.push({
      guardian_id: guardianId,
      email,
      status: sendResult.ok ? 'sent' : 'failed',
      error: sendResult.ok ? undefined : sendResult.error,
    });
  }

  const notified = results.filter((r) => r.status === 'sent').length;
  const failed = results.length - notified;

  return jsonResponse({
    success: true,
    alert_id: alert.id,
    notified,
    failed,
    results,
  });
});

async function sendAlertEmail(params: {
  resendApiKey: string;
  to: string;
  fullName: string;
  alertCreatedAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { resendApiKey, to, fullName, alertCreatedAt } = params;

  const alertTime = new Date(alertCreatedAt).toUTCString();
  const dashboardLink = `${DASHBOARD_URL}/dashboard`;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject: `🚨 SafePath Alert: ${fullName} needs help`,
        html: `
          <p>🚨 <strong>${escapeHtml(fullName)}</strong> just triggered an SOS alert on SafePath.</p>
          <p><strong>Time:</strong> ${alertTime}</p>
          <p><a href="${dashboardLink}">Open the SafePath dashboard</a> to see more and check on them.</p>
        `,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Resend API returned ${response.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
