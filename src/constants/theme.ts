export const colors = {
  primary: '#1A56DB',
  primaryDark: '#1345B8',
  primaryLight: '#EFF6FF',
  primaryMid: '#DBEAFE',
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  background: '#F5F7FA',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  inactive: '#CBD5E1',
};

export const gradients = {
  primary: ['#1A56DB', '#1345B8'] as const,
  primarySoft: ['#EFF6FF', '#DBEAFE'] as const,
  success: ['#16A34A', '#15803D'] as const,
  warm: ['#1A56DB', '#7C3AED'] as const,
  card: ['#FFFFFF', '#F8FAFC'] as const,
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
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const shadow = {
  xs: {
    shadowColor: '#1A56DB',
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
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
};
