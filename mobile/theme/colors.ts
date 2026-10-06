// Light values come straight from the design boards (docs/design/safepath-ui).
// The boards have no dark theme; dark values are built from the fake call
// board's surfaces (#11131F, #22263C, #2A2E48) and checked for WCAG AA
// contrast by scripts/check-contrast.ts.

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  track: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  border: string;
  borderInput: string;
  focus: string;
  // The main call-to-action colour on the boards is dark ink, not the brand
  // indigo; indigo is kept for links, selection and secondary emphasis.
  ink: string;
  inkPressed: string;
  onInk: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  // Fill for SOS and destructive buttons. Text in red uses dangerText, which
  // is lighter in dark mode so it stays readable on dark surfaces.
  danger: string;
  dangerPressed: string;
  onDanger: string;
  dangerText: string;
  dangerBorder: string;
  dangerSoft: string;
  onDangerSoft: string;
  // Controls drawn straight on a danger fill (SOS active, guardian alert
  // header). The fill is the same in both schemes, so these are too.
  onDangerBorder: string;
  onDangerFaint: string;
  emergencyCallPressed: string;
  onEmergencyCall: string;
  success: string;
  successSoft: string;
  onSuccessSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  info: string;
  infoSoft: string;
  onInfoSoft: string;
  overlay: string;
  onOverlay: string;
  shadow: string;
};

const light: ThemeColors = {
  bg: '#F6F4F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EEF4',
  track: '#EAE7EF',
  text: '#171A2F',
  textSecondary: '#474B5C',
  textMuted: '#5C6070',
  textDisabled: '#A9ACBE',
  border: '#E4E1EA',
  borderInput: '#D9D5E1',
  focus: '#3B45B5',
  ink: '#171A2F',
  inkPressed: '#2A2E48',
  onInk: '#FFFFFF',
  primary: '#3B45B5',
  primaryPressed: '#2A3290',
  onPrimary: '#FFFFFF',
  primarySoft: '#E6E8F7',
  onPrimarySoft: '#2A3290',
  danger: '#C8231B',
  dangerPressed: '#9B1B14',
  onDanger: '#FFFFFF',
  dangerText: '#9B1B14',
  dangerBorder: '#E7B7B3',
  dangerSoft: '#FBE4E2',
  onDangerSoft: '#9B1B14',
  onDangerBorder: 'rgba(255,255,255,0.6)',
  onDangerFaint: 'rgba(255,255,255,0.14)',
  emergencyCallPressed: '#FBE4E2',
  onEmergencyCall: '#9B1B14',
  success: '#1E8E3E',
  successSoft: '#DCE8E0',
  onSuccessSoft: '#17602C',
  warning: '#B86E00',
  warningSoft: '#FBE9D7',
  onWarningSoft: '#7A4300',
  info: '#0B6E73',
  infoSoft: '#DDEEEE',
  onInfoSoft: '#07555A',
  overlay: 'rgba(17,19,31,0.55)',
  onOverlay: '#FFFFFF',
  shadow: '#171A2F',
};

const dark: ThemeColors = {
  bg: '#11131F',
  surface: '#1B1E30',
  surfaceMuted: '#22263C',
  track: '#22263C',
  text: '#F3F2F7',
  textSecondary: '#C9CBD9',
  textMuted: '#A9ACBE',
  textDisabled: '#6B6F85',
  border: '#2A2E48',
  borderInput: '#3A3F5C',
  focus: '#8E96F2',
  ink: '#F3F2F7',
  inkPressed: '#D6D5E0',
  onInk: '#171A2F',
  primary: '#8E96F2',
  primaryPressed: '#A9AFF5',
  onPrimary: '#11131F',
  primarySoft: '#262B55',
  onPrimarySoft: '#C9CCF8',
  danger: '#C8231B',
  dangerPressed: '#9B1B14',
  onDanger: '#FFFFFF',
  dangerText: '#FF8A80',
  dangerBorder: '#6B2A2A',
  dangerSoft: '#3A1A1C',
  onDangerSoft: '#FFB4AB',
  onDangerBorder: 'rgba(255,255,255,0.6)',
  onDangerFaint: 'rgba(255,255,255,0.14)',
  emergencyCallPressed: '#FBE4E2',
  onEmergencyCall: '#9B1B14',
  success: '#4CC274',
  successSoft: '#16301F',
  onSuccessSoft: '#A6E3B5',
  warning: '#F0A742',
  warningSoft: '#3A2A14',
  onWarningSoft: '#F5C98B',
  info: '#5CC3C8',
  infoSoft: '#123436',
  onInfoSoft: '#A8E1E3',
  overlay: 'rgba(17,19,31,0.55)',
  onOverlay: '#FFFFFF',
  shadow: '#000000',
};

export const colors: Record<ColorScheme, ThemeColors> = { light, dark };
