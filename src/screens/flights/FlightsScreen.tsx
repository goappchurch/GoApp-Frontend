import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { getEvents } from '../../services/events';
import { Event, EventStatus } from '../../types';
import { colors, shadow, radius } from '../../constants/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Gradient palettes per destination initial (cycles through nice travel-themed colors)
const GRADIENTS: [string, string][] = [
  ['#1A56DB', '#0E3A9A'],
  ['#7C3AED', '#4C1D95'],
  ['#0891B2', '#0E4F6B'],
  ['#059669', '#064E3B'],
  ['#DC2626', '#7F1D1D'],
  ['#D97706', '#78350F'],
  ['#DB2777', '#831843'],
  ['#4F46E5', '#1E1B4B'],
];

function gradientFor(str: string): [string, string] {
  return GRADIENTS[(str.charCodeAt(0) ?? 0) % GRADIENTS.length];
}

const STATUS_META: Record<EventStatus, { label: string; bg: string; text: string }> = {
  confirmed:  { label: 'Confirmed',  bg: '#DCFCE7', text: '#15803D' },
  tentative:  { label: 'Tentative',  bg: '#FEF9C3', text: '#854D0E' },
  rejected:   { label: 'Rejected',   bg: '#FEE2E2', text: '#991B1B' },
  cancelled:  { label: 'Cancelled',  bg: '#F3F4F6', text: '#4B5563' },
  completed:  { label: 'Completed',  bg: '#EDE9FE', text: '#5B21B6' },
};


function formatDay(iso: string) {
  const d = new Date(iso);
  return d.getDate().toString().padStart(2, '0');
}

function formatMonth(iso: string) {
  return new Date(iso).toLocaleString('en', { month: 'short' }).toUpperCase();
}

function formatYear(iso: string) {
  return new Date(iso).getFullYear().toString();
}

