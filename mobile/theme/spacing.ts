// Values taken from the design boards. The screen gutter (22) is the
// boards' horizontal page padding; use it for the outer edge of every
// screen so content lines up across the app.

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const sizes = {
  // Android's recommended minimum; iOS asks for 44, so 48 covers both.
  minTouch: 48,
  button: 58,
  buttonSmall: 44,
  input: 54,
  iconTile: 48,
  screenGutter: spacing.xl,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
