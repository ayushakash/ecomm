import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Chardeevari design tokens. Mirrors client/tailwind.config.js:
 * slate primary, amber secondary, emerald success, red danger, brand orange (logo).
 */
export const palette = {
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red600: '#dc2626',
  orange50: '#FFF7EF',
  orange100: '#FFF1E3',
  orange500: '#F18C34',
  orange600: '#E07A1F',
  blue50: '#eff6ff',
  blue500: '#3b82f6',
  whatsapp: '#25D366',
  white: '#ffffff',
  black: '#000000',
} as const;

export const colors = {
  primary: palette.slate700,
  primaryLight: palette.slate600,
  primaryDark: palette.slate800,
  primarySoft: palette.slate100,
  onPrimary: palette.white,

  secondary: palette.amber500,
  secondaryDark: palette.amber600,
  secondarySoft: palette.amber50,
  onSecondary: palette.slate900,

  /** Logo orange — use sparingly for brand moments (logo, hero accents). */
  brand: palette.orange500,
  brandSoft: palette.orange50,

  success: palette.emerald500,
  successDark: palette.emerald700,
  successSoft: palette.emerald50,
  danger: palette.red500,
  dangerDark: palette.red600,
  dangerSoft: palette.red50,
  warning: palette.amber500,
  warningSoft: palette.amber50,
  info: palette.blue500,
  infoSoft: palette.blue50,
  whatsapp: palette.whatsapp,

  background: '#F5F6F8',
  surface: palette.white,
  surfaceMuted: palette.slate50,
  border: '#E7E9ED',
  borderStrong: palette.slate300,
  divider: palette.slate100,

  text: palette.slate900,
  textSecondary: palette.slate600,
  textMuted: palette.slate400,
  textInverse: palette.white,

  overlay: 'rgba(15, 23, 42, 0.55)',
  skeleton: '#E9ECF1',
  skeletonHighlight: '#F6F7F9',
} as const;

export type ColorToken = keyof typeof colors;
/** Theme color key or any raw color string. */
export type ColorValue = ColorToken | (string & {});
const isColorToken = (value: string): value is ColorToken => value in colors;
/** Resolve a theme color key to its hex; raw colors pass through. */
export const resolveColor = (value: ColorValue): string => (isColorToken(value) ? colors[value] : value);

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Horizontal screen gutter. */
export const SCREEN_PADDING = spacing.lg;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Plus Jakarta Sans family names as registered by useFonts in App.tsx. */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fonts;

type TypeToken = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

/** Text variants consumed by <Text variant="...">. */
export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  title: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13, letterSpacing: 0.2 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  price: { fontFamily: fonts.extrabold, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
} satisfies Record<string, TypeToken>;

export type TypographyVariant = keyof typeof typography;

const shadow = (elevation: number, opacity: number, radius: number, offsetY: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: palette.slate900,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
  });

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(1, 0.06, 4, 1),
  md: shadow(3, 0.08, 10, 3),
  lg: shadow(8, 0.12, 18, 6),
  /** Floating bars / bottom sheets (casts upward). */
  float: shadow(12, 0.18, 20, -2),
} as const;

export const layout = {
  /** Minimum tap target. */
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  touchMin: 44,
  headerHeight: 56,
  /** Space to reserve at list bottom so FloatingCartBar does not cover content. */
  floatingCartBarSpace: 88,
} as const;

export const theme = { palette, colors, spacing, radii, fonts, typography, shadows, layout } as const;
export type Theme = typeof theme;
export default theme;
