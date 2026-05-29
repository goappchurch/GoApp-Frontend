import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { getUpcomingEvents, getNotifications } from '../../services/events';
import { useNotificationStore } from '../../store/notificationStore';
import { useRealtimeEvents, useRealtimeNotifications } from '../../hooks/useRealtimeEvents';
import { Event } from '../../types';
import { colors, shadow, radius, eventTypeLabels, eventTypeIcons } from '../../constants/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Past';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff}d`;
}

function dateBlock(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-US', { day: '2-digit' }),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const isAssistant = user?.role === 'assistant';
  const isBoss = user?.role === 'boss';

  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { setNotifications, unreadCount } = useNotificationStore();

  const loadData = useCallback(async () => {
    try {
      const upcoming = await getUpcomingEvents(10);
      setUpcomingEvents(upcoming);
      if (user) {
        const notifs = await getNotifications(user.id);
        setNotifications(notifs);
      }
    } catch (e) {
      console.error('Home load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isBoss]);

  useFocusEffect(useCallback(() => { setLoading(true); loadData(); }, [loadData]));
  useRealtimeEvents(useCallback(() => { loadData(); }, [loadData]));
  useRealtimeNotifications(user?.id ?? '', useCallback(() => {
    if (user) getNotifications(user.id).then(setNotifications);
  }, [user, setNotifications]));

  const [posterModalUri, setPosterModalUri] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const heroScrollRef = useRef<ScrollView>(null);

  const CARD_W = Dimensions.get('window').width - 40;
  const heroEvents = upcomingEvents.slice(0, 10);
  // append first card at end so swipe past last loops back seamlessly
  const carouselEvents = heroEvents.length > 0 ? [...heroEvents, heroEvents[0]] : [];

  const restEvents = upcomingEvents.slice(0, 8);

  const allRegions = [...new Set(
    upcomingEvents.map(e => e.venue?.region).filter(Boolean) as string[]
  )].sort();

  const filteredRestEvents = regionFilter
    ? upcomingEvents.filter(e => e.venue?.region === regionFilter).slice(0, 8)
    : restEvents;
  const todayCount = upcomingEvents.filter(
    (e) => new Date(e.date_start).toDateString() === new Date().toDateString()
  ).length;
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor="rgba(255,255,255,0.8)"
          />
        }
      >
        {/* ── GRADIENT HERO ── */}
        <LinearGradient
          colors={['#2D1B8E', '#4C1D95', '#7C3AED', '#C4B5FD', '#EDE9FE', '#F5F3FF', colors.background] as const}
          locations={[0, 0.25, 0.45, 0.65, 0.82, 0.93, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}
        >
          {/* App bar */}
          <View style={styles.appBar}>
            <View>
              <Text style={styles.appName}>GoAppChurch</Text>
              <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            </View>
            <View style={styles.appBarRight}>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.75}
              >
                <Ionicons name="notifications" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{upcomingEvents.length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{todayCount}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
          </View>

          {/* Next Event carousel inside hero */}
          {!loading && (
            <View style={styles.heroCardWrap}>
              <View style={styles.heroCardLabel}>
                <Ionicons name="flash" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroCardLabelText}>Upcoming Events</Text>
                {heroEvents.length > 0 && (
                  <Text style={styles.heroCardCount}>{heroIndex + 1} / {heroEvents.length}</Text>
                )}
              </View>

              {heroEvents.length > 0 ? (
                <>
                  <ScrollView
                    ref={heroScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_W}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
                      if (idx >= heroEvents.length) {
                        heroScrollRef.current?.scrollTo({ x: 0, animated: false });
                        setHeroIndex(0);
                      } else {
                        setHeroIndex(idx);
                      }
                    }}
                  >
                    {carouselEvents.map((event, i) => (
                      <TouchableOpacity
                        key={`${event.id}-${i}`}
                        style={[styles.nextCard, shadow.md, { width: CARD_W }]}
                        onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                        activeOpacity={0.92}
                      >
                        <View style={styles.nextCardHero}>
                          {event.poster_url ? (
                            <Image source={{ uri: event.poster_url }} style={styles.nextCardImage} resizeMode="cover" />
                          ) : (
                            <LinearGradient
                              colors={['#1A3FA8', '#0E3A9A']}
                              style={styles.nextCardImage}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={{ fontSize: 56, opacity: 0.25 }}>{eventTypeIcons[event.event_type] ?? '📅'}</Text>
                            </LinearGradient>
                          )}

                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.72)']}
                            style={styles.nextCardOverlay}
                          >
                            <View style={[
                              styles.daysBadge,
                              daysUntil(event.date_start) === 'Today' && { backgroundColor: colors.danger },
                              daysUntil(event.date_start) === 'Tomorrow' && { backgroundColor: colors.warning },
                              daysUntil(event.date_start) !== 'Today' && daysUntil(event.date_start) !== 'Tomorrow' && { backgroundColor: 'rgba(255,255,255,0.2)' },
                            ]}>
                              <Text style={styles.daysText}>{daysUntil(event.date_start)}</Text>
                            </View>

                            <Text style={styles.nextCardTitle} numberOfLines={2}>{event.title}</Text>

                            <View style={styles.nextCardOverlayMeta}>
                              <View style={styles.nextFooterChip}>
                                <Ionicons name="calendar" size={11} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.nextFooterChipText}>{formatDate(event.date_start)}</Text>
                              </View>
                              {event.venue?.city && (
                                <View style={styles.nextFooterChip}>
                                  <Ionicons name="location" size={11} color="rgba(255,255,255,0.9)" />
                                  <Text style={styles.nextFooterChipText}>{event.venue.city}</Text>
                                </View>
                              )}
                              {event.travel?.flight_booked && (
                                <View style={styles.nextFooterFlightChip}>
                                  <Ionicons name="airplane" size={11} color="#4ADE80" />
                                  <Text style={styles.nextFooterFlightText}>Booked</Text>
                                </View>
                              )}
                            </View>
                          </LinearGradient>

                          {event.poster_url && (
                            <TouchableOpacity
                              style={styles.expandPosterBtn}
                              onPress={() => setPosterModalUri(event.poster_url!)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="expand-outline" size={16} color="#fff" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {heroEvents.length > 1 && (
                    <View style={styles.heroDots}>
                      {heroEvents.map((_, i) => (
                        <View key={i} style={[styles.heroDot, i === heroIndex && styles.heroDotActive]} />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.heroEmptyCard}>
                  <Ionicons name="calendar-outline" size={22} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.heroEmptyText}>
                    {isAssistant ? 'No upcoming events — tap + to add one' : 'No upcoming events'}
                  </Text>
                </View>
              )}
            </View>
          )}
          {loading && (
            <View style={styles.heroLoadingWrap}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
            </View>
          )}
        </LinearGradient>

        {/* ── WHITE CONTENT SHEET ── */}
        <View style={styles.sheet}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your schedule…</Text>
            </View>
          ) : (
            <>

              {/* Empty state */}
              {upcomingEvents.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="calendar-outline" size={40} color="#7C3AED" />
                  </View>
                  <Text style={styles.emptyTitle}>No Events Scheduled</Text>
                  <Text style={styles.emptySubtitle}>
                    {isAssistant
                      ? 'Tap the + button to add your first event.'
                      : 'No upcoming events have been added yet.'}
                  </Text>
                </View>
              )}

              {/* Upcoming list */}
              {upcomingEvents.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Upcoming Events</Text>
                  </View>

                  {/* Region filter chips */}
                  {allRegions.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.regionFilterRow}
                      style={{ marginBottom: 12 }}
                    >
                      <TouchableOpacity
                        style={[styles.regionChip, !regionFilter && styles.regionChipActive]}
                        onPress={() => setRegionFilter(null)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.regionChipText, !regionFilter && styles.regionChipTextActive]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {allRegions.map(region => (
                        <TouchableOpacity
                          key={region}
                          style={[styles.regionChip, regionFilter === region && styles.regionChipActive]}
                          onPress={() => setRegionFilter(r => r === region ? null : region)}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name="location-outline"
                            size={11}
                            color={regionFilter === region ? '#fff' : colors.textSecondary}
                          />
                          <Text style={[styles.regionChipText, regionFilter === region && styles.regionChipTextActive]}>
                            {region}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {filteredRestEvents.length === 0 ? (
                    <View style={styles.regionEmpty}>
                      <Ionicons name="location-outline" size={20} color={colors.textTertiary} />
                      <Text style={styles.regionEmptyText}>No upcoming events in this region</Text>
                    </View>
                  ) : filteredRestEvents.map((event) => {
                    const { day, month } = dateBlock(event.date_start);
                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[styles.timelineCard, shadow.xs]}
                        onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                        activeOpacity={0.8}
                      >
                        {/* Date column */}
                        <View style={[styles.dateCol, { borderRightColor: colors.success }]}>
                          <Text style={[styles.dateDay, { color: colors.success }]}>{day}</Text>
                          <Text style={styles.dateMonth}>{month}</Text>
                        </View>

                        {/* Event info */}
                        <View style={styles.timelineBody}>
                          <View style={styles.timelineTop}>
                            <Text style={styles.timelineEmoji}>{eventTypeIcons[event.event_type] ?? '📅'}</Text>
                            <Text style={styles.timelineTitle} numberOfLines={1}>{event.title}</Text>
                          </View>
                          <View style={styles.timelineMeta}>
                            {event.venue?.city && (
                              <View style={styles.timelineMetaItem}>
                                <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                                <Text style={styles.timelineMetaText}>{event.venue.city}</Text>
                              </View>
                            )}
                            <Text style={styles.timelineMetaDot}>·</Text>
                            <Text style={styles.timelineMetaText}>{formatTime(event.date_start)}</Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.inactive} style={{ marginRight: 12 }} />

                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Poster modal */}
      <Modal visible={!!posterModalUri} transparent animationType="fade" onRequestClose={() => setPosterModalUri(null)}>
        <Pressable style={styles.modalBg} onPress={() => setPosterModalUri(null)}>
          <Image source={{ uri: posterModalUri! }} style={styles.modalImage} resizeMode="contain" />
          <TouchableOpacity style={styles.modalClose} onPress={() => setPosterModalUri(null)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* FAB */}
      {isAssistant && (
        <TouchableOpacity
          style={[styles.fab, shadow.lg]}
          onPress={() => navigation.navigate('AddEditEvent', undefined)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#2a0dcd' },

  scrollContent: { paddingBottom: 100 },

  // ── HERO ──
  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  bellBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 4 },
  statNumber: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600', marginTop: 1 },

  // hero card label row
  heroCardWrap: { gap: 8 },
  heroCardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroCardLabelText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroCardCount: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginLeft: 4 },

  // empty state inside hero
  heroEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  heroEmptyText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', flex: 1 },
  heroLoadingWrap: { alignItems: 'center', paddingVertical: 20 },
  heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(124,58,237,0.25)' },
  heroDotActive: { width: 16, backgroundColor: '#7C3AED' },

  // ── SHEET ──
  sheet: {
    backgroundColor: colors.background,
    padding: 20,
    minHeight: 400,
  },

  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },

  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section headers
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flex: 1, letterSpacing: -0.2 },
  sectionLink: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Next event card
  nextCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  nextCardHero: { position: 'relative' },
  nextCardImage: {
    width: '100%',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
    gap: 6,
  },

  expandPosterBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  daysText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  nextCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  nextCardOverlayMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  nextFooterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  nextFooterChipText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  nextFooterFlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74,222,128,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  nextFooterFlightText: { fontSize: 11, fontWeight: '700', color: '#4ADE80' },

  // Poster modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.75,
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pending approvals
  urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  urgentBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  urgentBadgeText: { fontSize: 12, fontWeight: '700', color: colors.warning },
  approvalGroup: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  approvalRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  approvalEmoji: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  approvalBody: { flex: 1 },
  approvalTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  approvalMeta: { fontSize: 12, color: colors.textSecondary },
  approvalArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Timeline cards
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  dateCol: {
    width: 58,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1.5,
    paddingVertical: 14,
    backgroundColor: '#FAFBFF',
  },
  dateDay: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  dateMonth: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  timelineBody: { flex: 1, paddingVertical: 13, paddingHorizontal: 13 },
  timelineTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  timelineEmoji: { fontSize: 15 },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timelineMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timelineMetaText: { fontSize: 11, color: colors.textSecondary },
  timelineMetaDot: { fontSize: 11, color: colors.textTertiary },

  // Region filter
  regionFilterRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  regionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  regionChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  regionChipTextActive: { color: '#fff' },
  regionEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  regionEmptyText: { fontSize: 13, color: colors.textTertiary },

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