function formatTime(iso: string | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function FlightsScreen() {
  const navigation = useNavigation<Nav>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const all = await getEvents();
      setEvents(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const upcoming = events.filter(e => new Date(e.date_start) >= new Date(Date.now() - 86400000 * 7));
  const past = events.filter(e => new Date(e.date_start) < new Date(Date.now() - 86400000 * 7));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Trips</Text>
          {!loading && (
            <Text style={styles.headerSub}>{events.length} trip{events.length !== 1 ? 's' : ''} total</Text>
          )}
        </View>
        <View style={styles.headerPlane}>
          <Ionicons name="airplane" size={22} color={colors.primary} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading trips…</Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...(upcoming.length ? [{ type: 'section', label: 'Upcoming' } as const] : []),
            ...upcoming.map(e => ({ type: 'event', event: e } as const)),
            ...(past.length ? [{ type: 'section', label: 'Past Trips' } as const] : []),
            ...past.map(e => ({ type: 'event', event: e } as const)),
          ]}
          keyExtractor={(item, i) => item.type === 'event' ? item.event.id : `section-${i}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="airplane-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyText}>Events you create will appear here</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return <Text style={styles.sectionLabel}>{item.label}</Text>;
            }
            return (
              <TripCard
                event={item.event}
                onPress={() => navigation.navigate('EventDetail', { eventId: item.event.id })}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── TripCard ──────────────────────────────────────────────────────────────────

function TripCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const dest = event.venue?.city ?? event.venue?.country ?? event.title;
  const gradient = gradientFor(dest);
  const status = STATUS_META[event.status];
  const depTime = formatTime(event.travel?.departure_time);
  const arrTime = formatTime(event.travel?.arrival_time);
  const checkInTime = formatTime(event.accommodation?.check_in);
  const origin = event.travel?.boarding_point ?? '—';
  const destination = event.travel?.deboarding_point ?? '—';

  const hasReturn = event.travel?.return_flight_booked ?? false;
  const returnOrigin = event.travel?.return_boarding_point ?? '—';
  const returnDest = event.travel?.return_deboarding_point ?? '—';
  const retDepTime = formatTime(event.travel?.return_departure_time);
  const retArrTime = formatTime(event.travel?.return_arrival_time);

  return (
    <TouchableOpacity style={[styles.card, shadow.sm]} onPress={onPress} activeOpacity={0.88}>

      {/* ── Gradient banner ── */}
      <LinearGradient colors={gradient} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Decorative large plane */}
        <Ionicons name="airplane" size={80} color="rgba(255,255,255,0.08)" style={styles.bgPlane} />

        {/* Top row: destination + date */}
        <View style={styles.bannerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerCity} numberOfLines={1}>{dest}</Text>
            {event.venue?.country ? <Text style={styles.destCountry}>{event.venue.country}</Text> : null}
            <Text style={styles.bannerEventTitle} numberOfLines={1}>{event.title}</Text>
          </View>

          {/* Date block top-right — flight departure date */}
          <View style={styles.bannerDate}>
            <Text style={styles.bannerDateDay}>{event.travel?.departure_time ? formatDay(event.travel.departure_time) : '--'}</Text>
            <Text style={styles.bannerDateMonth}>{event.travel?.departure_time ? formatMonth(event.travel.departure_time) : '---'}</Text>
            <Text style={styles.bannerDateYear}>{event.travel?.departure_time ? formatYear(event.travel.departure_time) : ''}</Text>
          </View>
        </View>

        {/* Status + route strip */}
        <View style={styles.bannerBottom}>
          <View style={[styles.statusChip, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Text style={styles.statusChipText}>{status.label}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── White info row ── */}
      <View style={styles.infoRow}>

        {/* Full-width: route, title, then details in two mini-columns */}
        <View style={styles.infoFull}>

          {/* Route */}
          <View style={styles.routeRow}>
            <Text style={styles.routeFrom} numberOfLines={1}>{origin}</Text>
            <Ionicons name="airplane" size={16} color={colors.primary} style={styles.routeArrowIcon} />
            <Text style={styles.routeTo} numberOfLines={1}>{destination}</Text>
          </View>

          <View style={styles.divider} />

          {/* Details row */}
          <View style={styles.detailsGrid}>
            {(event.travel?.flight_number || event.travel?.airline) && (
              <View style={styles.detailItem}>
                <Ionicons name="airplane-outline" size={12} color={colors.primary} />
                <View>
                  <Text style={styles.detailLabel}>Flight</Text>
                  <Text style={styles.detailValue}>
                    {[event.travel.flight_number, event.travel.airline].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            )}

            {(depTime || arrTime) && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={12} color={colors.primary} />
                <View>
                  <Text style={styles.detailLabel}>Flight time</Text>
                  <Text style={styles.detailValue}>{depTime ?? '--:--'} → {arrTime ?? '--:--'}</Text>
                </View>
              </View>
            )}

            {(checkInTime || event.accommodation?.check_in) && (
              <View style={styles.detailItem}>
                <Ionicons name="key-outline" size={12} color={colors.primary} />
                <View>
                  <Text style={styles.detailLabel}>Check-in</Text>
                  <Text style={styles.detailValue}>
                    {checkInTime ?? new Date(event.accommodation!.check_in!).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
            )}

            {event.venue?.name && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={12} color={colors.primary} />
                <View>
                  <Text style={styles.detailLabel}>Airport / Venue</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{event.venue.name}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Return flight ── */}
          {hasReturn && (
            <>
              <View style={styles.returnDivider}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#BBF7D0' }} />
                <View style={styles.returnTag}>
                  <Ionicons name="return-down-back-outline" size={10} color="#059669" />
                  <Text style={styles.returnTagText}>RETURN</Text>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: '#BBF7D0' }} />
              </View>

              <View style={styles.routeRow}>
                <Text style={[styles.routeFrom, { color: '#059669' }]} numberOfLines={1}>{returnOrigin}</Text>
                <Ionicons name="airplane" size={16} color="#059669" style={[styles.routeArrowIcon, { transform: [{ scaleX: -1 }] }]} />
                <Text style={[styles.routeTo, { color: '#059669' }]} numberOfLines={1}>{returnDest}</Text>
              </View>

              {(event.travel?.return_flight_number || event.travel?.return_airline || retDepTime || retArrTime) && (
                <View style={styles.detailsGrid}>
                  {(event.travel?.return_flight_number || event.travel?.return_airline) && (
                    <View style={styles.detailItem}>
                      <Ionicons name="airplane-outline" size={12} color="#059669" />
                      <View>
                        <Text style={styles.detailLabel}>Return flight</Text>
                        <Text style={[styles.detailValue, { color: '#059669' }]}>
                          {[event.travel.return_flight_number, event.travel.return_airline].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                  )}
                  {(retDepTime || retArrTime) && (
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={12} color="#059669" />
                      <View>
                        <Text style={styles.detailLabel}>Return time</Text>
                        <Text style={[styles.detailValue, { color: '#059669' }]}>{retDepTime ?? '--:--'} → {retArrTime ?? '--:--'}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

        </View>

      </View>

      {/* ── Bottom action bar ── */}
      <View style={styles.actionBar}>
        <View style={styles.ticketGroup}>
          {event.travel?.flight_ticket_url ? (
            <TouchableOpacity
              style={styles.ticketBtn}
              onPress={() => Linking.openURL(event.travel!.flight_ticket_url!)}
              activeOpacity={0.82}
            >
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ticketBtnGrad}>
                <Ionicons name="document-text-outline" size={14} color="#fff" />
                <Text style={styles.ticketBtnText}>View Ticket</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.noTicket}>
              <Ionicons name="document-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.noTicketText}>No ticket uploaded</Text>
            </View>
          )}
          {hasReturn && event.travel?.return_ticket_pdf_url && (
            <TouchableOpacity
              style={styles.ticketBtn}
              onPress={() => Linking.openURL(event.travel!.return_ticket_pdf_url!)}
              activeOpacity={0.82}
            >
              <LinearGradient colors={['#059669', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ticketBtnGrad}>
                <Ionicons name="document-text-outline" size={14} color="#fff" />
                <Text style={styles.ticketBtnText}>Return Ticket</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.detailBtn} onPress={onPress} activeOpacity={0.82}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.detailBtnGrad}>
            <Text style={styles.detailBtnText}>View details</Text>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  headerPlane: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },

  list: { padding: 16, paddingBottom: 100, gap: 16 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -4,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },

  // Banner
  banner: {
    height: 160,
    padding: 16,
    justifyContent: 'space-between',
  },
  bgPlane: {
    position: 'absolute',
    right: -10,
    top: 10,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerCity: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  destCountry: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  bannerEventTitle: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontWeight: '500' },
  bannerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Date in banner (top-right)
  bannerDate: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 56,
  },
  bannerDateDay: { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 36, letterSpacing: -1 },
  bannerDateMonth: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  bannerDateYear: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  // Info row
  infoRow: { padding: 16 },
  infoFull: { gap: 8 },

  // Route line
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeFrom: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, flexShrink: 1 },
  routeArrowIcon: { marginHorizontal: 2 },
  routeTo: { fontSize: 18, fontWeight: '800', color: colors.primary, flexShrink: 1 },
  tripName: { fontSize: 12, color: colors.textSecondary },

  divider: { height: 1, backgroundColor: colors.border },

  // 2-column detail grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, width: '45%' },
  detailLabel: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginTop: 1 },

  dateDuration: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dateDurationText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Return flight tag
  returnDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 },
  returnTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D1FAE5', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  returnTagText: { fontSize: 9, fontWeight: '800', color: '#059669', letterSpacing: 1, textTransform: 'uppercase' },

  // Action bar
  actionBar: {
    flexDirection: 'column',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  ticketBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  ticketBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  noTicket: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  noTicketText: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
  detailBtn: { borderRadius: 10, overflow: 'hidden' },
  detailBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, opacity: 0.85,
  },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
