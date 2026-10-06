// The privacy policy page (the dashboard's /privacy, which its sign-up and
// log-in pages link to). Comes from config because the dashboard's public
// address differs per deployment; empty hides the sign-up privacy line.
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? '';
