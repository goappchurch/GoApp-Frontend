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

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#10B981',
  tentative: '#F59E0B',
  rejected: '#EF4444',
  cancelled: '#EF4444',
  completed: '#94A3B8',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  tentative: 'Tentative',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Done',
};

const LEGEND_ITEMS = [
  { key: 'confirmed', color: '#10B981', label: 'Confirmed' },
  { key: 'tentative', color: '#F59E0B', label: 'Tentative' },
  { key: 'rejected', color: '#EF4444', label: 'Rejected' },
  { key: 'completed', color: '#94A3B8', label: 'Done' },
];

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

  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      if (viewMode === 'agenda') loadAgenda(true);
      else loadMonth(currentMonth.year, currentMonth.month, true);
    } else {
      if (viewMode === 'agenda') loadAgenda();
      else loadMonth(currentMonth.year, currentMonth.month);
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

  const monthStats = useMemo(() => ({
    total: events.length,
    confirmed: events.filter(e => e.status === 'confirmed').length,
    tentative: events.filter(e => e.status === 'tentative').length,
    rejected: events.filter(e => e.status === 'rejected' || e.status === 'cancelled').length,
    completed: events.filter(e => e.status === 'completed').length,
  }), [events]);

  const statusCountsMap: Record<string, number> = {
    confirmed: monthStats.confirmed,
    tentative: monthStats.tentative,
    rejected: monthStats.rejected,
    completed: monthStats.completed,
  };

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
        colors={['#120D2E', '#2A166F', '#4C1D95', '#6D28D9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}
      >
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '600' }}>
          Loading calendar…
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#3f22d1', '#35129d', '#40216c', '#12022d']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Ambient orb decorations */}
        <View style={styles.orb1} pointerEvents="none" />
        <View style={styles.orb2} pointerEvents="none" />

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {viewMode === 'agenda' ? 'Agenda' : formatMonthName(currentMonth.year, currentMonth.month)}
            </Text>
            <Text style={styles.headerSub}>
              {eventsLoading
                ? 'Refreshing…'
                : viewMode === 'agenda'
                  ? `${agendaEvents.length} upcoming event${agendaEvents.length !== 1 ? 's' : ''}`
                  : `${events.length} event${events.length !== 1 ? 's' : ''} · ${currentMonth.year}`}
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
                    colors={['#7C3AED', '#5B21B6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.segTabGrad}
                  >
                    <Ionicons name={tab.icon} size={13} color="#fff" />
                    <Text style={styles.segTabTextActive}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.segTabInner}>
                    <Ionicons name={tab.icon} size={13} color="rgba(255,255,255,0.45)" />
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
              <View style={styles.calCard}>
                {/* Month navigation */}
                <View style={styles.calNav}>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => handleMonthStep(-1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={19} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                  <Text style={styles.calNavTitle}>
                    {formatMonthYear(currentMonth.year, currentMonth.month)}
                  </Text>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => handleMonthStep(1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={19} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.calHeaders}>
                  {WEEKDAY_LABELS.map((w, i) => (
                    <View key={i} style={styles.calHeaderCell}>
                      <Text style={styles.calHeaderText}>{w}</Text>
                    </View>
                  ))}
                </View>

                {/* Date grid */}
                {calGrid.map((row, ri) => {
                  const spans = calEventSpans[ri] ?? [];
                  const multiDayDateSet = new Set<string>();
                  for (const span of spans) {
                    for (let c = span.startCol; c <= span.endCol; c++) {
                      const d = row[c];
                      if (d !== null) {
                        multiDayDateSet.add(`${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
                      }
                    }
                  }

                  return (
                    <View key={ri} style={[styles.calRow, { position: 'relative' }]}>
                      {/* Multi-day event strips — merged into one green band per contiguous range */}
                      {spans
                        .reduce<{ startCol: number; endCol: number; isEventStart: boolean; isEventEnd: boolean }[]>((acc, span) => {
                          const hit = acc.find(r => span.startCol <= r.endCol + 1 && span.endCol >= r.startCol - 1);
                          if (hit) {
                            if (span.startCol < hit.startCol) { hit.startCol = span.startCol; hit.isEventStart = span.isEventStart; }
                            if (span.endCol > hit.endCol)     { hit.endCol = span.endCol;     hit.isEventEnd   = span.isEventEnd;   }
                          } else {
                            acc.push({ startCol: span.startCol, endCol: span.endCol, isEventStart: span.isEventStart, isEventEnd: span.isEventEnd });
                          }
                          return acc;
                        }, [])
                        .map((r, si) => (
                          <View
                            key={si}
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: r.startCol * CELL_SIZE,
                              width: (r.endCol - r.startCol + 1) * CELL_SIZE,
                              top: 4,
                              height: CELL_SIZE - 10,
                              backgroundColor: '#fbfbfb38',
                              borderTopLeftRadius: r.isEventStart ? 12 : 0,
                              borderBottomLeftRadius: r.isEventStart ? 12 : 0,
                              borderTopRightRadius: r.isEventEnd ? 12 : 0,
                              borderBottomRightRadius: r.isEventEnd ? 12 : 0,
                              borderLeftColor: '#ffffff',
                              zIndex: 0,
                            }}
                          />
                        ))}

                      {row.map((day, ci) => {
                        if (day === null) {
                          return <View key={ci} style={styles.calCell} />;
                        }
                        const ds = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = ds === todayStr;
                        const isSelected = ds === selectedDate;
                        const dayEvts = dateEventMap[ds] ?? [];
                        const isMultiDay = multiDayDateSet.has(ds);
                        const singleDayEvts = isMultiDay
                          ? dayEvts.filter(e => {
                              const s = e.date_start.split('T')[0];
                              const en = e.date_end ? e.date_end.split('T')[0] : s;
                              return s === en;
                            })
                          : dayEvts;
                        const dotColors = singleDayEvts.slice(0, 2).map(() => '#10B981');

                        return (
                          <TouchableOpacity
                            key={ci}
                            style={[styles.calCell, { zIndex: 1 }]}
                            onPress={() => {
                              setSelectedDate(ds);
                              if (dayEvts.length > 0) {
                                setPopupDate(ds);
                                setPopupEvents(dayEvts);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            {isSelected ? (
                              <LinearGradient
                                colors={['#F97316', '#EF4444']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.calDayCapsule}
                              >
                                <Text style={styles.calDayTextBright}>{day}</Text>
                              </LinearGradient>
                            ) : isToday ? (
                              <LinearGradient
                                colors={['#7C3AED', '#5B21B6']}
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
                                  dayEvts.length > 0 && styles.calDayTextHasEvent,
                                ]}>
                                  {day}
                                </Text>
                              </View>
                            )}
                            {dotColors.length > 0 && (
                              <View style={styles.calDots}>
                                {dotColors.map((c, di) => (
                                  <View key={di} style={[styles.calDot, { backgroundColor: c }]} />
                                ))}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}

                {/* Legend */}
                <View style={styles.calLegend}>
                  {LEGEND_ITEMS.map(item => {
                    const count = statusCountsMap[item.key] ?? 0;
                    return (
                      <View key={item.key} style={styles.calLegendItem}>
                        <View style={[styles.calLegendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.calLegendLabel}>{item.label}</Text>
                        {count > 0 && (
                          <Text style={[styles.calLegendCount, { color: item.color }]}>{count}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
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
                    <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                  <Text style={styles.weekRangeText}>
                    {new Date(weekDays[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {new Date(weekDays[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity style={styles.calNavBtn} onPress={() => goWeek(1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
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
                        <Text style={[styles.weekDayName, isToday && { color: '#A78BFA' }]}>
                          {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </Text>
                        {isSelected ? (
                          <LinearGradient
                            colors={['#F97316', '#EF4444']}
                            style={styles.weekDayCircleSel}
                          >
                            <Text style={styles.weekDayNumTextSel}>{d.getDate()}</Text>
                          </LinearGradient>
                        ) : isToday ? (
                          <LinearGradient
                            colors={['#7C3AED', '#5B21B6']}
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
                              style={[styles.weekDot, { backgroundColor: '#10B981' }]}
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
                              colors={['#7C3AED', '#5B21B6']}
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
              colors={['#7C3AED', '#5B21B6']}
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
            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.dayCircle}>
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
            <Ionicons name="chevron-back" size={15} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navArrow} onPress={() => onNavigate(addDays(dateStr, 1))}>
            <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.eventsLoader}>
          <ActivityIndicator color="#A78BFA" size="small" />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.noDayEvents}>
          <Ionicons name="calendar-outline" size={19} color="rgba(255,255,255,0.25)" />
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
  const stripeColor = STATUS_COLORS[event.status] ?? '#A78BFA';
  const statusLabel = STATUS_LABELS[event.status] ?? event.status;

  return (
    <TouchableOpacity style={styles.premCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.premStripe, { backgroundColor: stripeColor }]} />
      <View style={styles.premIconBox}>
        <Text style={{ fontSize: 17 }}>{eventTypeIcons[event.event_type] ?? '📅'}</Text>
      </View>
      <View style={styles.premBody}>
        <Text style={styles.premTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.premMeta}>
          <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.45)" />
          <Text style={styles.premMetaText}>{formatTime(event.date_start)}</Text>
          {(event as any).venue?.city && (
            <>
              <Text style={styles.premMetaDot}>·</Text>
              <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.45)" />
              <Text style={styles.premMetaText}>{(event as any).venue.city}</Text>
            </>
          )}
        </View>
      </View>
      <View style={[
        styles.premStatusPill,
        { borderColor: stripeColor + '55', backgroundColor: stripeColor + '18' },
      ]}>
        <Text style={[styles.premStatusText, { color: stripeColor }]}>{statusLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.25)" style={{ marginRight: 10 }} />
    </TouchableOpacity>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyWrap}>
      <LinearGradient
        colors={['rgba(124,58,237,0.25)', 'rgba(91,33,182,0.25)']}
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
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = SCREEN_W - 48;

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
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
            <LinearGradient colors={['#10B981', '#059669']} style={popupStyles.dateBadge}>
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
                      colors={['transparent', 'rgba(22,11,58,0.88)']}
                      style={popupStyles.posterGradient}
                    />
                    <View style={popupStyles.posterExpandBtn}>
                      <Ionicons name="expand-outline" size={13} color="#fff" />
                      <Text style={popupStyles.posterExpandText}>View full</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Info section */}
                  <View style={popupStyles.infoSection}>
                    <Text style={popupStyles.eventTitle} numberOfLines={2}>{ev.title}</Text>
                    <View style={popupStyles.metaList}>
                      <View style={popupStyles.metaRow}>
                        <View style={popupStyles.metaIconBox}>
                          <Ionicons name="time-outline" size={14} color="#10B981" />
                        </View>
                        <Text style={popupStyles.metaText}>{formatTime(ev.date_start)}</Text>
                      </View>
                      {location && (
                        <View style={popupStyles.metaRow}>
                          <View style={popupStyles.metaIconBox}>
                            <Ionicons name="location-outline" size={14} color="#10B981" />
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
                        colors={['#10B981', '#059669']}
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
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  orb1: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,58,237,0.18)',
  },
  orb2: {
    position: 'absolute',
    bottom: 120,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(109,40,217,0.12)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginTop: 2,
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
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  segTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  segTabTextActive: { fontSize: 13, fontWeight: '700', color: '#fff' },

  scroll: { paddingBottom: 110 },

  // Calendar card
  calCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: CAL_H_PAD,
    paddingTop: 16,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
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
    backgroundColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  calNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  calHeaders: { flexDirection: 'row', marginBottom: 4 },
  calHeaderCell: { width: CELL_SIZE, alignItems: 'center', paddingVertical: 4 },
  calHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.42)',
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
    color: 'rgba(255,255,255,0.65)',
  },
  calDayTextHasEvent: { color: '#fff', fontWeight: '700' },
  calDayTextBright: { fontSize: 14, fontWeight: '800', color: '#fff' },
  calDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
    justifyContent: 'center',
  },
  calDot: { width: 4, height: 4, borderRadius: 2 },

  // Legend
  calLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  calLegendLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  calLegendCount: { fontSize: 10, fontWeight: '800', marginLeft: 1 },

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
  dayPanel: { paddingHorizontal: 16, marginTop: 4 },
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
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  dayCircleNum: { fontSize: 19, fontWeight: '800', color: 'rgba(255,255,255,0.75)' },
  dayCircleNumActive: { fontSize: 19, fontWeight: '800', color: '#fff' },
  dayFullLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  dayMonthLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  dayPanelNav: { flexDirection: 'row', gap: 8 },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  eventsLoader: { paddingVertical: 24, alignItems: 'center' },
  noDayEvents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 8,
  },
  noDayText: { color: 'rgba(255,255,255,0.38)', fontSize: 14, fontWeight: '500' },

  // Premium event card
  premCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  premStripe: { width: 3.5, alignSelf: 'stretch' },
  premIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  premBody: { flex: 1, paddingVertical: 12 },
  premTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 4 },
  premMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  premMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  premMetaDot: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
  premStatusPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  premStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Week view
  weekCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  weekRangeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  weekDays: { flexDirection: 'row', paddingTop: 14, paddingHorizontal: 8 },
  weekDayCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekDayName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3,
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  weekDayCircleSel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayNumText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
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
    color: '#A78BFA',
    letterSpacing: 1.5,
  },
  agendaMonthLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.09)' },
  agendaMonthBadge: {
    backgroundColor: 'rgba(124,58,237,0.28)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  agendaMonthBadgeText: { fontSize: 11, fontWeight: '800', color: '#A78BFA' },
  agendaDateRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  agendaDateBubble: {
    width: 52,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  agendaDateDay: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  agendaDateMon: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
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
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
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
    backgroundColor: '#160B3A',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
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
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  pageCounterText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
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
    backgroundColor: 'rgba(124,58,237,0.2)',
    overflow: 'hidden',
  },
  posterFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.18)',
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
    backgroundColor: 'rgba(16,185,129,0.12)',
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
    backgroundColor: '#10B981',
  },
  swipeHint: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
});
