import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Dimensions, Animated, TextInput,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CELL = Math.floor((SCREEN_W - 56) / 7);

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const QUICK_TIMES = [
  { label: '9 AM',  h: 9,  m: 0 },
  { label: '10 AM', h: 10, m: 0 },
  { label: '12 PM', h: 12, m: 0 },
  { label: '3 PM',  h: 15, m: 0 },
  { label: '6 PM',  h: 18, m: 0 },
];


function buildGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    while (row.length < 7) row.push(null);
    rows.push(row);
  }
  return rows;
}


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
  const [show, setShow] = useState(false);

  const parseDate = () => value
    ? new Date(value + (mode === 'date' && value.length === 10 ? 'T00:00:00' : ''))
    : new Date();

  const [viewYear, setViewYear] = useState(() => parseDate().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseDate().getMonth());
  const [selYear, setSelYear] = useState<number | null>(() => value ? parseDate().getFullYear() : null);
  const [selMonth, setSelMonth] = useState<number | null>(() => value ? parseDate().getMonth() : null);
  const [selDay, setSelDay] = useState<number | null>(() => value ? parseDate().getDate() : null);
  const [hour24, setHour24] = useState(() => parseDate().getHours());
  const [minute, setMinute] = useState(() => parseDate().getMinutes());
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [hourText, setHourText] = useState('12');
  const [minText, setMinText] = useState('00');
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Animated values
  const confirmAnim = useRef(new Animated.Value(0)).current;
  const previewAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const hasSelection = selDay !== null;

  useEffect(() => {
    if (!show) {
      confirmAnim.setValue(0);
      previewAnim.setValue(0);
      return;
    }
    Animated.spring(confirmAnim, {
      toValue: hasSelection ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
    Animated.timing(previewAnim, {
      toValue: hasSelection ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hasSelection, show]);

  const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const stepMonth = (dir: 1 | -1) => {
    Haptics.selectionAsync();
    const d = new Date(viewYear, viewMonth + dir, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };


  const open = () => {
    const d = parseDate();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelYear(value ? d.getFullYear() : null);
    setSelMonth(value ? d.getMonth() : null);
    setSelDay(value ? d.getDate() : null);
    setHour24(d.getHours());
    setMinute(d.getMinutes());
    setHourText(String(d.getHours() % 12 || 12));
    setMinText(String(d.getMinutes()).padStart(2, '0'));
    setShowTimeModal(false);
    setShow(true);
  };

  const handleConfirm = () => {
    if (!hasSelection) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (mode === 'date') {
      onChange(`${selYear}-${String(selMonth! + 1).padStart(2, '0')}-${String(selDay).padStart(2, '0')}`);
    } else {
      onChange(new Date(selYear!, selMonth!, selDay!, hour24, minute).toISOString());
    }
    setShow(false);
  };

  // Trigger display
  const safeDate = parseDate();
  const dateStr = value
    ? safeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : null;
  const timeStr = value && mode === 'datetime'
    ? safeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const displayAmpm = hour24 >= 12 ? 'PM' : 'AM';

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {/* ── Trigger ── */}
      <TouchableOpacity style={styles.container} activeOpacity={0.88} onPress={open}>
        <LinearGradient
          colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.84)']}
          style={styles.inner}
        >
          <LinearGradient
            colors={[accentColor, '#C084FC'] as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="calendar-outline" size={11} color="#fff" />
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

      {/* ── Modal ── */}
      <Modal transparent animationType="slide" visible={show} onRequestClose={() => setShow(false)} statusBarTranslucent>
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShow(false)} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShow(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {mode === 'date' ? 'Select Date' : 'Select Date & Time'}
              </Text>
              <TouchableOpacity
                onPress={handleConfirm}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ opacity: hasSelection ? 1 : 0.3 }}
                disabled={!hasSelection}
              >
                <Text style={[styles.doneText, { color: accentColor }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* ── Calendar ── */}
            <ScrollView ref={scrollRef} bounces={false} showsVerticalScrollIndicator={false}>

                {/* Month navigation */}
                <View style={styles.monthNav}>
                  <TouchableOpacity onPress={() => stepMonth(-1)} style={styles.monthNavBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color={accentColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.monthTitle}>
                      {MONTHS[viewMonth]} {viewYear}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => stepMonth(1)} style={styles.monthNavBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={20} color={accentColor} />
                  </TouchableOpacity>
                </View>

                {/* Calendar grid */}
                <View style={styles.calWrap}>
                  <View style={styles.weekRow}>
                    {WEEKDAYS.map((d, i) => (
                      <View key={d} style={styles.cell}>
                        <Text style={[styles.weekText, (i === 0 || i === 6) && { color: accentColor + 'AA' }]}>{d}</Text>
                      </View>
                    ))}
                  </View>
                  {grid.map((row, ri) => (
                    <View key={ri} style={styles.dayRow}>
                      {row.map((day, ci) => {
                        const isSelected = day !== null && day === selDay && viewMonth === selMonth && viewYear === selYear;
                        const dsKey = `${viewYear}-${viewMonth}-${day}`;
                        const isToday = day !== null && dsKey === todayStr;
                        const isWeekend = ci === 0 || ci === 6;
                        return (
                          <TouchableOpacity
                            key={ci}
                            style={[styles.cell, { height: CELL }]}
                            activeOpacity={day ? 0.7 : 1}
                            onPress={() => {
                              if (!day) return;
                              Haptics.selectionAsync();
                              setSelDay(day);
                              setSelMonth(viewMonth);
                              setSelYear(viewYear);
                            }}
                          >
                            {isSelected ? (
                              <LinearGradient
                                colors={[accentColor, accentColor + 'BB'] as [string, string]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.daySel}
                              >
                                <Text style={styles.daySelText}>{day}</Text>
                              </LinearGradient>
                            ) : (
                              <View style={[
                                styles.dayInner,
                                isToday && { borderWidth: 2, borderColor: accentColor },
                              ]}>
                                <Text style={[
                                  styles.dayText,
                                  !day && { opacity: 0 },
                                  isWeekend && !!day && { color: accentColor },
                                  isToday && { fontWeight: '800' },
                                ]}>
                                  {day ?? 0}
                                </Text>
                                {isToday && <View style={[styles.todayDot, { backgroundColor: accentColor }]} />}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>

                <View style={{ height: 8 }} />
              </ScrollView>

            {/* ── Time chips ── */}
            {mode === 'datetime' && (
              <View style={styles.timeSection}>
                <Text style={styles.timeSectionLabel}>Time</Text>
                <View style={styles.timeChipRow}>
                  {QUICK_TIMES.map(({ label: lbl, h, m }) => {
                    const active = hour24 === h && minute === m;
                    return (
                      <TouchableOpacity
                        key={lbl}
                        onPress={() => { Haptics.selectionAsync(); setHour24(h); setMinute(m); }}
                        style={[styles.timeChip, active && { backgroundColor: accentColor, borderColor: accentColor }]}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.timeChipText, active && { color: '#fff', fontWeight: '700' }]}>{lbl}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => {
                      setHourText(String(hour24 % 12 || 12));
                      setMinText(String(minute).padStart(2, '0'));
                      setShowTimeModal(true);
                    }}
                    style={styles.timeChip}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="time-outline" size={13} color="#64748B" />
                    <Text style={styles.timeChipText}>Custom</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Animated confirm button */}
            <Animated.View style={[
              styles.confirmWrap,
              {
                opacity: confirmAnim,
                transform: [{ translateY: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}>
              <TouchableOpacity onPress={handleConfirm} activeOpacity={0.85} disabled={!hasSelection}>
                <LinearGradient
                  colors={[accentColor, accentColor + 'BB'] as [string, string]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.confirmBtn}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.confirmText}>Confirm</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Custom time modal ── */}
      <Modal transparent animationType="slide" visible={showTimeModal} onRequestClose={() => setShowTimeModal(false)} statusBarTranslucent>
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowTimeModal(false)} />
            <View style={[styles.timeSheet, { marginBottom: kbHeight }]}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setShowTimeModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Set Time</Text>
                <TouchableOpacity onPress={() => setShowTimeModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.doneText, { color: accentColor }]}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.timeModalBody}>
                <View style={styles.timeInputRow}>
                  <View style={styles.timeInputBlock}>
                    <Text style={styles.timeInputLabel}>Hour</Text>
                    <TextInput
                      style={[styles.timeInputField, { borderColor: accentColor + '66', color: accentColor }]}
                      value={hourText}
                      onChangeText={(t) => {
                        const clean = t.replace(/[^0-9]/g, '').slice(0, 2);
                        setHourText(clean);
                        const n = parseInt(clean);
                        if (!isNaN(n) && n >= 1 && n <= 12) {
                          setHour24(displayAmpm === 'PM' ? (n === 12 ? 12 : n + 12) : (n === 12 ? 0 : n));
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      textAlign="center"
                      placeholder="12"
                      placeholderTextColor="#CBD5E1"
                    />
                  </View>
                  <Text style={[styles.timeInputSep, { color: accentColor }]}>:</Text>
                  <View style={styles.timeInputBlock}>
                    <Text style={styles.timeInputLabel}>Minute</Text>
                    <TextInput
                      style={[styles.timeInputField, { borderColor: accentColor + '66', color: accentColor }]}
                      value={minText}
                      onChangeText={(t) => {
                        const clean = t.replace(/[^0-9]/g, '').slice(0, 2);
                        setMinText(clean);
                        const n = parseInt(clean);
                        if (!isNaN(n) && n >= 0 && n <= 59) {
                          setMinute(n);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      textAlign="center"
                      placeholder="00"
                      placeholderTextColor="#CBD5E1"
                    />
                  </View>
                  <View style={styles.timeInputBlock}>
                    <Text style={styles.timeInputLabel}>Period</Text>
                    <View style={styles.ampmGroup}>
                      {(['AM', 'PM'] as const).map((p) => (
                        <TouchableOpacity
                          key={p}
                          onPress={() => {
                            Haptics.selectionAsync();
                            if (p === 'AM' && hour24 >= 12) setHour24(hour24 - 12);
                            if (p === 'PM' && hour24 < 12) setHour24(hour24 + 12);
                          }}
                          activeOpacity={0.75}
                          style={[styles.ampmBtn, displayAmpm === p && { backgroundColor: accentColor, borderColor: accentColor }]}
                        >
                          <Text style={[styles.ampmBtnText, displayAmpm === p && { color: '#fff' }]}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginLeft: 2 },

  // Trigger
  container: {
    borderRadius: 14, borderWidth: 1, borderColor: '#C4CDD8',
    shadowColor: '#7C3AED', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  inner: {
    minHeight: 46, borderRadius: 14, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  iconWrap: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  dateText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  timeText: { fontSize: 10, marginTop: 1, color: '#64748B', fontWeight: '500' },
  placeholderText: { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },

  // Modal shell
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: {
    backgroundColor: '#FAFBFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingBottom: 40,
    height: SCREEN_H * 0.84,
  },
  timeSheet: {
    backgroundColor: '#FAFBFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingBottom: 40,
  },
  timeModalBody: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    alignItems: 'center',
  },
  handle: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1',
    alignSelf: 'center', marginTop: 12, marginBottom: 2,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: 0.1 },
  cancelText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  doneText: { fontSize: 15, fontWeight: '800' },

  // Preview
  preview: { marginHorizontal: 20, marginBottom: 4 },
  previewInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14,
  },
  previewDate: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  previewTime: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 1 },

  // Quick chips

  // Month nav
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  monthNavBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  monthTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: 0.2 },

  // Calendar
  calWrap: {
    marginHorizontal: 16,
    backgroundColor: '#F0EBFF',
    borderRadius: 22,
    paddingHorizontal: 4, paddingBottom: 10, paddingTop: 6,
  },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  dayRow: { flexDirection: 'row' },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
  weekText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2 },
  dayInner: {
    width: CELL - 2, height: CELL - 2,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: (CELL - 2) / 2,
  },
  dayText: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  daySel: {
    width: CELL - 2, height: CELL - 2, borderRadius: (CELL - 2) / 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  daySelText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Time section
  timeSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  timeSectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  timeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 50, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  timeChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  backToChips: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  backToChipsText: { fontSize: 13, fontWeight: '600' },

  // Time inputs
  timeInputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', gap: 10,
  },
  timeInputBlock: { alignItems: 'center', gap: 5 },
  timeInputLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' },
  timeInputField: {
    width: 64, height: 52,
    borderRadius: 14, borderWidth: 2,
    backgroundColor: '#F8F5FF',
    fontSize: 24, fontWeight: '800',
    textAlign: 'center',
  },
  timeInputSep: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  ampmGroup: { gap: 6 },
  ampmBtn: {
    width: 50, paddingVertical: 7, borderRadius: 10,
    borderWidth: 2, borderColor: '#E2E8F0',
    backgroundColor: '#fff', alignItems: 'center',
  },
  ampmBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  // Confirm
  confirmWrap: { paddingHorizontal: 20, paddingTop: 8 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 18, paddingVertical: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
});
