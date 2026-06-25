import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { getEventsByMonth } from '../../services/events';
import { FlightDetailModal } from '../flights/FlightsScreen';
import { Event } from '../../types';
import { eventTypeIcons, colors } from '../../constants/theme';
import { getLoadingVerse } from '../../constants/verses';

const { width: SCREEN_W } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'month' | 'week';

type SpanInfo = {
  event: Event;
  startCol: number;
  endCol: number;
  isEventStart: boolean;
  isEventEnd: boolean;
};

type FlightInfo = {
  event: Event;
  leg: 'outbound' | 'return';
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  const sun = new Date(d);
  sun.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => addDays(toDateStr(sun), i));
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatMonthName(year: number, month: number) {
  return new Date(year, month - 1, 1)
    .toLocaleDateString('en-US', { month: 'long' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dayInRange(dateStr: string, startStr: string, endStr: string) {
  return dateStr >= startStr && dateStr <= endStr;
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
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

// ─── Constants ────────────────────────────────────────────────────────────────


const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CAL_H_PAD = 14;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isAssistant = user?.role === 'assistant';

  const today = new Date();
  const todayStr = toDateStr(today);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonth, setCurrentMonth] = useState({
    year: today.getFullYear(), month: today.getMonth() + 1,
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [popupEvents, setPopupEvents] = useState<Event[]>([]);
  const [popupFlights, setPopupFlights] = useState<FlightInfo[]>([]);
  const [flightDetailEvent, setFlightDetailEvent] = useState<Event | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // Per-month event cache — keyed by "YYYY-M". Populated on first fetch,
  // served instantly on revisit so green backgrounds appear with zero lag.
  const eventsCache = useRef<Record<string, Event[]>>({});
  // Key of the month currently being displayed. Any fetch (cached refresh or
  // first load) that resolves for a different month is ignored — prevents a
  // previous month's in-flight request from clobbering the grid (the flicker).
  const activeMonthKey = useRef<string>(`${currentMonth.year}-${currentMonth.month}`);

  const loadMonth = useCallback(async (year: number, month: number, isPage = false) => {
    const key = `${year}-${month}`;
    activeMonthKey.current = key;
    const cached = eventsCache.current[key];
    if (cached) {
      // Serve cache immediately — no spinner, no lag
      setEvents(cached);
      setPageLoading(false);
      // Silently refresh in the background, but only apply if still on this month
      getEventsByMonth(year, month)
        .then(fresh => {
          eventsCache.current[key] = fresh;
          if (activeMonthKey.current === key) setEvents(fresh);
        })
        .catch(() => {});
      return;
    }
    // No cache yet — show loader only on very first open
    isPage ? setPageLoading(true) : setEventsLoading(true);
    try {
      const data = await getEventsByMonth(year, month);
      eventsCache.current[key] = data;
      if (activeMonthKey.current === key) setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      isPage ? setPageLoading(false) : setEventsLoading(false);
    }
  }, []);

  // Always keep a fresh ref so useFocusEffect never reads a stale month
  const currentMonthRef = useRef(currentMonth);
  useEffect(() => { currentMonthRef.current = currentMonth; }, [currentMonth]);

  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    const { year, month } = currentMonthRef.current;
    loadMonth(year, month, firstFocus.current);
    firstFocus.current = false;
  }, [loadMonth]));

  const handleMonthStep = useCallback((dir: 1 | -1) => {
    const d = new Date(currentMonth.year, currentMonth.month - 1 + dir, 1);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    setCurrentMonth({ year: y, month: m });
    loadMonth(y, m);
  }, [currentMonth, loadMonth]);

  const goToMonth = useCallback((y: number, m: number) => {
    setCurrentMonth({ year: y, month: m });
    // Keep the week view / day panel in sync by selecting the 1st of the month
    setSelectedDate(toDateStr(new Date(y, m - 1, 1)));
    loadMonth(y, m);
    setMonthPickerOpen(false);
  }, [loadMonth]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    loadMonth(currentMonth.year, currentMonth.month);
  }, [currentMonth, loadMonth]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const goWeek = useCallback((dir: 1 | -1) => {
    const newDate = addDays(weekDays[dir === 1 ? 6 : 0], dir);
    setSelectedDate(newDate);
    const d = new Date(newDate + 'T00:00:00');
    const y = d.getFullYear(), m = d.getMonth() + 1;
    if (y !== currentMonth.year || m !== currentMonth.month) {
      setCurrentMonth({ year: y, month: m });
      loadMonth(y, m);
    }
  }, [weekDays, currentMonth, loadMonth]);

  const dateEventMap = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const ev of events) {
      const start = toDateStr(new Date(ev.date_start));
      const end = ev.date_end ? toDateStr(new Date(ev.date_end)) : start;
      let cur = start;
      while (cur <= end) {
        if (!map[cur]) map[cur] = [];
        map[cur].push(ev);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [events]);

  const dateFlightMap = useMemo(() => {
    const map: Record<string, FlightInfo[]> = {};
    for (const ev of events) {
      const t = ev.travel;
      if (!t) continue;
      if (t.flight_booked && t.departure_time) {
        const ds = toDateStr(new Date(t.departure_time));
        if (!map[ds]) map[ds] = [];
        map[ds].push({ event: ev, leg: 'outbound' });
      }
      if (t.return_flight_booked && t.return_departure_time) {
        const ds = toDateStr(new Date(t.return_departure_time));
        if (!map[ds]) map[ds] = [];
        map[ds].push({ event: ev, leg: 'return' });
      }
    }
    return map;
  }, [events]);

  const dateTravelMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const ev of events) {
      if (ev.event_type !== 'travel') continue;
      const start = toDateStr(new Date(ev.date_start));
      const end = ev.date_end ? toDateStr(new Date(ev.date_end)) : start;
      let cur = start;
      while (cur <= end) { map[cur] = true; cur = addDays(cur, 1); }
    }
    return map;
  }, [events]);

  const datePersonalMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const ev of events) {
      if (ev.event_type !== 'personal') continue;
      const start = toDateStr(new Date(ev.date_start));
      const end = ev.date_end ? toDateStr(new Date(ev.date_end)) : start;
      let cur = start;
      while (cur <= end) { map[cur] = true; cur = addDays(cur, 1); }
    }
    return map;
  }, [events]);

  const eventsOnDay = useMemo(
    () => events.filter((e) => {
      const start = toDateStr(new Date(e.date_start));
      const end = e.date_end ? toDateStr(new Date(e.date_end)) : start;
      return dayInRange(selectedDate, start, end);
    }),
    [events, selectedDate],
  );



  const weekEventMap = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const ds of weekDays) {
      map[ds] = events.filter(e => {
        const start = toDateStr(new Date(e.date_start));
        const end = e.date_end ? toDateStr(new Date(e.date_end)) : start;
        return dayInRange(ds, start, end);
      });
    }
    return map;
  }, [weekDays, events]);

  const weekSpans = useMemo(() => {
    const raw: { startCol: number; endCol: number; isEventStart: boolean; isEventEnd: boolean }[] = [];
    for (const ev of events) {
      const evStart = toDateStr(new Date(ev.date_start));
      const evEnd = ev.date_end ? toDateStr(new Date(ev.date_end)) : evStart;
      if (evStart === evEnd) continue;
      if (evStart > weekDays[6] || evEnd < weekDays[0]) continue;

      let startCol = 0, isEventStart = false;
      for (let i = 0; i < weekDays.length; i++) {
        if (weekDays[i] >= evStart) { startCol = i; isEventStart = weekDays[i] === evStart; break; }
      }
      let endCol = 6, isEventEnd = false;
      for (let i = weekDays.length - 1; i >= 0; i--) {
        if (weekDays[i] <= evEnd) { endCol = i; isEventEnd = weekDays[i] === evEnd; break; }
      }
      raw.push({ startCol, endCol, isEventStart, isEventEnd });
    }
    return raw.reduce<{ startCol: number; endCol: number; isEventStart: boolean; isEventEnd: boolean }[]>(
      (acc, span) => {
        const hit = acc.find(r => span.startCol <= r.endCol + 1 && span.endCol >= r.startCol - 1);
        if (hit) {
          if (span.startCol < hit.startCol) { hit.startCol = span.startCol; hit.isEventStart = span.isEventStart; }
          if (span.endCol > hit.endCol) { hit.endCol = span.endCol; hit.isEventEnd = span.isEventEnd; }
        } else {
          acc.push({ ...span });
        }
        return acc;
      },
      []
    );
  }, [weekDays, events]);

  const calGrid = useMemo(
    () => buildCalendarGrid(currentMonth.year, currentMonth.month),
    [currentMonth],
  );

  const calEventSpans = useMemo((): SpanInfo[][] => {
    return calGrid.map((row) => {
      const rowDates = row
        .map((day, col) => {
          if (day === null) return null;
          const ds = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return { ds, col };
        })
        .filter(Boolean) as { ds: string; col: number }[];

      if (rowDates.length === 0) return [];

      const rowStart = rowDates[0].ds;
      const rowEnd = rowDates[rowDates.length - 1].ds;
      const spans: SpanInfo[] = [];

      for (const ev of events) {
        const evStart = toDateStr(new Date(ev.date_start));
        const evEnd = ev.date_end ? toDateStr(new Date(ev.date_end)) : evStart;
        if (evStart === evEnd) continue;
        if (evStart > rowEnd || evEnd < rowStart) continue;

        let startCol = rowDates[0].col;
        let isEventStart = false;
        for (const cell of rowDates) {
          if (cell.ds >= evStart) {
            startCol = cell.col;
            isEventStart = cell.ds === evStart;
            break;
          }
        }

        let endCol = rowDates[rowDates.length - 1].col;
        let isEventEnd = false;
        for (let i = rowDates.length - 1; i >= 0; i--) {
          if (rowDates[i].ds <= evEnd) {
            endCol = rowDates[i].col;
            isEventEnd = rowDates[i].ds === evEnd;
            break;
          }
        }

        spans.push({ event: ev, startCol, endCol, isEventStart, isEventEnd });
      }

      return spans;
    });
  }, [calGrid, events, currentMonth]);

  const lastTapRef = useRef<{ date: string; time: number } | null>(null);

  const handleDoubleTap = useCallback((ds: string, hasEvents: boolean) => {
    if (!isAssistant || hasEvents) return;
    const now = Date.now();
    if (lastTapRef.current?.date === ds && now - lastTapRef.current.time < 350) {
      lastTapRef.current = null;
      navigation.navigate('AddEditEvent', { defaultDate: ds });
    } else {
      lastTapRef.current = { date: ds, time: now };
    }
  }, [isAssistant, navigation]);

  if (pageLoading) {
    return (
      <LinearGradient
        colors={[colors.primaryDarker, colors.primary]}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}
      >
        <ActivityIndicator size="large" color="#A5B4FC" />
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 }}>
          {getLoadingVerse()}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.primaryDarker, colors.primary]}
      locations={[0, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Ambient orb decorations */}
        <View style={styles.orb1} pointerEvents="none" />
        <View style={styles.orb2} pointerEvents="none" />
        <View style={styles.orb3} pointerEvents="none" />

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {formatMonthName(today.getFullYear(), today.getMonth() + 1)}{' '}
              {today.getDate()}
            </Text>
            <Text style={styles.headerYear}>{today.getFullYear()}</Text>
            <Text style={styles.headerSub}>
              {eventsLoading
                ? '✦'
                : `${events.length} event${events.length !== 1 ? 's' : ''} this month`}
            </Text>
          </View>
        </View>

        {/* ── SEGMENTED CONTROL ───────────────────────────────────────────── */}
        <View style={styles.segWrap}>
          <View style={styles.segContainer}>
            {([
              { key: 'month', icon: 'calendar-outline', label: 'Month' },
              { key: 'week', icon: 'grid-outline', label: 'Week' },
            ] as { key: ViewMode; icon: any; label: string }[]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.segTab}
                onPress={() => handleViewModeChange(tab.key)}
                activeOpacity={0.7}
              >
                {viewMode === tab.key ? (
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.segTabGrad}
                  >
                    <Ionicons name={tab.icon} size={13} color="#fff" />
                    <Text style={styles.segTabTextActive}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.segTabInner}>
                    <Ionicons name={tab.icon} size={13} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.segTabText}>{tab.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* ════ MONTH VIEW ════ */}
          {viewMode === 'month' && (
            <>
              {/* Custom Calendar Card */}
              <LinearGradient
                colors={['#ffffff', '#ffffff']}
                locations={[0, 0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.calCard}
              >
                {/* Month navigation */}
                <View style={styles.calNav}>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => handleMonthStep(-1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={19} color="#4338CA" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.calNavTitleBtn}
                    onPress={() => setMonthPickerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calNavTitle, { color: '#090909', fontSize: 20, fontWeight: '700' }]}>
                      {formatMonthYear(currentMonth.year, currentMonth.month)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#4338CA" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => handleMonthStep(1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={19} color="#4338CA" />
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.calHeaders}>
                  {WEEKDAY_LABELS.map((w, i) => (
                    <View key={i} style={styles.calHeaderCell}>
                      <Text style={[styles.calHeaderText, { color: '#4F46E5', fontSize: 12, fontWeight: '800' }]}>
                        {w}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Date grid */}
                {calGrid.map((row, ri) => {
                  const spans = calEventSpans[ri] ?? [];

                  // Merge overlapping/adjacent spans for per-cell background rendering
                  const mergedSpans = spans.reduce<{ startCol: number; endCol: number; isEventStart: boolean; isEventEnd: boolean }[]>(
                    (acc, span) => {
                      const hit = acc.find(r => span.startCol <= r.endCol + 1 && span.endCol >= r.startCol - 1);
                      if (hit) {
                        if (span.startCol < hit.startCol) { hit.startCol = span.startCol; hit.isEventStart = span.isEventStart; }
                        if (span.endCol > hit.endCol)     { hit.endCol = span.endCol;     hit.isEventEnd   = span.isEventEnd;   }
                      } else {
                        acc.push({ startCol: span.startCol, endCol: span.endCol, isEventStart: span.isEventStart, isEventEnd: span.isEventEnd });
                      }
                      return acc;
                    },
                    []
                  );

                  return (
                    <View key={ri} style={styles.calRow}>
                      {row.map((day, ci) => {
                        // Per-cell span background — rendered inside each cell so it always paints
                        const spanForCol = mergedSpans.find(r => ci >= r.startCol && ci <= r.endCol);
                        const isInSpan = !!spanForCol;
                        const isSpanStart = isInSpan && ci === spanForCol!.startCol;
                        const isSpanEnd   = isInSpan && ci === spanForCol!.endCol;
                        // Round a corner only at the TRUE event boundary, not just the row boundary
                        const roundLeft  = isSpanStart && spanForCol!.isEventStart;
                        const roundRight = isSpanEnd   && spanForCol!.isEventEnd;

                        // Past days get a grey marker instead of green
                        const cellDate = day !== null ? new Date(currentMonth.year, currentMonth.month - 1, day) : null;
                        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
                        const isPastCell = cellDate ? cellDate < startOfToday : false;

                        // Priority: green (confirmed) > amber (pending) > grey (past)
                        const spansForThisCol = spans.filter(s => ci >= s.startCol && ci <= s.endCol);
                        const spanHasConfirmed = spansForThisCol.some(s => s.event.status !== 'tentative');
                        const spanHasPending = spansForThisCol.some(s => s.event.status === 'tentative');
                        const spanBgColor = isPastCell ? '#9CA3AF'
                          : spanHasConfirmed ? '#22C55E'
                          : spanHasPending ? '#F59E0B'
                          : '#22C55E';

                        const spanBg = isInSpan ? (
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: roundLeft ? 4 : 0,
                              right: roundRight ? 4 : 0,
                              top: 4,
                              bottom: 4,
                              backgroundColor: spanBgColor,
                              borderTopLeftRadius: roundLeft ? 20 : 0,
                              borderBottomLeftRadius: roundLeft ? 20 : 0,
                              borderTopRightRadius: roundRight ? 20 : 0,
                              borderBottomRightRadius: roundRight ? 20 : 0,
                            }}
                          />
                        ) : null;

                        if (day === null) {
                          return (
                            <View key={ci} style={styles.calCell}>
                              {spanBg}
                            </View>
                          );
                        }

                        const ds = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = ds === selectedDate;
                        const dayEvts = dateEventMap[ds] ?? [];
                        const dayFlights = dateFlightMap[ds] ?? [];
                        // Any event on this day → show capsule,
                        // unless already covered by a multi-day span bar
                        const hasEvent = dayEvts.length > 0;
                        const hasFlight = dayFlights.length > 0 || !!dateTravelMap[ds];
                        const hasPersonal = !!datePersonalMap[ds];

                        // Priority: grey (past) > pink (personal-only) > green (confirmed) > amber (tentative)
                        const dayHasConfirmed = dayEvts.some(e => e.status !== 'tentative');
                        const dayIsPersonalOnly = dayEvts.length > 0 && dayEvts.every(e => e.event_type === 'personal');
                        const capsuleColors: [string, string] = isPastCell
                          ? ['#9CA3AF', '#6B7280']
                          : dayIsPersonalOnly
                            ? ['#DB2777', '#BE185D']
                            : dayHasConfirmed
                              ? ['#22C55E', '#16A34A']
                              : ['#F59E0B', '#D97706'];

                        return (
                          <TouchableOpacity
                            key={ci}
                            style={styles.calCell}
                            onPress={() => {
                              setSelectedDate(ds);
                              if (dayEvts.length > 0 || dayFlights.length > 0) {
                                setPopupDate(ds);
                                setPopupEvents(dayEvts);
                                setPopupFlights(dayFlights);
                              } else {
                                handleDoubleTap(ds, false);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            {spanBg}
                            {hasFlight && (
                              <View style={[styles.flightBadge, isPastCell && { backgroundColor: '#9CA3AF' }]} pointerEvents="none">
                                <Ionicons name="airplane" size={8} color="#fff" />
                              </View>
                            )}
                            {hasPersonal && (
                              <View style={[styles.personalBadge, isPastCell && { backgroundColor: '#9CA3AF' }]} pointerEvents="none">
                                <Ionicons name="person" size={7} color="#fff" />
                              </View>
                            )}
                            {hasEvent && !isInSpan ? (
                              <LinearGradient
                                colors={capsuleColors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.calDayCapsule, isSelected && styles.calDayCapsuleSelected]}
                              >
                                <Text style={styles.calDayTextBright}>{day}</Text>
                              </LinearGradient>
                            ) : isSelected ? (
                              <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.calDayCapsule}
                              >
                                <Text style={styles.calDayTextBright}>{day}</Text>
                              </LinearGradient>
                            ) : (
                              <View style={styles.calDayNormal}>
                                <Text style={[
                                  styles.calDayText,
                                  isInSpan && { color: '#FFFFFF', fontWeight: '800' },
                                ]}>
                                  {day}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}

                {/* Loader overlay while an uncached month is fetching, so the
                    grid never appears blank-then-populated */}
                {eventsLoading && (
                  <View style={styles.calLoaderOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
              </LinearGradient>

              {/* Legend */}
              <View style={styles.legend}>
                <LegendItem color="#22C55E" label="Confirmed" />
                <LegendItem color="#F59E0B" label="Tentative" />
                <LegendItem color="#DB2777" label="Personal" />
                <LegendItem color="#9CA3AF" label="Past" />
                <LegendBadge icon="airplane" color="#2563EB" label="Flight" />
              </View>

              {/* Day timeline */}
              <DayPanel
                dateStr={selectedDate}
                events={eventsOnDay}
                loading={eventsLoading}
                onNavigate={(d) => setSelectedDate(d)}
                onEventPress={(id) => navigation.navigate('EventDetail', { eventId: id })}
              />
            </>
          )}

          {/* ════ WEEK VIEW ════ */}
          {viewMode === 'week' && (
            <>
              <View style={styles.weekCard}>
                <View style={styles.weekNav}>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => goWeek(-1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={18} color="#4338CA" />
                  </TouchableOpacity>
                  <Text style={styles.weekRangeText}>
                    {new Date(weekDays[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {new Date(weekDays[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => goWeek(1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={18} color="#4338CA" />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekDays}>
                  {weekDays.map((ds, ci) => {
                    const d = new Date(ds + 'T00:00:00');
                    const isSelected = ds === selectedDate;
                    const dayEvts = weekEventMap[ds] ?? [];
                    const dayFlights = dateFlightMap[ds] ?? [];
                    const hasTravelWeek = !!dateTravelMap[ds];
                    const hasPersonalWeek = !!datePersonalMap[ds];

                    const spanForCol = weekSpans.find(s => ci >= s.startCol && ci <= s.endCol);
                    const isInSpan = !!spanForCol;
                    const roundLeft  = isInSpan && ci === spanForCol!.startCol && spanForCol!.isEventStart;
                    const roundRight = isInSpan && ci === spanForCol!.endCol   && spanForCol!.isEventEnd;

                    const startOfTodayW = new Date(); startOfTodayW.setHours(0, 0, 0, 0);
                    const isPastCell = d < startOfTodayW;

                    // Priority: green (confirmed) > amber (pending) > grey (past)
                    const multiDayOnDay = events.filter(e => {
                      if (!e.date_end) return false;
                      const evStart = toDateStr(new Date(e.date_start));
                      const evEnd = toDateStr(new Date(e.date_end));
                      return evStart !== evEnd && dayInRange(ds, evStart, evEnd);
                    });
                    const weekSpanHasConfirmed = multiDayOnDay.some(e => e.status !== 'tentative');
                    const weekSpanHasPending = multiDayOnDay.some(e => e.status === 'tentative');
                    const weekSpanColor = isPastCell ? '#9CA3AF'
                      : weekSpanHasConfirmed ? '#22C55E'
                      : weekSpanHasPending ? '#F59E0B'
                      : '#22C55E';

                    const weekDayHasConfirmed = dayEvts.some(e => e.status !== 'tentative');
                    const weekDayIsPersonalOnly = dayEvts.length > 0 && dayEvts.every(e => e.event_type === 'personal');
                    const weekCircleColors: [string, string] = isPastCell
                      ? ['#9CA3AF', '#6B7280']
                      : weekDayIsPersonalOnly
                        ? ['#DB2777', '#BE185D']
                        : weekDayHasConfirmed
                          ? ['#22C55E', '#16A34A']
                          : ['#F59E0B', '#D97706'];

                    return (
                      <TouchableOpacity
                        key={ds}
                        style={styles.weekDayCol}
                        onPress={() => {
                          setSelectedDate(ds);
                          if (dayEvts.length > 0 || dayFlights.length > 0) {
                            setPopupDate(ds);
                            setPopupEvents(dayEvts);
                            setPopupFlights(dayFlights);
                          } else {
                            handleDoubleTap(ds, false);
                          }
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.weekDayName}>
                          {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </Text>
                        <View style={styles.weekCircleWrap}>
                          {(dayFlights.length > 0 || hasTravelWeek) && (
                            <View style={[styles.flightBadgeWeek, isPastCell && { backgroundColor: '#9CA3AF' }]} pointerEvents="none">
                              <Ionicons name="airplane" size={8} color="#fff" />
                            </View>
                          )}
                          {hasPersonalWeek && (
                            <View style={[styles.personalBadgeWeek, isPastCell && { backgroundColor: '#9CA3AF' }]} pointerEvents="none">
                              <Ionicons name="person" size={7} color="#fff" />
                            </View>
                          )}
                          {isInSpan && (
                            <View
                              pointerEvents="none"
                              style={{
                                position: 'absolute',
                                left: roundLeft ? 4 : 0,
                                right: roundRight ? 4 : 0,
                                top: 0, bottom: 0,
                                backgroundColor: weekSpanColor,
                                borderTopLeftRadius: roundLeft ? 20 : 0,
                                borderBottomLeftRadius: roundLeft ? 20 : 0,
                                borderTopRightRadius: roundRight ? 20 : 0,
                                borderBottomRightRadius: roundRight ? 20 : 0,
                              }}
                            />
                          )}
                          {dayEvts.length > 0 ? (
                            <LinearGradient
                              colors={weekCircleColors}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.weekDayCircleSel}
                            >
                              <Text style={styles.weekDayNumTextSel}>{d.getDate()}</Text>
                            </LinearGradient>
                          ) : isSelected ? (
                            <LinearGradient
                              colors={[colors.primary, colors.primaryDark]}
                              style={styles.weekDayCircleSel}
                            >
                              <Text style={styles.weekDayNumTextSel}>{d.getDate()}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.weekDayCircle}>
                              <Text style={styles.weekDayNumText}>{d.getDate()}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <DayPanel
                dateStr={selectedDate}
                events={eventsOnDay}
                loading={eventsLoading}
                onNavigate={(d) => setSelectedDate(d)}
                onEventPress={(id) => navigation.navigate('EventDetail', { eventId: id })}
              />
            </>
          )}

        </ScrollView>

        {isAssistant && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('AddEditEvent', undefined)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGrad}
            >
              <Ionicons name="add" size={30} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <FlightDetailModal
          event={flightDetailEvent}
          onClose={() => setFlightDetailEvent(null)}
          onViewEvent={() => {
            const id = flightDetailEvent!.id;
            setFlightDetailEvent(null);
            navigation.navigate('EventDetail', { eventId: id });
          }}
        />
        <DatePopupModal
          visible={popupDate !== null}
          dateStr={popupDate ?? ''}
          events={popupEvents}
          flights={popupFlights}
          onClose={() => setPopupDate(null)}
          onEventPress={(id) => {
            setPopupDate(null);
            navigation.navigate('EventDetail', { eventId: id });
          }}
          onFlightPress={(event) => {
            setPopupDate(null);
            setFlightDetailEvent(event);
          }}
          canCreate={isAssistant}
          onCreate={() => {
            const ds = popupDate;
            setPopupDate(null);
            if (ds) navigation.navigate('AddEditEvent', { defaultDate: ds });
          }}
        />
        <MonthYearPicker
          visible={monthPickerOpen}
          year={currentMonth.year}
          month={currentMonth.month}
          onClose={() => setMonthPickerOpen(false)}
          onSelect={goToMonth}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Month / Year picker ────────────────────────────────────────────────────────

const PICKER_YEARS = Array.from({ length: 2050 - 2020 + 1 }, (_, i) => 2020 + i);
const PICKER_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function MonthYearPicker({
  visible, year, month, onClose, onSelect,
}: {
  visible: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
}) {
  const [selYear, setSelYear] = useState(year);
  const [selMonth, setSelMonth] = useState(month);
  const yearScrollRef = useRef<ScrollView>(null);

  // Re-sync to the live month whenever the picker is opened
  useEffect(() => {
    if (visible) {
      setSelYear(year);
      setSelMonth(month);
      // scroll the year list so the current year is near the top
      const idx = PICKER_YEARS.indexOf(year);
      setTimeout(() => yearScrollRef.current?.scrollTo({ y: Math.max(0, (idx - 2) * 44), animated: false }), 0);
    }
  }, [visible, year, month]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={pk.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={pk.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={pk.handle} />
          <Text style={pk.title}>Jump to month</Text>

          <View style={pk.cols}>
            {/* Month column */}
            <View style={pk.col}>
              <Text style={pk.colLabel}>MONTH</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pk.colScroll}>
                {PICKER_MONTHS.map((m) => {
                  const active = m === selMonth;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[pk.row, active && pk.rowActive]}
                      onPress={() => setSelMonth(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[pk.rowText, active && pk.rowTextActive]}>
                        {formatMonthName(2000, m)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Year column */}
            <View style={pk.col}>
              <Text style={pk.colLabel}>YEAR</Text>
              <ScrollView ref={yearScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={pk.colScroll}>
                {PICKER_YEARS.map((y) => {
                  const active = y === selYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[pk.row, active && pk.rowActive]}
                      onPress={() => setSelYear(y)}
                      activeOpacity={0.7}
                    >
                      <Text style={[pk.rowText, active && pk.rowTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={pk.goBtn} onPress={() => onSelect(selYear, selMonth)} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={pk.goBtnGrad}
            >
              <Text style={pk.goBtnText}>Go to {formatMonthYear(selYear, selMonth)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const pk = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 16 },
  cols: { flexDirection: 'row', gap: 12, height: 280 },
  col: { flex: 1 },
  colLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  colScroll: { paddingBottom: 8 },
  row: { height: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, marginBottom: 4 },
  rowActive: { backgroundColor: colors.primaryLight ?? '#EEF2FF' },
  rowText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  rowTextActive: { color: colors.primary, fontWeight: '800' },
  goBtn: { marginTop: 18, borderRadius: 14, overflow: 'hidden' },
  goBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  goBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function LegendBadge({ icon, color, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBadge, { backgroundColor: color }]}>
        <Ionicons name={icon} size={8} color="#fff" />
      </View>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function DayPanel({
  dateStr, events, loading, onNavigate, onEventPress,
}: {
  dateStr: string;
  events: Event[];
  loading: boolean;
  onNavigate: (d: string) => void;
  onEventPress: (id: string) => void;
}) {
  const d = new Date(dateStr + 'T00:00:00');
  const isToday = dateStr === toDateStr(new Date());

  return (
    <View style={styles.dayPanel}>
      <View style={styles.dayPanelHeader}>
        <View style={styles.dayPanelLeft}>
          {isToday ? (
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.dayCircle}>
              <Text style={styles.dayCircleNumActive}>{d.getDate()}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.dayCircle, styles.dayCircleInactive]}>
              <Text style={styles.dayCircleNum}>{d.getDate()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.dayFullLabel}>
              {d.toLocaleDateString('en-US', { weekday: 'long' })}
              {isToday ? ' · Today' : ''}
            </Text>
            <Text style={styles.dayMonthLabel}>
              {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
        <View style={styles.dayPanelNav}>
          <TouchableOpacity style={styles.navArrow} onPress={() => onNavigate(addDays(dateStr, -1))}>
            <Ionicons name="chevron-back" size={15} color="#4338CA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navArrow} onPress={() => onNavigate(addDays(dateStr, 1))}>
            <Ionicons name="chevron-forward" size={15} color="#4338CA" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.eventsLoader}>
          <ActivityIndicator color="#A5B4FC" size="small" />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.noDayEvents}>
          <Ionicons name="calendar-outline" size={19} color="#4F46E5" />
          <Text style={styles.noDayText}>No events on this day</Text>
        </View>
      ) : (
        events.map((ev) => (
          <PremiumEventCard
            key={ev.id}
            event={ev}
            onPress={() => onEventPress(ev.id)}
          />
        ))
      )}
    </View>
  );
}

function isPastEvent(event: Event): boolean {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(event.date_end ?? event.date_start) < startOfToday;
}

function PremiumEventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const past = isPastEvent(event);
  const isPending = event.status === 'tentative';
  const stripeColor = past ? '#9CA3AF'
    : isPending ? '#F59E0B'
    : event.event_type === 'personal' ? '#DB2777'
    : event.event_type === 'travel' ? '#2563EB'
    : '#4F46E5';
  return (
    <TouchableOpacity
      style={[styles.premCard, past && styles.premCardPast]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.premStripe, { backgroundColor: stripeColor }]} />
      <View style={[styles.premIconBox, past && { backgroundColor: 'rgba(107,114,128,0.10)' }]}>
        <Text style={{ fontSize: 17, opacity: past ? 0.55 : 1 }}>{eventTypeIcons[event.event_type] ?? '📅'}</Text>
      </View>
      <View style={styles.premBody}>
        <Text style={[styles.premTitle, past && { color: '#6B7280' }]} numberOfLines={1}>{event.title}</Text>
        <View style={styles.premMeta}>
          <Ionicons name="time-outline" size={10} color="#6B7280" />
          <Text style={styles.premMetaText}>{formatTime(event.date_start)}</Text>
          {(event as any).venue?.city && (
            <>
              <Text style={styles.premMetaDot}>·</Text>
              <Ionicons name="location-outline" size={10} color="#6B7280" />
              <Text style={styles.premMetaText}>{(event as any).venue.city}</Text>
            </>
          )}
          {past && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>PAST</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={12} color="#9CA3AF" style={{ marginRight: 10 }} />
    </TouchableOpacity>
  );
}

function DatePopupModal({
  visible, dateStr, events, flights, onClose, onEventPress, onFlightPress, onCreate, canCreate,
}: {
  visible: boolean;
  dateStr: string;
  events: Event[];
  flights: FlightInfo[];
  onClose: () => void;
  onEventPress: (id: string) => void;
  onFlightPress: (event: Event) => void;
  onCreate?: () => void;
  canCreate?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [fullPosterUrl, setFullPosterUrl] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = SCREEN_W - 48;
  const totalPages = events.length + flights.length;

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      setFullPosterUrl(null);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible, dateStr]);

  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={popupStyles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[popupStyles.card, { width: cardWidth }]}>

          {/* ── Header ── */}
          <View style={popupStyles.header}>
            <LinearGradient colors={[colors.primary, colors.accent]} style={popupStyles.dateBadge}>
              <Text style={popupStyles.dateBadgeNum}>{d.getDate()}</Text>
            </LinearGradient>
            <View style={popupStyles.headerMid}>
              <Text style={popupStyles.headerWeekday}>
                {d.toLocaleDateString('en-US', { weekday: 'long' })}
              </Text>
              <Text style={popupStyles.headerMonth}>
                {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {totalPages > 1 && (
                <View style={popupStyles.pageCounter}>
                  <Text style={popupStyles.pageCounterText}>
                    {currentPage + 1} / {totalPages}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={popupStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={popupStyles.headerDivider} />

          {/* ── Swipeable event pages ── */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            style={{ scrollSnapType: 'x mandatory' } as any}
            onScroll={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
              setCurrentPage(page);
            }}
          >
            {events.map((ev) => {
              const venue = ev.venue;
              const location = venue?.city && venue?.country
                ? `${venue.city}, ${venue.country}`
                : venue?.city ?? venue?.name ?? null;
              return (
                <View key={ev.id} style={{ width: cardWidth, scrollSnapAlign: 'start', scrollSnapStop: 'always' } as any}>
                  {/* Poster banner */}
                  <TouchableOpacity
                    style={popupStyles.posterBanner}
                    onPress={() => onEventPress(ev.id)}
                    activeOpacity={0.88}
                  >
                    {ev.poster_url ? (
                      <Image
                        source={{ uri: ev.poster_url }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={popupStyles.posterFallback}>
                        <Text style={{ fontSize: 60 }}>{eventTypeIcons[ev.event_type] ?? '📅'}</Text>
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(15,23,42,0.92)']}
                      style={popupStyles.posterGradient}
                    />
                    {ev.poster_url && (
                      <TouchableOpacity
                        style={popupStyles.posterExpandBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setFullPosterUrl(ev.poster_url!);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="expand-outline" size={13} color="#fff" />
                        <Text style={popupStyles.posterExpandText}>View full</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  {/* Info section */}
                  <View style={popupStyles.infoSection}>
                    <Text style={popupStyles.eventTitle} numberOfLines={2}>{ev.title}</Text>
                    <View style={popupStyles.metaList}>
                      <View style={popupStyles.metaRow}>
                        <View style={popupStyles.metaIconBox}>
                          <Ionicons name="time-outline" size={14} color="#A5B4FC" />
                        </View>
                        <Text style={popupStyles.metaText}>{formatTime(ev.date_start)}</Text>
                      </View>
                      {location && (
                        <View style={popupStyles.metaRow}>
                          <View style={popupStyles.metaIconBox}>
                            <Ionicons name="location-outline" size={14} color="#A5B4FC" />
                          </View>
                          <Text style={popupStyles.metaText} numberOfLines={1}>{location}</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={popupStyles.openBtn}
                      onPress={() => onEventPress(ev.id)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={popupStyles.openBtnGrad}
                      >
                        <Text style={popupStyles.openBtnText}>Open Event</Text>
                        <Ionicons name="arrow-forward" size={15} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* ── Flight pages ── */}
            {flights.map((fi) => {
              const t = fi.event.travel!;
              const isReturn = fi.leg === 'return';
              const boarding = isReturn ? t.return_boarding_point : t.boarding_point;
              const deboarding = isReturn ? t.return_deboarding_point : t.deboarding_point;
              const flightNo = isReturn ? t.return_flight_number : t.flight_number;
              const airline = isReturn ? t.return_airline : t.airline;
              const depTime = isReturn ? t.return_departure_time : t.departure_time;
              const arrTime = isReturn ? t.return_arrival_time : t.arrival_time;
              const checkinTime = isReturn ? t.return_checkin_time : t.checkin_time;
              const ticketUrl = isReturn ? t.return_ticket_pdf_url : t.flight_ticket_url;
              const accent = isReturn ? '#34D399' : '#A5B4FC';
              return (
                <View
                  key={`${fi.event.id}-${fi.leg}`}
                  style={{ width: cardWidth, scrollSnapAlign: 'start', scrollSnapStop: 'always' } as any}
                >
                  {/* Compact flight banner */}
                  <LinearGradient
                    colors={isReturn ? ['#065F46', '#022C22'] : ['#1E3A8A', '#172554']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={popupStyles.flightBanner}
                  >
                    <Ionicons
                      name="airplane"
                      size={90}
                      color="rgba(255,255,255,0.07)"
                      style={{ position: 'absolute', right: -10, bottom: -18, transform: [{ rotate: '-20deg' }] }}
                    />
                    <View style={[popupStyles.flightLegTag, { borderColor: accent, alignSelf: 'flex-start' }]}>
                      <Ionicons name="airplane" size={10} color={accent} />
                      <Text style={[popupStyles.flightLegTagText, { color: accent }]}>
                        {isReturn ? 'RETURN FLIGHT' : 'OUTBOUND FLIGHT'}
                      </Text>
                    </View>
                    <View style={popupStyles.flightRouteRow}>
                      <Text style={popupStyles.flightRouteCity} numberOfLines={1}>{boarding ?? '—'}</Text>
                      <Ionicons name="airplane" size={15} color={accent} style={{ marginHorizontal: 6 }} />
                      <Text style={[popupStyles.flightRouteCity, { textAlign: 'right' }]} numberOfLines={1}>
                        {deboarding ?? '—'}
                      </Text>
                    </View>
                    <Text style={popupStyles.flightEventTitle} numberOfLines={1}>{fi.event.title}</Text>
                  </LinearGradient>

                  {/* Compact 2-column details */}
                  <View style={popupStyles.flightInfoSection}>
                    <View style={popupStyles.flightGrid}>
                      {depTime && (
                        <View style={popupStyles.flightGridCell}>
                          <Text style={popupStyles.flightGridLabel}>DEPARTS</Text>
                          <Text style={[popupStyles.flightGridValue, { color: accent }]}>{formatTime(depTime)}</Text>
                        </View>
                      )}
                      {arrTime && (
                        <View style={popupStyles.flightGridCell}>
                          <Text style={popupStyles.flightGridLabel}>ARRIVES</Text>
                          <Text style={[popupStyles.flightGridValue, { color: accent }]}>{formatTime(arrTime)}</Text>
                        </View>
                      )}
                      {(flightNo || airline) && (
                        <View style={popupStyles.flightGridCell}>
                          <Text style={popupStyles.flightGridLabel}>FLIGHT</Text>
                          <Text style={popupStyles.flightGridValue} numberOfLines={1}>
                            {[flightNo, airline].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      )}
                      {checkinTime && (
                        <View style={popupStyles.flightGridCell}>
                          <Text style={popupStyles.flightGridLabel}>CHECK-IN</Text>
                          <Text style={popupStyles.flightGridValue}>{formatTime(checkinTime)}</Text>
                        </View>
                      )}
                    </View>

                    {ticketUrl && (
                      <TouchableOpacity
                        style={[popupStyles.flightTicketBtn, { borderColor: accent }]}
                        onPress={() => Linking.openURL(ticketUrl)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="document-text-outline" size={14} color={accent} />
                        <Text style={[popupStyles.flightActionBtnText, { color: accent }]}>View Ticket</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[popupStyles.flightActionBtn, popupStyles.flightActionBtnPrimary]}
                      onPress={() => onFlightPress(fi.event)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={isReturn ? ['#059669', '#16A34A'] : ['#2563EB', '#1E40AF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={popupStyles.flightActionBtnGrad}
                      >
                        <Ionicons name="airplane-outline" size={14} color="#fff" />
                        <Text style={popupStyles.openBtnText}>Open Flight Details</Text>
                        <Ionicons name="arrow-forward" size={14} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Pagination dots ── */}
          {totalPages > 1 && (
            <View style={popupStyles.dotsRow}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <View
                  key={i}
                  style={[popupStyles.dot, i === currentPage && popupStyles.dotActive]}
                />
              ))}
              <Text style={popupStyles.swipeHint}>swipe for more</Text>
            </View>
          )}

          {/* ── Create event on this date ── */}
          {canCreate && (
            <TouchableOpacity style={popupStyles.createBtn} onPress={onCreate} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={popupStyles.createBtnText}>Create event on this date</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>

      {/* ── Full-screen poster viewer ── */}
      <Modal
        visible={fullPosterUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullPosterUrl(null)}
        statusBarTranslucent
      >
        <View style={popupStyles.fullPosterBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setFullPosterUrl(null)}
          />
          {fullPosterUrl && (
            <Image
              source={{ uri: fullPosterUrl }}
              style={popupStyles.fullPosterImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={popupStyles.fullPosterClose}
            onPress={() => setFullPosterUrl(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Warm orange ambient light — NOT a visible shape, just soft warmth bleeding in from lower-right
  orb1: {
    position: 'absolute',
    bottom: -60,
    right: -140,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(99,102,241,0.16)',
  },
  // Lavender glow — center area softener for glassmorphism feel
  orb2: {
    position: 'absolute',
    top: 260,
    left: -30,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(165,180,252,0.18)',
  },

  // White diffusion glow — center-right, creates the airy glassmorphism softness
  orb3: {
    position: 'absolute',
    top: 340,
    right: -20,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  headerYear: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
    marginTop: -2,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
    marginTop: 4,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  todayBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Segmented control
  segWrap: { paddingHorizontal: 16, marginBottom: 12 },
  segContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 3,
  },
  segTab: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  segTabGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 14,
  },
  segTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
  },
  segTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  segTabTextActive: { fontSize: 13, fontWeight: '700', color: '#fff' },

  scroll: { paddingBottom: 110 },

  // Calendar card
  calLoaderOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 64, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  calCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: CAL_H_PAD,
    paddingTop: 16,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.14)',
    marginBottom: 12,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(67,56,202,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.15)',
  },
  calNavTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(67,56,202,0.06)',
  },
  calNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1F3A',
    letterSpacing: 0.2,
  },
  calHeaders: { flexDirection: 'row', marginBottom: 4 },
  calHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  calHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(67,56,202,0.6)',
    letterSpacing: 0.5,
  },
  calRow: { flexDirection: 'row', marginBottom: 1 },
  calCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  calDayCapsule: {
    width: '82%',
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calDayCapsuleSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  calDayNormal: {
    width: '82%',
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  calDayTextHasEvent: { color: '#111827', fontWeight: '800' },
  calDayTextBright: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Flight indicator badge on date cells
  flightBadge: {
    position: 'absolute',
    top: -1,
    right: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 3,
  },
  flightBadgeWeek: {
    position: 'absolute',
    top: -4,
    right: '50%',
    marginRight: -22,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 3,
  },
  personalBadge: {
    position: 'absolute',
    top: -1,
    left: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#DB2777',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 3,
  },
  personalBadgeWeek: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -22,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#DB2777',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 3,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  statIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },

  // Day panel (timeline)
  dayPanel: {
    paddingHorizontal: 16,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 24,
    paddingTop: 14,
    paddingBottom: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.10)',
  },
  dayPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayPanelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleInactive: {
    backgroundColor: 'rgba(67,56,202,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(67,56,202,0.18)',
  },
  dayCircleNum: { fontSize: 19, fontWeight: '800', color: '#374151' },
  dayCircleNumActive: { fontSize: 19, fontWeight: '800', color: '#fff' },
  dayFullLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dayMonthLabel: { fontSize: 12, color: '#374151', marginTop: 1 },
  dayPanelNav: { flexDirection: 'row', gap: 8 },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(67,56,202,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.15)',
  },
  eventsLoader: { paddingVertical: 24, alignItems: 'center' },
  noDayEvents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.1)',
    marginBottom: 8,
  },
  noDayText: { color: '#4B5563', fontSize: 14, fontWeight: '500' },

  // Premium event card
  premCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.12)',
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  premCardPast: {
    backgroundColor: 'rgba(229,231,235,0.7)',
    borderColor: 'rgba(156,163,175,0.3)',
    shadowOpacity: 0,
    elevation: 1,
  },
  premStripe: { width: 3.5, alignSelf: 'stretch' },
  pastBadge: {
    marginLeft: 4,
    backgroundColor: 'rgba(107,114,128,0.18)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pastBadgeText: { fontSize: 9, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5 },
  premIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(67,56,202,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  premBody: { flex: 1, paddingVertical: 12 },
  premTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  premMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  premMetaText: { fontSize: 11, color: '#4B5563' },
  premMetaDot: { fontSize: 11, color: '#6B7280' },
  // Week view
  weekCard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.14)',
    marginBottom: 12,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(67,56,202,0.1)',
  },
  weekRangeText: { fontSize: 13, fontWeight: '700', color: '#1F1F3A' },
  weekDays: { flexDirection: 'row', paddingTop: 14, paddingHorizontal: 8 },
  weekDayCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekDayName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(67,56,202,0.06)',
  },
  weekDayCircleSel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayNumText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  weekDayNumTextSel: { fontSize: 14, fontWeight: '800', color: '#fff' },
  weekCircleWrap: {
    position: 'relative',
    width: '100%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Agenda
  agendaWrap: { padding: 16 },
  agendaMonth: { marginBottom: 22 },
  agendaMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  agendaMonthText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 1.5,
  },
  agendaMonthLine: { flex: 1, height: 1, backgroundColor: 'rgba(79,70,229,0.15)' },
  agendaMonthBadge: {
    backgroundColor: 'rgba(79,70,229,0.1)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.25)',
  },
  agendaMonthBadgeText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  agendaDateRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  agendaDateBubble: {
    width: 52,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.15)',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  agendaDateDay: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  agendaDateMon: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  agendaEventsCol: { flex: 1, gap: 6 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#374151', textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 16,
  },
  fabGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const popupStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1A0E40',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.30)',
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadgeNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerMid: { flex: 1 },
  headerWeekday: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerMonth: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  pageCounter: {
    backgroundColor: 'rgba(79,70,229,0.18)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  pageCounterText: { fontSize: 11, fontWeight: '800', color: '#A5B4FC' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  posterBanner: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(76,29,149,0.30)',
    overflow: 'hidden',
  },
  posterFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(76,29,149,0.35)',
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  posterExpandBtn: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  posterExpandText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 14,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  metaList: { gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(79,70,229,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 },
  flightBanner: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 8,
    overflow: 'hidden',
  },
  flightEventTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },
  flightLegTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  flightLegTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  flightRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flightRouteCity: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  flightInfoSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  flightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  flightGridCell: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flightGridLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginBottom: 3,
  },
  flightGridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  flightActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  flightTicketBtn: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  flightActionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  flightActionBtnPrimary: {
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  flightActionBtnGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
  },
  flightActionBtnText: { fontSize: 13, fontWeight: '700' },
  openBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  openBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  openBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  swipeHint: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
    borderStyle: 'dashed',
  },
  createBtnText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  fullPosterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPosterImage: {
    width: SCREEN_W,
    height: SCREEN_W * 1.5,
  },
  fullPosterClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
