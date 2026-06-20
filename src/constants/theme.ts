export const colors = {
  // ── Brand: Deep Indigo (single hue across the whole app) ──
  primary: '#4F46E5',       // indigo-600  — primary actions, active states
  primaryDark: '#4338CA',   // indigo-700
  primaryDarker: '#3730A3', // indigo-800  — header gradient top
  primaryLight: '#EEF2FF',  // indigo-50   — tinted surfaces
  primaryMid: '#E0E7FF',    // indigo-100
  accent: '#6366F1',        // indigo-500  — accents / "today"

  // ── Semantic status (functional cues only, used sparingly) ──
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',

  // ── Neutrals ──
  background: '#F8FAFC',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  inactive: '#CBD5E1',
};

// ── Unified gradient tokens ──
// Rule: only 2 (occasionally 3) monochromatic indigo stops. Cards stay solid white.
export const gradients = {
  // Headers / hero banners
  header: ['#3730A3', '#4F46E5'] as const,
  // Hero that fades down into the page background
  headerFade: ['#3730A3', '#4F46E5', '#A5B4FC'] as const,
  // Primary buttons / call-to-action
  primary: ['#4F46E5', '#4338CA'] as const,
  // Soft tinted surface (e.g. badges, loading backdrops)
  primarySoft: ['#EEF2FF', '#E0E7FF'] as const,
  // Semantic — used only for genuinely meaningful status
  success: ['#16A34A', '#15803D'] as const,
  // Cards are solid white now (kept as a token so existing call sites stay valid)
  card: ['#FFFFFF', '#FFFFFF'] as const,
};

export const eventTypeLabels: Record<string, string> = {
  sunday_service: 'Sunday Service',
  youth_conference: 'Youth Conference',
  workshop: 'Workshop / Seminar',
  wedding: 'Wedding Ceremony',
  special_event: 'Special Event',
};

export const eventTypeIcons: Record<string, string> = {
  sunday_service: '⛪',
  youth_conference: '🎯',
  workshop: '📚',
  wedding: '💍',
  special_event: '✨',
  travel: '✈️',
  personal: '👤',
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

// Neutral, restrained shadows (no colored glow — keeps the UI calm/professional)
export const shadow = {
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};
