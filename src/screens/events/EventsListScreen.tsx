import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, shadow, radius, eventTypeIcons, gradients } from '../../constants/theme';
import { getLoadingVerse } from '../../constants/verses';
import { getEvents, confirmEvent } from '../../services/events';
import { Event } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList, MainTabParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type EventsRoute = RouteProp<MainTabParamList, 'Events'>;

function dateBlock(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-US', { day: '2-digit' }),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  };
}

function daysUntil(iso: string): string | null {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff}d`;
}

export default function EventsListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<EventsRoute>();
  const isAssistant = user?.role === 'assistant';

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuEvent, setMenuEvent] = useState<Event | null>(null);

  const [search, setSearch] = useState('');
  const [timeFilters, setTimeFilters] = useState<string[]>(['upcoming']);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [tentativeOnly, setTentativeOnly] = useState(false);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  function toggleType(val: string) {
    setTypeFilters(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  useFocusEffect(useCallback(() => {
    if (route.params?.filterToday) {
      setTimeFilters(['today']);
    }
  }, [route.params?.filterToday]));

  function toggleTime(val: string) {
    setTimeFilters(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function toggleRegion(val: string) {
    setRegionFilters(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  const loadData = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); loadData(); }, [loadData]));

  const handleDuplicate = useCallback((event: Event) => {
    setMenuEvent(null);
    navigation.navigate('AddEditEvent', { duplicateFromId: event.id });
  }, [navigation]);

  const handleConfirm = useCallback(async (event: Event) => {
    setMenuEvent(null);
    try {
      await confirmEvent(event.id);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'confirmed' } : e));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const allRegions = useMemo(() =>
    [...new Set(events.map(e => e.venue?.region).filter(Boolean) as string[])].sort(),
    [events]
  );

  const filtered = useMemo(() => {
    return events.filter(e => {
      const eventDate = new Date(e.date_start);
      if (timeFilters.length > 0) {
        const isUpcoming = eventDate >= startOfToday;
        const isToday = eventDate.toDateString() === startOfToday.toDateString();
        const matchesTime =
          (timeFilters.includes('today') && isToday) ||
          (timeFilters.includes('upcoming') && isUpcoming) ||
          (timeFilters.includes('past') && !isUpcoming);
        if (!matchesTime) return false;
      }
      if (tentativeOnly && e.status !== 'tentative') return false;
      if (typeFilters.length > 0) {
        const isMinistry = e.event_type !== 'travel' && e.event_type !== 'personal';
        const matchesType =
          (typeFilters.includes('ministry') && isMinistry) ||
          (typeFilters.includes('travel') && e.event_type === 'travel') ||
          (typeFilters.includes('personal') && e.event_type === 'personal');
        if (!matchesType) return false;
      }
      if (regionFilters.length > 0 && !regionFilters.includes(e.venue?.region ?? '')) return false;
      if (search.trim() && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [events, timeFilters, regionFilters, tentativeOnly, typeFilters, search, startOfToday]);

  const sections = useMemo(() => {
    const byYear: Record<string, Event[]> = {};
    filtered.forEach(e => {
      const year = new Date(e.date_start).getFullYear().toString();
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(e);
    });
    const onlyPast = timeFilters.length === 1 && timeFilters[0] === 'past';
    const years = Object.keys(byYear).sort((a, b) =>
      onlyPast ? Number(b) - Number(a) : Number(a) - Number(b)
    );
    return years.map(year => ({ title: year, data: byYear[year] }));
  }, [filtered, timeFilters]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* ── GRADIENT HERO ── */}
      <LinearGradient
        colors={gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Title row */}
        <View style={styles.heroBar}>
          <View>
            <Text style={styles.heroTitle}>Events</Text>
            <Text style={styles.heroSub}>All your speaking engagements</Text>
          </View>
        </View>

        {/* Search bar inside hero */}
        <View style={styles.heroSearch}>
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput
            style={styles.heroSearchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search events..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
          />
          {search !== '' && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color={colors.inactive} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── FILTER CHIPS ── */}
      <View style={styles.filtersWrap}>
        {/* Time filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(['upcoming', 'past'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, timeFilters.includes(f) && styles.chipActive]}
              onPress={() => toggleTime(f)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={f === 'upcoming' ? 'flash' : 'time-outline'}
                size={11}
                color={timeFilters.includes(f) ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.chipText, timeFilters.includes(f) && styles.chipTextActive]}>
                {f === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, timeFilters.includes('today') && styles.chipTodayActive]}
            onPress={() => setTimeFilters(prev => prev.includes('today') ? ['upcoming'] : ['today'])}
            activeOpacity={0.75}
          >
            <Ionicons
              name="today-outline"
              size={11}
              color={timeFilters.includes('today') ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.chipText, timeFilters.includes('today') && styles.chipTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, timeFilters.length === 0 && styles.chipActive]}
            onPress={() => setTimeFilters([])}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, timeFilters.length === 0 && styles.chipTextActive]}>All Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, tentativeOnly && styles.chipTentativeActive]}
            onPress={() => setTentativeOnly(p => !p)}
            activeOpacity={0.75}
          >
            <Ionicons name="time-outline" size={11} color={tentativeOnly ? '#fff' : '#D97706'} />
            <Text style={[styles.chipText, tentativeOnly && styles.chipTextActive]}>Tentative</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.chip, typeFilters.length === 0 && styles.chipActive]}
            onPress={() => setTypeFilters([])}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, typeFilters.length === 0 && styles.chipTextActive]}>All Types</Text>
          </TouchableOpacity>
          {([
            { key: 'ministry', label: 'Ministry', icon: 'mic-outline',      color: '#4F46E5' },
            { key: 'travel',   label: 'Trip',      icon: 'airplane-outline', color: '#2563EB' },
            { key: 'personal', label: 'Personal',  icon: 'person-outline',   color: '#DB2777' },
          ] as const).map(({ key, label, icon, color }) => {
            const active = typeFilters.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => toggleType(key)}
                activeOpacity={0.75}
              >
                <Ionicons name={icon} size={11} color={active ? '#fff' : color} />
                <Text style={[styles.chipText, active && styles.chipTextActive, !active && { color }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Region filter */}
        {allRegions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[styles.chip, regionFilters.length === 0 && styles.chipActive]}
              onPress={() => setRegionFilters([])}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, regionFilters.length === 0 && styles.chipTextActive]}>All Regions</Text>
            </TouchableOpacity>
            {allRegions.map(region => (
              <TouchableOpacity
                key={region}
                style={[styles.chip, regionFilters.includes(region) && styles.chipActive]}
                onPress={() => toggleRegion(region)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="location-outline"
                  size={11}
                  color={regionFilters.includes(region) ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.chipText, regionFilters.includes(region) && styles.chipTextActive]}>
                  {region}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── LIST ── */}
      <LinearGradient
        colors={[colors.primaryMid, colors.background] as const}
        locations={[0, 0.35]}
        style={{ flex: 1 }}
      >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{getLoadingVerse()}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              now={startOfToday}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
              onMenuOpen={isAssistant ? () => setMenuEvent(item) : undefined}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.yearHeader}>
              <View style={styles.yearLine} />
              <Text style={styles.yearText}>{section.title}</Text>
              <View style={styles.yearLine} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadData(); }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {search || regionFilters.length > 0
                  ? 'Try changing your filters or search term.'
                  : timeFilters.includes('today')
                  ? 'No events scheduled for today.'
                  : timeFilters.includes('past') && !timeFilters.includes('upcoming')
                  ? 'No past events yet.'
                  : 'No upcoming events scheduled.'}
              </Text>
            </View>
          }
        />
      )}

      </LinearGradient>

      {isAssistant && (
        <TouchableOpacity
          style={[styles.fab, shadow.lg]}
          onPress={() => navigation.navigate('AddEditEvent', undefined)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Three-dot event menu ── */}
      <Modal visible={!!menuEvent} transparent animationType="fade" onRequestClose={() => setMenuEvent(null)}>
        <TouchableOpacity style={menuStyles.backdrop} activeOpacity={1} onPress={() => setMenuEvent(null)} />
        <View style={menuStyles.sheet}>
          <View style={menuStyles.handle} />
          <Text style={menuStyles.eventTitle} numberOfLines={2}>{menuEvent?.title}</Text>
          <View style={menuStyles.divider} />
          {menuEvent?.status === 'tentative' && (
            <TouchableOpacity
              style={menuStyles.option}
              onPress={() => menuEvent && handleConfirm(menuEvent)}
              activeOpacity={0.75}
            >
              <View style={[menuStyles.optionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={menuStyles.optionLabel}>Confirm Event</Text>
                <Text style={menuStyles.optionSub}>Mark this event as confirmed and approved</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={menuStyles.option}
            onPress={() => menuEvent && handleDuplicate(menuEvent)}
            activeOpacity={0.75}
          >
            <View style={menuStyles.optionIcon}>
              <Ionicons name="copy-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={menuStyles.optionLabel}>Duplicate Event</Text>
              <Text style={menuStyles.optionSub}>Create a copy to reuse on a different date</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={menuStyles.cancelBtn} onPress={() => setMenuEvent(null)} activeOpacity={0.75}>
            <Text style={menuStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function cardColors(_countdown: string | null, _isPast: boolean, isPending = false): [string, string] {
  if (isPending) return ['#FFFBEB', '#FFFBEB'];
  return ['#ffffff', '#ffffff'];
}

function cardAccent(countdown: string | null, isPast: boolean): string {
  if (isPast) return colors.textSecondary;
  if (countdown === 'Today') return colors.danger;
  if (countdown === 'Tomorrow') return colors.warning;
  return colors.primary;
}

function EventCard({
  event,
  now,
  onPress,
  onMenuOpen,
}: {
  event: Event;
  now: Date;
  onPress: () => void;
  onMenuOpen?: () => void;
}) {
  const { day, month } = dateBlock(event.date_start);
  const isPast = new Date(event.date_start) < now;
  const isPending = event.status === 'tentative';
  const countdown = daysUntil(event.date_start);
  const accent = isPending ? '#D97706' : cardAccent(countdown, isPast);
  const gradientColors = cardColors(countdown, isPast, isPending);

  return (
    <TouchableOpacity
      style={[styles.card, shadow.xs]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Horizontal gradient background */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {isPending && <View style={styles.pendingStripe} />}

      {/* Date column */}
      <View style={styles.dateCol}>
        <Text style={[styles.dateDay, { color: accent }]}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>{eventTypeIcons[event.event_type] ?? '📅'}</Text>
          <Text style={[styles.cardTitle, isPast && styles.textPast]} numberOfLines={1}>
            {event.title}
          </Text>
        </View>

        <View style={styles.cardMeta}>
          {event.venue?.city && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
              <Text style={styles.metaText}>{event.venue.city}</Text>
            </View>
          )}
          {event.venue?.region && event.venue?.city && (
            <Text style={styles.metaDot}>·</Text>
          )}
          {event.venue?.region && (
            <Text style={styles.metaText}>{event.venue.region}</Text>
          )}
          {event.travel?.flight_booked && (
            <View style={styles.flightBadge}>
              <Ionicons name="airplane" size={10} color={colors.success} />
              <Text style={styles.flightBadgeText}>Booked</Text>
            </View>
          )}
          {event.accommodation?.hotel_name && (
            <View style={styles.hotelBadge}>
              <Ionicons name="bed-outline" size={10} color={colors.primary} />
              <Text style={styles.hotelBadgeText}>Hotel</Text>
            </View>
          )}
          {isPending && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={10} color="#D97706" />
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </View>
          )}
        </View>
      </View>

      {/* Countdown — own column, doesn't affect card height */}
      {countdown && (
        <View style={[
          styles.countdownBadge,
          { backgroundColor: countdown === 'Today'
              ? colors.danger
              : countdown === 'Tomorrow'
              ? colors.warning
              : colors.primaryLight },
        ]}>
          {countdown.startsWith('In ') ? (
            <>
              <Text style={[styles.countdownSub, { color: colors.primary }]}>In</Text>
              <Text style={[styles.countdownText, { color: colors.primary }]}>
                {countdown.replace('In ', '')}
              </Text>
            </>
          ) : (
            <Text style={[
              styles.countdownText,
              countdown !== 'Today' && countdown !== 'Tomorrow' && { color: colors.primary },
            ]}>
              {countdown}
            </Text>
          )}
        </View>
      )}

      {onMenuOpen && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onMenuOpen(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.6}
          style={styles.threeDot}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // ── HERO ──
  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 16,
  },
  heroBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  statPill: { alignItems: 'center', paddingHorizontal: 10 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  heroSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // ── FILTERS ──
  filtersWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    gap: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipTodayActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  chipTentativeActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },

  // ── LIST ──
  listContent: { padding: 16, paddingBottom: 110 },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: colors.textSecondary, fontSize: 14 },

  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  yearLine: { flex: 1, height: 1, backgroundColor: colors.border },
  yearText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── CARD ──
  card: {
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardPast: { opacity: 0.65 },
  dateCol: {
    width: 60,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRightWidth: 4,
    borderRightColor: 'rgba(0, 0, 0, 0.08)',
  },
  dateDay: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  dateMonth: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cardBody: { flex: 1, paddingVertical: 13, paddingHorizontal: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  cardEmoji: { fontSize: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  textPast: { color: colors.textSecondary },

  threeDot: {
    padding: 4,
  },
  countdownBadge: {
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 44,
  },
  countdownSub: { fontSize: 11, fontWeight: '600', color: '#fff', letterSpacing: 0.3 },
  countdownText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },

  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  metaDot: { fontSize: 11, color: colors.textTertiary },

  flightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  flightBadgeText: { fontSize: 10, fontWeight: '700', color: colors.success },

  hotelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hotelBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  pendingStripe: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: '#D97706',
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },

  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const menuStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  optionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cancelBtn: {
    marginTop: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
});
