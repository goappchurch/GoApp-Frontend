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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { getEventsByMonth, getUpcomingEvents } from '../../services/events';
import { Event } from '../../types';
import { eventTypeIcons } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'month' | 'week' | 'agenda';

type SpanInfo = {
  event: Event;
  startCol: number;
  endCol: number;
  isEventStart: boolean;
  isEventEnd: boolean;
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

function buildAgendaGroups(events: Event[]) {
  const monthMap = new Map<string, Map<string, Event[]>>();
  for (const e of events) {
    const d = new Date(e.date_start);
    const mk = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const dk = e.date_start.split('T')[0];
    if (!monthMap.has(mk)) monthMap.set(mk, new Map());
    const dm = monthMap.get(mk)!;
    if (!dm.has(dk)) dm.set(dk, []);
    dm.get(dk)!.push(e);
  }
  return Array.from(monthMap.entries()).map(([month, dm]) => ({
    month,
    dates: Array.from(dm.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dk, evts]) => ({ dk, evts })),
  }));
}

// ─── Constants ────────────────────────────────────────────────────────────────


const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CAL_H_PAD = 14;
const CELL_SIZE = Math.floor((SCREEN_W - 32 - CAL_H_PAD * 2) / 7);

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
  const [agendaEvents, setAgendaEvents] = useState<Event[]>([]);
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [popupEvents, setPopupEvents] = useState<Event[]>([]);

  const loadMonth = useCallback(async (year: number, month: number, isPage = false) => {
    isPage ? setPageLoading(true) : setEventsLoading(true);
    try {
      setEvents(await getEventsByMonth(year, month));
    } catch (e) {
      console.error(e);
    } finally {
      isPage ? setPageLoading(false) : setEventsLoading(false);
    }
  }, []);

  const loadAgenda = useCallback(async (isPage = false) => {
    isPage ? setPageLoading(true) : setEventsLoading(true);
    try {
      setAgendaEvents(await getUpcomingEvents(90));
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
    if (firstFocus.current) {
      firstFocus.current = false;
      if (viewMode === 'agenda') loadAgenda(true);
      else loadMonth(year, month, true);
    } else {
      if (viewMode === 'agenda') loadAgenda();
      else loadMonth(year, month);
    }
  }, [viewMode]));

  const handleMonthStep = useCallback((dir: 1 | -1) => {
    const d = new Date(currentMonth.year, currentMonth.month - 1 + dir, 1);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    setCurrentMonth({ year: y, month: m });
    loadMonth(y, m);
  }, [currentMonth, loadMonth]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'agenda') loadAgenda();
    else loadMonth(currentMonth.year, currentMonth.month);
  }, [currentMonth, loadMonth, loadAgenda]);

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
      const start = ev.date_start.split('T')[0];
      const end = ev.date_end ? ev.date_end.split('T')[0] : start;
      let cur = start;
      while (cur <= end) {
        if (!map[cur]) map[cur] = [];
        map[cur].push(ev);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [events]);

  const eventsOnDay = useMemo(
    () => events.filter((e) => {
      const start = e.date_start.split('T')[0];
      const end = e.date_end ? e.date_end.split('T')[0] : start;
      return dayInRange(selectedDate, start, end);
    }),
    [events, selectedDate],
  );

  const agendaGroups = useMemo(() => buildAgendaGroups(agendaEvents), [agendaEvents]);


  const weekEventMap = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const ds of weekDays) {
      map[ds] = events.filter(e => {
        const start = e.date_start.split('T')[0];
        const end = e.date_end ? e.date_end.split('T')[0] : start;
        return dayInRange(ds, start, end);
      });
    }
    return map;
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
        const evStart = ev.date_start.split('T')[0];
        const evEnd = ev.date_end ? ev.date_end.split('T')[0] : evStart;
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

  if (pageLoading) {
    return (
      <LinearGradient
        colors={['#2D1B8E', '#4C1D95', '#6D28D9', '#8B5CF6', '#C4B5FD']}
        locations={[0, 0.15, 0.40, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}
      >
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' }}>
          Loading calendar…
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2D1B8E', '#4C1D95', '#6D28D9', '#8B5CF6', '#C4B5FD']}
      locations={[0, 0.15, 0.40, 0.68, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Ambient orb decorations */}
        <View style={styles.orb1} pointerEvents="none" />
        <View style={styles.orb2} pointerEvents="none" />
        <View style={styles.orb3} pointerEvents="none" />

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {viewMode === 'agenda' ? (
              <Text style={styles.headerTitle}>Agenda</Text>
            ) : (
              <>
                <Text style={styles.headerTitle}>
                  {formatMonthName(today.getFullYear(), today.getMonth() + 1)}{' '}
                  {today.getDate()}
                </Text>
                <Text style={styles.headerYear}>{today.getFullYear()}</Text>
              </>
            )}
            <Text style={styles.headerSub}>
              {eventsLoading
                ? 'Refreshing…'
                : viewMode === 'agenda'
                  ? `${agendaEvents.length} upcoming event${agendaEvents.length !== 1 ? 's' : ''}`
                  : `${events.length} event${events.length !== 1 ? 's' : ''} this month`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => {
              setSelectedDate(todayStr);
              const y = today.getFullYear(), m = today.getMonth() + 1;
              if (y !== currentMonth.year || m !== currentMonth.month) {
                setCurrentMonth({ year: y, month: m });
                loadMonth(y, m);
              }
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="today-outline" size={14} color="#fff" />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* ── SEGMENTED CONTROL ───────────────────────────────────────────── */}
        <View style={styles.segWrap}>
          <View style={styles.segContainer}>
            {([
              { key: 'month', icon: 'calendar-outline', label: 'Month' },
              { key: 'week', icon: 'grid-outline', label: 'Week' },
              { key: 'agenda', icon: 'list-outline', label: 'Agenda' },
            ] as { key: ViewMode; icon: any; label: string }[]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.segTab}
                onPress={() => handleViewModeChange(tab.key)}
                activeOpacity={0.7}
              >
                {viewMode === tab.key ? (
                  <LinearGradient
                    colors={['#7C3AED', '#8B5CF6', '#A855F7']}
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
                colors={['#fbfbfb', '#e3e2e9', '#e19b46']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.calCard}
              >
                {/* Month navigation */}
                <View style={styles.calNav}>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => handleMonthStep(-1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={19} color="#6D28D9" />
                  </TouchableOpacity>
                  <Text style={[styles.calNavTitle, { color: '#090909', fontSize: 20, fontWeight: '700' }]}>
                    {formatMonthYear(currentMonth.year, currentMonth.month)}
                  </Text>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => handleMonthStep(1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={19} color="#6D28D9" />
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.calHeaders}>
                  {WEEKDAY_LABELS.map((w, i) => (
                    <View key={i} style={styles.calHeaderCell}>
                      <Text style={[styles.calHeaderText, { color: '#4f1ad6', fontSize: 12, fontWeight: '800' }]}>
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

                        const spanBg = isInSpan ? (
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: roundLeft ? 4 : 0,
                              right: roundRight ? 4 : 0,
                              top: 4,
                              bottom: 4,
                              backgroundColor: '#22C55E',
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
                        const isToday = ds === todayStr;
                        const isSelected = ds === selectedDate;
                        const dayEvts = dateEventMap[ds] ?? [];
                        // Any event on this day → show green capsule,
                        // unless already covered by a multi-day span bar
                        const hasEvent = dayEvts.length > 0;

                        return (
                          <TouchableOpacity
                            key={ci}
                            style={styles.calCell}
                            onPress={() => {
                              setSelectedDate(ds);
                              if (dayEvts.length > 0) {
                                setPopupDate(ds);
                                setPopupEvents(dayEvts);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            {spanBg}
                            {isSelected ? (
                              <LinearGradient
                                colors={['#F59E0B', '#FB923C', '#F97316']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.calDayCapsule}
                              >
                                <Text style={styles.calDayTextBright}>{day}</Text>
                              </LinearGradient>
                            ) : isToday ? (
                              <LinearGradient
                                colors={['#8B5CF6', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.calDayCapsule}
                              >
                                <Text style={styles.calDayTextBright}>{day}</Text>
                              </LinearGradient>
                            ) : hasEvent && !isInSpan ? (
                              <LinearGradient
                                colors={['#22C55E', '#16A34A']}
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
              </LinearGradient>

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
                    <Ionicons name="chevron-back" size={18} color="#6D28D9" />
                  </TouchableOpacity>
                  <Text style={styles.weekRangeText}>
                    {new Date(weekDays[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {new Date(weekDays[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => goWeek(1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={18} color="#6D28D9" />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekDays}>
                  {weekDays.map((ds) => {
                    const d = new Date(ds + 'T00:00:00');
                    const isSelected = ds === selectedDate;
                    const isToday = ds === todayStr;
                    const dayEvts = weekEventMap[ds] ?? [];
                    return (
                      <TouchableOpacity
                        key={ds}
                        style={styles.weekDayCol}
                        onPress={() => setSelectedDate(ds)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.weekDayName, isToday && { color: '#7C3AED' }]}>
                          {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </Text>
                        {isSelected ? (
                          <LinearGradient
                            colors={['#F59E0B', '#FB923C', '#F97316']}
                            style={styles.weekDayCircleSel}
                          >
                            <Text style={styles.weekDayNumTextSel}>{d.getDate()}</Text>
                          </LinearGradient>
                        ) : isToday ? (
                          <LinearGradient
                            colors={['#8B5CF6', '#7C3AED']}
                            style={styles.weekDayCircleSel}
                          >
                            <Text style={styles.weekDayNumTextSel}>{d.getDate()}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.weekDayCircle}>
                            <Text style={styles.weekDayNumText}>{d.getDate()}</Text>
                          </View>
                        )}
                        <View style={styles.weekDots}>
                          {dayEvts.slice(0, 3).map((_, i) => (
                            <View
                              key={i}
                              style={[styles.weekDot, { backgroundColor: '#22C55E' }]}
                            />
                          ))}
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

          {/* ════ AGENDA VIEW ════ */}
          {viewMode === 'agenda' && (
            <View style={styles.agendaWrap}>
              {eventsLoading ? (
                <View style={styles.eventsLoader}>
                  <ActivityIndicator color="#A78BFA" />
                </View>
              ) : agendaGroups.length === 0 ? (
                <EmptyState title="Nothing scheduled" subtitle="No upcoming events in the next 90 days" />
              ) : (
                agendaGroups.map((group) => (
                  <View key={group.month} style={styles.agendaMonth}>
                    <View style={styles.agendaMonthHeader}>
                      <Text style={styles.agendaMonthText}>{group.month.toUpperCase()}</Text>
                      <View style={styles.agendaMonthLine} />
                      <View style={styles.agendaMonthBadge}>
                        <Text style={styles.agendaMonthBadgeText}>
                          {group.dates.reduce((acc, d) => acc + d.evts.length, 0)}
                        </Text>
                      </View>
                    </View>

                    {group.dates.map(({ dk, evts }) => {
                      const d = new Date(dk + 'T00:00:00');
                      const isToday = dk === todayStr;
                      return (
                        <View key={dk} style={styles.agendaDateRow}>
                          {isToday ? (
                            <LinearGradient
                              colors={['#7C3AED', '#A855F7']}
                              style={styles.agendaDateBubble}
                            >
                              <Text style={[styles.agendaDateDay, { color: '#fff' }]}>
                                {String(d.getDate()).padStart(2, '0')}
                              </Text>
                              <Text style={[styles.agendaDateMon, { color: 'rgba(255,255,255,0.7)' }]}>
                                {d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                              </Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.agendaDateBubble}>
                              <Text style={styles.agendaDateDay}>
                                {String(d.getDate()).padStart(2, '0')}
                              </Text>
                              <Text style={styles.agendaDateMon}>
                                {d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.agendaEventsCol}>
                            {evts.map((ev) => (
                              <PremiumEventCard
                                key={ev.id}
                                event={ev}
                                onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}
                              />
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          )}

        </ScrollView>

        {isAssistant && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('AddEditEvent', undefined)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGrad}
            >
              <Ionicons name="add" size={30} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <DatePopupModal
          visible={popupDate !== null}
          dateStr={popupDate ?? ''}
          events={popupEvents}
          onClose={() => setPopupDate(null)}
          onEventPress={(id) => {
            setPopupDate(null);
            navigation.navigate('EventDetail', { eventId: id });
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.dayCircle}>
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
            <Ionicons name="chevron-back" size={15} color="#6D28D9" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navArrow} onPress={() => onNavigate(addDays(dateStr, 1))}>
            <Ionicons name="chevron-forward" size={15} color="#6D28D9" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.eventsLoader}>
          <ActivityIndicator color="#A78BFA" size="small" />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.noDayEvents}>
          <Ionicons name="calendar-outline" size={19} color="#7C3AED" />
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

function PremiumEventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.premCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.premStripe, { backgroundColor: '#7C3AED' }]} />
      <View style={styles.premIconBox}>
        <Text style={{ fontSize: 17 }}>{eventTypeIcons[event.event_type] ?? '📅'}</Text>
      </View>
      <View style={styles.premBody}>
        <Text style={styles.premTitle} numberOfLines={1}>{event.title}</Text>
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
        </View>
      </View>
      <Ionicons name="chevron-forward" size={12} color="#9CA3AF" style={{ marginRight: 10 }} />
    </TouchableOpacity>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyWrap}>
      <LinearGradient
        colors={['rgba(124,58,237,0.32)', 'rgba(168,85,247,0.18)']}
        style={styles.emptyIconCircle}
      >
        <Ionicons name="calendar-outline" size={32} color="#A78BFA" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function DatePopupModal({
  visible, dateStr, events, onClose, onEventPress,
}: {
  visible: boolean;
  dateStr: string;
  events: Event[];
  onClose: () => void;
  onEventPress: (id: string) => void;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [fullPosterUrl, setFullPosterUrl] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = SCREEN_W - 48;

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
            <LinearGradient colors={['#7C3AED', '#A855F7']} style={popupStyles.dateBadge}>
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
              {events.length > 1 && (
                <View style={popupStyles.pageCounter}>
                  <Text style={popupStyles.pageCounterText}>
                    {currentPage + 1} / {events.length}
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
                <View key={ev.id} style={{ width: cardWidth }}>
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
                      colors={['transparent', 'rgba(26,14,64,0.92)']}
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
                          <Ionicons name="time-outline" size={14} color="#A78BFA" />
                        </View>
                        <Text style={popupStyles.metaText}>{formatTime(ev.date_start)}</Text>
                      </View>
                      {location && (
                        <View style={popupStyles.metaRow}>
                          <View style={popupStyles.metaIconBox}>
                            <Ionicons name="location-outline" size={14} color="#A78BFA" />
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
                        colors={['#7C3AED', '#8B5CF6', '#A855F7']}
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
          </ScrollView>

          {/* ── Pagination dots ── */}
          {events.length > 1 && (
            <View style={popupStyles.dotsRow}>
              {events.map((_, i) => (
                <View
                  key={i}
                  style={[popupStyles.dot, i === currentPage && popupStyles.dotActive]}
                />
              ))}
              <Text style={popupStyles.swipeHint}>swipe for more</Text>
            </View>
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
    backgroundColor: 'rgba(251,146,60,0.20)',
  },
  // Lavender glow — center area softener for glassmorphism feel
  orb2: {
    position: 'absolute',
    top: 260,
    left: -30,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(196,181,253,0.18)',
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
  calCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: CAL_H_PAD,
    paddingTop: 16,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.14)',
    marginBottom: 12,
    shadowColor: '#6D28D9',
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
    backgroundColor: 'rgba(109,40,217,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.15)',
  },
  calNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1F3A',
    letterSpacing: 0.2,
  },
  calHeaders: { flexDirection: 'row', marginBottom: 4 },
  calHeaderCell: { width: CELL_SIZE, alignItems: 'center', paddingVertical: 4 },
  calHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(109,40,217,0.6)',
    letterSpacing: 0.5,
  },
  calRow: { flexDirection: 'row', marginBottom: 1 },
  calCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  calDayCapsule: {
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 10,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calDayNormal: {
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 10,
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
    borderColor: 'rgba(124,58,237,0.10)',
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
    backgroundColor: 'rgba(109,40,217,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(109,40,217,0.18)',
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
    backgroundColor: 'rgba(109,40,217,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.15)',
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
    borderColor: 'rgba(109,40,217,0.1)',
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
    borderColor: 'rgba(124,58,237,0.12)',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  premStripe: { width: 3.5, alignSelf: 'stretch' },
  premIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(109,40,217,0.07)',
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
    borderColor: 'rgba(124,58,237,0.14)',
    marginBottom: 12,
    shadowColor: '#6D28D9',
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
    borderBottomColor: 'rgba(109,40,217,0.1)',
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
    backgroundColor: 'rgba(109,40,217,0.06)',
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
  weekDots: { flexDirection: 'row', gap: 2, height: 8, alignItems: 'center' },
  weekDot: { width: 5, height: 5, borderRadius: 2.5 },

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
    color: '#7C3AED',
    letterSpacing: 1.5,
  },
  agendaMonthLine: { flex: 1, height: 1, backgroundColor: 'rgba(124,58,237,0.15)' },
  agendaMonthBadge: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
  },
  agendaMonthBadgeText: { fontSize: 11, fontWeight: '800', color: '#7C3AED' },
  agendaDateRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  agendaDateBubble: {
    width: 52,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
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
    shadowColor: '#A855F7',
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
    shadowColor: '#8B5CF6',
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
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  pageCounterText: { fontSize: 11, fontWeight: '800', color: '#A78BFA' },
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
    backgroundColor: 'rgba(124,58,237,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 },
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
    backgroundColor: '#A855F7',
  },
  swipeHint: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
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
