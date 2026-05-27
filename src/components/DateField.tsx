import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';

interface Props {
  label?: string;
  value?: string;
  onChange: (iso: string) => void;
  mode?: 'datetime' | 'date';
  placeholder?: string;
  accentColor?: string;
}

export default function DateField({
  label,
  value,
  onChange,
  mode = 'datetime',
  placeholder,
  accentColor = colors.primary,
}: Props) {
  const [showIOS, setShowIOS] = useState(false);

  const safeDate = value
    ? new Date(value + (mode === 'date' && value.length === 10 ? 'T00:00:00' : ''))
    : new Date();

  const dateStr = value
    ? safeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : null;

  const timeStr =
    value && mode === 'datetime'
      ? new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : null;

  const openPicker = () => {
    if (Platform.OS === 'android') {
      if (mode === 'date') {
        DateTimePickerAndroid.open({
          value: safeDate,
          mode: 'date',
          onChange: (_, d) => { if (d) onChange(d.toISOString().split('T')[0]); },
        });
      } else {
        DateTimePickerAndroid.open({
          value: safeDate,
          mode: 'date',
          onChange: (_, d) => {
            if (!d) return;
            DateTimePickerAndroid.open({
              value: d,
              mode: 'time',
              is24Hour: false,
              onChange: (_, t) => {
                if (!t) return;
                const combined = new Date(d);
                combined.setHours(t.getHours(), t.getMinutes());
                onChange(combined.toISOString());
              },
            });
          },
        });
      }
    } else {
      setShowIOS(true);
    }
  };

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.container} activeOpacity={0.88} onPress={openPicker}>
        <LinearGradient
          colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.84)']}
          style={styles.inner}
        >
          <LinearGradient
            colors={[accentColor, '#C084FC'] as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons
              name="calendar-outline"
              size={11}
              color="#fff"
            />
          </LinearGradient>

          <View style={{ flex: 1 }}>
            {dateStr ? (
              <>
                <Text style={styles.dateText}>{dateStr}</Text>
                {timeStr && <Text style={styles.timeText}>{timeStr}</Text>}
              </>
            ) : (
              <Text style={styles.placeholderText}>{placeholder ?? 'Select date'}</Text>
            )}
          </View>

          <Ionicons name="chevron-down" size={12} color="#94A3B8" />
        </LinearGradient>
      </TouchableOpacity>

      {Platform.OS === 'ios' && showIOS && (
        <Modal transparent animationType="slide" visible={showIOS}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowIOS(false)}>
                  <Text style={[styles.done, { color: accentColor }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={safeDate}
                mode={mode}
                display="spinner"
                onChange={(_, d) => {
                  if (!d) return;
                  onChange(mode === 'date' ? d.toISOString().split('T')[0] : d.toISOString());
                }}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginLeft: 2,
  },
  container: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C4CDD8',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  inner: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  dateText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  timeText: { fontSize: 10, marginTop: 1, color: '#64748B', fontWeight: '500' },
  placeholderText: { fontSize: 12, color: '#94A3B8', fontWeight: '400' },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.38)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', paddingBottom: 24,
  },
  modalHeader: {
    paddingHorizontal: 22, paddingVertical: 18,
    alignItems: 'flex-end',
    borderBottomWidth: 1, borderBottomColor: '#EEF2FF',
  },
  done: { fontWeight: '800', fontSize: 16 },
});
