// Where people are sent when their account itself is broken. Comes from
// config so each deployment sets its own; empty means no address is shown.
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
