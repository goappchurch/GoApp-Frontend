import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventStatus } from '../types';
import { statusColors, statusBgColors, statusTextColors, radius } from '../constants/theme';

interface Props {
  status: EventStatus;
  size?: 'sm' | 'md';
}

const labels: Record<EventStatus, string> = {
  tentative: 'Tentative',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const dots: Record<EventStatus, string> = {
  tentative: '🟡',
  confirmed: '🟢',
  rejected: '🔴',
  cancelled: '🔴',
  completed: '⚫',
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const isSmall = size === 'sm';
  return (
    <View style={[
      styles.badge,
      { backgroundColor: statusBgColors[status] ?? '#F1F5F9' },
      isSmall && styles.badgeSm,
    ]}>
      <View style={[styles.dot, { backgroundColor: statusColors[status] ?? '#64748B' }]} />
      <Text style={[
        styles.text,
        { color: statusTextColors[status] ?? '#334155' },
        isSmall && styles.textSm,
      ]}>
        {labels[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 11,
  },
});
