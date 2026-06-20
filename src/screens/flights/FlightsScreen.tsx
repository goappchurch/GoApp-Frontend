import React, { useState, useCallback, useMemo } from 'react';
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
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { getEvents } from '../../services/events';
import { Event, ConnectionStop } from '../../types';
import { shareViaWhatsApp, ticketMessage } from '../../utils/share';
import { colors, shadow, radius, gradients } from '../../constants/theme';
import { getLoadingVerse } from '../../constants/verses';

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
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filterMode, setFilterMode] = useState<'upcoming' | 'all'>('upcoming');

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

  const matchesSearch = useCallback((e: Event) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.travel?.boarding_point ?? '').toLowerCase().includes(q) ||
      (e.travel?.deboarding_point ?? '').toLowerCase().includes(q)
    );
  }, [search]);

  const startOfToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const isUpcoming = useCallback(
    (e: Event) => new Date(e.travel?.return_arrival_time ?? e.date_end ?? e.date_start) >= startOfToday,
    [startOfToday]
  );

  // Only show a trip card when a flight is actually booked — not merely
  // because the event type is "travel". A trip with the flight toggle off
  // should not appear here.
  const hasFlight = useCallback(
    (e: Event) => !!(e.travel?.flight_booked || e.travel?.return_flight_booked),
    []
  );

  const upcoming = useMemo(() =>
    events.filter(e => hasFlight(e) && isUpcoming(e) && matchesSearch(e)),
    [events, hasFlight, matchesSearch, isUpcoming]
  );
  const past = useMemo(() =>
    events.filter(e => hasFlight(e) && !isUpcoming(e) && matchesSearch(e)),
    [events, hasFlight, matchesSearch, isUpcoming]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDarker} />

      {/* Gradient header */}
      <LinearGradient
        colors={gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Title row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Trips</Text>
            {!loading && (
              <Text style={styles.headerSub}>{upcoming.length + past.length} trip{upcoming.length + past.length !== 1 ? 's' : ''} total</Text>
            )}
          </View>
          <View style={styles.headerPlane}>
            <Ionicons name="airplane" size={22} color="#fff" />
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title, boarding or deboarding..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={colors.inactive} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabs}>
          {(['upcoming', 'all'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.filterTab, filterMode === mode && styles.filterTabActive]}
              onPress={() => setFilterMode(mode)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={mode === 'upcoming' ? 'time-outline' : 'albums-outline'}
                size={14}
                color={filterMode === mode ? colors.primary : 'rgba(255,255,255,0.85)'}
              />
              <Text style={[styles.filterTabText, filterMode === mode && styles.filterTabTextActive]}>
                {mode === 'upcoming' ? 'Upcoming' : 'All Flights'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{getLoadingVerse()}</Text>
        </View>
      ) : (
        <FlatList
          data={
            filterMode === 'upcoming'
              ? upcoming.map(e => ({ type: 'event', event: e } as const))
              : [
                  ...(upcoming.length ? [{ type: 'section', label: 'Upcoming' } as const] : []),
                  ...upcoming.map(e => ({ type: 'event', event: e } as const)),
                  ...(past.length ? [{ type: 'section', label: 'Past Trips' } as const] : []),
                  ...past.map(e => ({ type: 'event', event: e } as const)),
                ]
          }
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
              <Text style={styles.emptyTitle}>{filterMode === 'upcoming' ? 'No upcoming trips' : 'No trips yet'}</Text>
              <Text style={styles.emptyText}>
                {filterMode === 'upcoming' ? 'Switch to “All Flights” to see past trips' : 'Events you create will appear here'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return <Text style={styles.sectionLabel}>{item.label}</Text>;
            }
            return (
              <TripCard
                event={item.event}
                onPress={() => setSelectedEvent(item.event)}
              />
            );
          }}
        />
      )}
      </View>

      <FlightDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onViewEvent={() => {
          setSelectedEvent(null);
          navigation.navigate('EventDetail', { eventId: selectedEvent!.id });
        }}
      />
    </SafeAreaView>
  );
}

// ── FlightDetailModal ─────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;

function DetailRow({ icon, label, value, valueColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; valueColor?: string }) {
  return (
    <View style={mStyles.detailRow}>
      <View style={mStyles.detailIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mStyles.detailRowLabel}>{label}</Text>
        <Text style={[mStyles.detailRowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

export function FlightDetailModal({
  event,
  onClose,
  onViewEvent,
}: {
  event: Event | null;
  onClose: () => void;
  onViewEvent: () => void;
}) {
  if (!event) return null;

  const t = event.travel;
  const hasReturn = t?.return_flight_booked ?? false;

  const origin = t?.boarding_point ?? '—';
  const destination = t?.deboarding_point || event.venue?.city || '—';

  const dest = destination !== '—' ? destination : (event.venue?.city ?? event.venue?.country ?? event.title);
  const gradient = gradientFor(dest);
  const returnOrigin = t?.return_boarding_point ?? '—';
  const returnDest = t?.return_deboarding_point || event.venue?.city || '—';

  const outStops = (t?.connections ?? []).filter(
    (s) => s.airport || s.checkin_airport || s.arrival_airport || s.flight_number || s.airline || s.departure_time || s.checkin_time || s.arrival_time || s.ticket_url
  );
  const retStops = (t?.return_connections ?? []).filter(
    (s) => s.airport || s.checkin_airport || s.arrival_airport || s.flight_number || s.airline || s.departure_time || s.checkin_time || s.arrival_time || s.ticket_url
  );

  function fmt(iso: string | undefined | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }

  function fmtDate(iso: string | undefined | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtTime(iso: string | undefined | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return (
    <Modal
      visible={!!event}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={mStyles.overlay}>
        <TouchableOpacity style={mStyles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[mStyles.sheet, { height: SCREEN_HEIGHT * 0.85 }]}>
          {/* ── Gradient header ── */}
          <LinearGradient colors={gradient} style={mStyles.modalBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="airplane" size={70} color="rgba(255,255,255,0.07)" style={mStyles.modalBgPlane} />
            <View style={mStyles.modalBannerRow}>
              <View style={{ flex: 1 }}>
                <Text style={mStyles.modalCity} numberOfLines={1}>{dest}</Text>
                {event.venue?.country ? <Text style={mStyles.modalCountry}>{event.venue.country}</Text> : null}
                <Text style={mStyles.modalEventTitle} numberOfLines={2}>{event.title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Flight route + departure date */}
            <View style={mStyles.modalDateRow}>
              <Ionicons name="airplane-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={mStyles.modalDateText}>
                {origin !== '—' ? `${origin}  →  ${destination}` : destination}
              </Text>
            </View>
            {(t?.departure_time || event.date_start) && (
              <View style={mStyles.modalDateRow}>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={mStyles.modalDateText}>
                  {fmtDate(t?.departure_time ?? event.date_start)}
                  {hasReturn && t?.return_departure_time
                    ? `  →  ${fmtDate(t.return_departure_time)}`
                    : event.date_end ? `  →  ${fmtDate(event.date_end)}` : ''}
                </Text>
              </View>
            )}
          </LinearGradient>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={mStyles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ── Outbound flight ── */}
            {t && (
              <>
                <View style={mStyles.sectionHeadRow}>
                  <Text style={mStyles.sectionHead}>Outbound Flight</Text>
                  {outStops.length > 0 && (
                    <View style={styles.connectingBadge}>
                      <Ionicons name="git-network-outline" size={9} color="#D97706" />
                      <Text style={styles.connectingBadgeText}>Connecting</Text>
                    </View>
                  )}
                </View>
                <View style={mStyles.card}>
                  {/* LEG 1 header — only when connecting */}
                  {outStops.length > 0 && (
                    <View style={mStyles.legHeader}>
                      <View style={[mStyles.legBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="airplane" size={9} color="#fff" />
                        <Text style={mStyles.legBadgeText}>LEG 1</Text>
                      </View>
                      <Text style={mStyles.legRoute} numberOfLines={1}>
                        {origin}  →  {outStops[0].airport || destination}
                      </Text>
                    </View>
                  )}
                  {/* Non-connecting route row */}
                  {outStops.length === 0 && (t.boarding_point || t.deboarding_point) && (
                    <View style={mStyles.routeRow}>
                      <Text style={mStyles.routeFrom} numberOfLines={1}>{origin}</Text>
                      <Ionicons name="airplane" size={18} color={colors.primary} style={{ marginHorizontal: 6 }} />
                      <Text style={mStyles.routeTo} numberOfLines={1}>{destination}</Text>
                    </View>
                  )}
                  <View style={mStyles.divider} />
                  {(t.flight_number || t.airline) && <DetailRow icon="airplane-outline" label="Flight" value={[t.flight_number, t.airline].filter(Boolean).join(' · ')} />}
                  {t.checkin_airport && <DetailRow icon="business-outline" label="Check-in Airport" value={t.checkin_airport} />}
                  {t.departure_time && <DetailRow icon="exit-outline" label="Departure" value={fmt(t.departure_time)} />}
                  {t.arrival_airport && <DetailRow icon="business-outline" label="Arrival Airport" value={t.arrival_airport} />}
                  {t.arrival_time && <DetailRow icon="enter-outline" label="Arrival" value={fmt(t.arrival_time)} />}
                  {t.checkin_time && <DetailRow icon="time-outline" label="Check-in Time" value={fmtTime(t.checkin_time)} />}
                  {t.flight_ticket_url && (
                    <View style={mStyles.ticketActionRow}>
                      <TouchableOpacity style={[mStyles.ticketBtn, { flex: 1, overflow: 'hidden', borderRadius: 10 }]} onPress={() => Linking.openURL(t.flight_ticket_url!)}>
                        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mStyles.ticketBtnGrad}>
                          <Ionicons name="document-text-outline" size={14} color="#fff" />
                          <Text style={mStyles.ticketBtnText}>{outStops.length > 0 ? 'Leg 1 Ticket' : 'View Ticket'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity style={mStyles.waBtn} onPress={() => shareViaWhatsApp(ticketMessage('Outbound flight ticket', t.flight_ticket_url!, event.title))} activeOpacity={0.85}>
                        <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                        <Text style={mStyles.waText}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {outStops.map((stop, idx) => (
                    <React.Fragment key={idx}>
                      <View style={mStyles.legHeader}>
                        <View style={[mStyles.legBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="airplane" size={9} color="#fff" />
                          <Text style={mStyles.legBadgeText}>LEG {idx + 2}</Text>
                        </View>
                        <Text style={mStyles.legRoute} numberOfLines={1}>
                          {stop.airport || '?'}  →  {outStops[idx + 1]?.airport || destination}
                        </Text>
                      </View>
                      <View style={mStyles.divider} />
                      {(stop.flight_number || stop.airline) && <DetailRow icon="airplane-outline" label="Flight" value={[stop.flight_number, stop.airline].filter(Boolean).join(' · ')} />}
                      {stop.checkin_airport && <DetailRow icon="business-outline" label="Check-in Airport" value={stop.checkin_airport} />}
                      {stop.departure_time && <DetailRow icon="exit-outline" label="Departure" value={fmt(stop.departure_time)} />}
                      {stop.arrival_airport && <DetailRow icon="business-outline" label="Arrival Airport" value={stop.arrival_airport} />}
                      {stop.arrival_time && <DetailRow icon="enter-outline" label="Arrival" value={fmt(stop.arrival_time)} />}
                      {stop.checkin_time && <DetailRow icon="time-outline" label="Check-in Time" value={fmtTime(stop.checkin_time)} />}
                      {stop.ticket_url && (
                        <View style={mStyles.ticketActionRow}>
                          <TouchableOpacity style={[mStyles.ticketBtn, { flex: 1, overflow: 'hidden', borderRadius: 10 }]} onPress={() => Linking.openURL(stop.ticket_url!)}>
                            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mStyles.ticketBtnGrad}>
                              <Ionicons name="document-text-outline" size={14} color="#fff" />
                              <Text style={mStyles.ticketBtnText}>Leg {idx + 2} Ticket</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                          <TouchableOpacity style={mStyles.waBtn} onPress={() => shareViaWhatsApp(ticketMessage(`Leg ${idx + 2}${stop.airport ? ` · ${stop.airport}` : ''}`, stop.ticket_url!, event.title))} activeOpacity={0.85}>
                            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                            <Text style={mStyles.waText}>Share</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </>
            )}

            {/* ── Return flight ── */}
            {hasReturn && t && (
              <>
                <View style={mStyles.sectionHeadRow}>
                  <Text style={mStyles.sectionHead}>Return Flight</Text>
                  {retStops.length > 0 && (
                    <View style={styles.connectingBadge}>
                      <Ionicons name="git-network-outline" size={9} color="#D97706" />
                      <Text style={styles.connectingBadgeText}>Connecting</Text>
                    </View>
                  )}
                </View>
                <View style={mStyles.card}>
                  {retStops.length > 0 && (
                    <View style={mStyles.legHeader}>
                      <View style={[mStyles.legBadge, { backgroundColor: '#059669' }]}>
                        <Ionicons name="airplane" size={9} color="#fff" />
                        <Text style={mStyles.legBadgeText}>LEG 1</Text>
                      </View>
                      <Text style={[mStyles.legRoute, { color: '#059669' }]} numberOfLines={1}>
                        {returnOrigin}  →  {retStops[0].airport || returnDest}
                      </Text>
                    </View>
                  )}
                  {retStops.length === 0 && (t.return_boarding_point || t.return_deboarding_point) && (
                    <View style={mStyles.routeRow}>
                      <Text style={[mStyles.routeFrom, { color: '#059669' }]} numberOfLines={1}>{returnOrigin}</Text>
                      <Ionicons name="airplane" size={18} color="#059669" style={{ marginHorizontal: 6 }} />
                      <Text style={[mStyles.routeTo, { color: '#059669' }]} numberOfLines={1}>{returnDest}</Text>
                    </View>
                  )}
                  <View style={mStyles.divider} />
                  {(t.return_flight_number || t.return_airline) && <DetailRow icon="airplane-outline" label="Flight" value={[t.return_flight_number, t.return_airline].filter(Boolean).join(' · ')} valueColor="#059669" />}
                  {t.return_checkin_airport && <DetailRow icon="business-outline" label="Check-in Airport" value={t.return_checkin_airport} valueColor="#059669" />}
                  {t.return_departure_time && <DetailRow icon="exit-outline" label="Departure" value={fmt(t.return_departure_time)} valueColor="#059669" />}
                  {t.return_arrival_airport && <DetailRow icon="business-outline" label="Arrival Airport" value={t.return_arrival_airport} valueColor="#059669" />}
                  {t.return_arrival_time && <DetailRow icon="enter-outline" label="Arrival" value={fmt(t.return_arrival_time)} valueColor="#059669" />}
                  {t.return_checkin_time && <DetailRow icon="time-outline" label="Check-in Time" value={fmtTime(t.return_checkin_time)} valueColor="#059669" />}
                  {t.return_ticket_pdf_url && (
                    <View style={mStyles.ticketActionRow}>
                      <TouchableOpacity style={[mStyles.ticketBtn, { flex: 1, overflow: 'hidden', borderRadius: 10 }]} onPress={() => Linking.openURL(t.return_ticket_pdf_url!)}>
                        <LinearGradient colors={['#059669', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mStyles.ticketBtnGrad}>
                          <Ionicons name="document-text-outline" size={14} color="#fff" />
                          <Text style={mStyles.ticketBtnText}>{retStops.length > 0 ? 'Leg 1 Ticket' : 'View Return Ticket'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity style={mStyles.waBtn} onPress={() => shareViaWhatsApp(ticketMessage('Return flight ticket', t.return_ticket_pdf_url!, event.title))} activeOpacity={0.85}>
                        <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                        <Text style={mStyles.waText}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {retStops.map((stop, idx) => (
                    <React.Fragment key={idx}>
                      <View style={mStyles.legHeader}>
                        <View style={[mStyles.legBadge, { backgroundColor: '#059669' }]}>
                          <Ionicons name="airplane" size={9} color="#fff" />
                          <Text style={mStyles.legBadgeText}>LEG {idx + 2}</Text>
                        </View>
                        <Text style={[mStyles.legRoute, { color: '#059669' }]} numberOfLines={1}>
                          {stop.airport || '?'}  →  {retStops[idx + 1]?.airport || returnDest}
                        </Text>
                      </View>
                      <View style={mStyles.divider} />
                      {(stop.flight_number || stop.airline) && <DetailRow icon="airplane-outline" label="Flight" value={[stop.flight_number, stop.airline].filter(Boolean).join(' · ')} valueColor="#059669" />}
                      {stop.checkin_airport && <DetailRow icon="business-outline" label="Check-in Airport" value={stop.checkin_airport} valueColor="#059669" />}
                      {stop.departure_time && <DetailRow icon="exit-outline" label="Departure" value={fmt(stop.departure_time)} valueColor="#059669" />}
                      {stop.arrival_airport && <DetailRow icon="business-outline" label="Arrival Airport" value={stop.arrival_airport} valueColor="#059669" />}
                      {stop.arrival_time && <DetailRow icon="enter-outline" label="Arrival" value={fmt(stop.arrival_time)} valueColor="#059669" />}
                      {stop.checkin_time && <DetailRow icon="time-outline" label="Check-in Time" value={fmtTime(stop.checkin_time)} valueColor="#059669" />}
                      {stop.ticket_url && (
                        <View style={mStyles.ticketActionRow}>
                          <TouchableOpacity style={[mStyles.ticketBtn, { flex: 1, overflow: 'hidden', borderRadius: 10 }]} onPress={() => Linking.openURL(stop.ticket_url!)}>
                            <LinearGradient colors={['#059669', '#16A34A'] as [string,string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mStyles.ticketBtnGrad}>
                              <Ionicons name="document-text-outline" size={14} color="#fff" />
                              <Text style={mStyles.ticketBtnText}>Leg {idx + 2} Ticket</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                          <TouchableOpacity style={mStyles.waBtn} onPress={() => shareViaWhatsApp(ticketMessage(`Leg ${idx + 2}${stop.airport ? ` · ${stop.airport}` : ''}`, stop.ticket_url!, event.title))} activeOpacity={0.85}>
                            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                            <Text style={mStyles.waText}>Share</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </>
            )}

            {/* ── Accommodation ── */}
            {event.accommodation?.hotel_name && (
              <>
                <Text style={mStyles.sectionHead}>Accommodation</Text>
                <View style={mStyles.card}>
                  <DetailRow icon="business-outline" label="Hotel" value={event.accommodation.hotel_name} />
                  {event.accommodation.address && (
                    <DetailRow icon="location-outline" label="Address" value={event.accommodation.address} />
                  )}
                  {event.accommodation.check_in && (
                    <DetailRow icon="log-in-outline" label="Check-in" value={fmtDate(event.accommodation.check_in)} />
                  )}
                  {event.accommodation.check_out && (
                    <DetailRow icon="log-out-outline" label="Check-out" value={fmtDate(event.accommodation.check_out)} />
                  )}
                </View>
              </>
            )}

            {/* ── View Event Details button ── */}
            <TouchableOpacity style={{ borderRadius: 14, overflow: 'hidden', marginTop: 8, marginBottom: 4 }} onPress={onViewEvent}>
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mStyles.viewEventBtn}>
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={mStyles.viewEventBtnText}>View Full Event Details</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── ConnLegCard ───────────────────────────────────────────────────────────────

function ConnLegCard({
  legNum, fromCity, toCity, flight, depTime, arrTime,
  checkinAirport, arrivalAirport, ticketUrl, color, fmtFn,
}: {
  legNum: number; fromCity: string; toCity: string;
  flight?: string; depTime?: string | null; arrTime?: string | null;
  checkinAirport?: string | null; arrivalAirport?: string | null;
  ticketUrl?: string | null; color: string;
  fmtFn: (iso?: string | null) => string;
}) {
  const t = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
  const d = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : null;

  return (
    <View style={[styles.legCard, { borderColor: color + '35' }]}>
      {/* Header band */}
      <LinearGradient
        colors={[color + '28', color + '0C'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.legHeader}
      >
        <View style={[styles.legNumBadge, { backgroundColor: color }]}>
          <Ionicons name="airplane" size={9} color="#fff" />
          <Text style={styles.legNumText}>LEG {legNum}</Text>
        </View>
        {!!flight && (
          <Text style={[styles.legFlightLabel, { color }]} numberOfLines={1}>{flight}</Text>
        )}
      </LinearGradient>

      {/* Route: from city ── ✈ ── to city */}
      <View style={styles.legRouteRow}>
        <View style={styles.legCityCol}>
          <Text style={styles.legCityName} numberOfLines={1}>{fromCity}</Text>
          {!!checkinAirport && <Text style={[styles.legAirportCode, { color }]}>{checkinAirport}</Text>}
          {!!depTime && (
            <Text style={styles.legTimeText}>{t(depTime)}{d(depTime) ? `\n${d(depTime)}` : ''}</Text>
          )}
        </View>

        <View style={styles.legMid}>
          <View style={[styles.legDot, { backgroundColor: color }]} />
          <View style={[styles.legDash, { backgroundColor: color + '40' }]} />
          <View style={[styles.legPlaneCircle, { backgroundColor: color + '15', borderColor: color + '35' }]}>
            <Ionicons name="airplane" size={13} color={color} />
          </View>
          <View style={[styles.legDash, { backgroundColor: color + '40' }]} />
          <View style={[styles.legDot, { backgroundColor: color }]} />
        </View>

        <View style={[styles.legCityCol, { alignItems: 'flex-end' }]}>
          <Text style={[styles.legCityName, { textAlign: 'right' }]} numberOfLines={1}>{toCity}</Text>
          {!!arrivalAirport && <Text style={[styles.legAirportCode, { color, textAlign: 'right' }]}>{arrivalAirport}</Text>}
          {!!arrTime && (
            <Text style={[styles.legTimeText, { textAlign: 'right' }]}>{t(arrTime)}{d(arrTime) ? `\n${d(arrTime)}` : ''}</Text>
          )}
        </View>
      </View>

      {/* Ticket button */}
      {!!ticketUrl && (
        <TouchableOpacity
          onPress={() => Linking.openURL(ticketUrl!)}
          style={[styles.legTicketBtn, { borderTopColor: color + '25', backgroundColor: color + '08' }]}
        >
          <Ionicons name="document-text-outline" size={13} color={color} />
          <Text style={[styles.legTicketText, { color }]}>View Leg {legNum} Ticket</Text>
          <Ionicons name="chevron-forward" size={12} color={color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── TripCard ──────────────────────────────────────────────────────────────────

function TripCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const dest = event.travel?.deboarding_point ?? event.venue?.city ?? event.venue?.country ?? event.title;
  const gradient = gradientFor(dest);
  const depTime = formatTime(event.travel?.checkin_time);
  const arrTime = formatTime(event.travel?.arrival_time);
  const origin = event.travel?.boarding_point ?? '—';
  const destination = event.travel?.deboarding_point || event.venue?.city || event.venue?.country || '—';

  const hasReturn = event.travel?.return_flight_booked ?? false;
  const returnOrigin = event.travel?.return_boarding_point ?? '—';
  const returnDest = event.travel?.return_deboarding_point || event.venue?.city || event.venue?.country || '—';
  const retDepTime = formatTime(event.travel?.return_checkin_time);
  const retArrTime = formatTime(event.travel?.return_arrival_time);

  const [showConn, setShowConn] = useState(false);
  const [showRetConn, setShowRetConn] = useState(false);

  const outStops = (event.travel?.connections ?? []).filter(
    (s) => s.airport || s.checkin_airport || s.arrival_airport || s.flight_number || s.airline || s.departure_time || s.checkin_time || s.arrival_time || s.ticket_url
  );
  const retStops = (event.travel?.return_connections ?? []).filter(
    (s) => s.airport || s.checkin_airport || s.arrival_airport || s.flight_number || s.airline || s.departure_time || s.checkin_time || s.arrival_time || s.ticket_url
  );
  const outRoute = [origin, ...outStops.map((s) => s.airport || '?'), destination];
  const retRoute = [returnOrigin, ...retStops.map((s) => s.airport || '?'), returnDest];

  const fmtDT = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

  return (
    <TouchableOpacity style={[styles.card, shadow.sm]} onPress={onPress} activeOpacity={0.88}>

      {/* ── Gradient banner ── */}
      <LinearGradient colors={gradient} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Decorative large plane */}
        <Ionicons name="airplane" size={80} color="rgba(255,255,255,0.08)" style={styles.bgPlane} />

        {/* Top row: destination + date */}
        <View style={styles.bannerTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.bannerCity} numberOfLines={1}>{dest}</Text>
              {event.event_type === 'travel' && (
                <View style={styles.travelOnlyBadge}>
                  <Ionicons name="person-outline" size={9} color="#fff" />
                  <Text style={styles.travelOnlyBadgeText}>TRAVEL</Text>
                </View>
              )}
              {outStops.length > 0 && (
                <View style={styles.connectingBadge}>
                  <Ionicons name="git-network-outline" size={9} color="#D97706" />
                  <Text style={styles.connectingBadgeText}>Connecting</Text>
                </View>
              )}
            </View>
            {event.venue?.country ? <Text style={styles.destCountry}>{event.venue.country}</Text> : null}
            <Text style={styles.bannerEventTitle} numberOfLines={1}>{event.title}</Text>
            {(origin !== '—' || destination !== '—') && (
              <View style={styles.bannerRouteRow}>
                {[origin, ...outStops.map(s => s.airport).filter(Boolean), destination]
                  .filter(p => p && p !== '—')
                  .map((city, i, arr) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Ionicons name="arrow-forward" size={9} color="rgba(255,255,255,0.55)" />}
                      <Text style={[styles.bannerRouteCity, i === arr.length - 1 && { color: '#fff', fontWeight: '800' }]}>{city}</Text>
                    </React.Fragment>
                  ))}
              </View>
            )}
          </View>

          {/* Date block top-right — flight departure date */}
          <View style={styles.bannerDate}>
            <Text style={styles.bannerDateDay}>{event.travel?.departure_time ? formatDay(event.travel.departure_time) : '--'}</Text>
            <Text style={styles.bannerDateMonth}>{event.travel?.departure_time ? formatMonth(event.travel.departure_time) : '---'}</Text>
            <Text style={styles.bannerDateYear}>{event.travel?.departure_time ? formatYear(event.travel.departure_time) : ''}</Text>
          </View>
        </View>

      </LinearGradient>

      {/* ── White info row ── */}
      <View style={styles.infoRow}>

        {/* Full-width: route, title, then details in two mini-columns */}
        <View style={styles.infoFull}>

          {outStops.length > 0 ? (
            <View style={styles.legList}>
              <ConnLegCard
                legNum={1}
                fromCity={origin}
                toCity={outStops[0].airport || destination}
                flight={[event.travel?.flight_number, event.travel?.airline].filter(Boolean).join(' · ') || undefined}
                depTime={event.travel?.checkin_time}
                arrTime={event.travel?.arrival_time}
                checkinAirport={event.travel?.checkin_airport}
                arrivalAirport={event.travel?.arrival_airport}
                ticketUrl={event.travel?.flight_ticket_url}
                color={colors.primary}
                fmtFn={fmtDT}
              />
              {outStops.map((stop, idx) => (
                <ConnLegCard
                  key={idx}
                  legNum={idx + 2}
                  fromCity={stop.airport || '?'}
                  toCity={outStops[idx + 1]?.airport || destination}
                  flight={[stop.flight_number, stop.airline].filter(Boolean).join(' · ') || undefined}
                  depTime={stop.checkin_time}
                  arrTime={stop.arrival_time}
                  checkinAirport={stop.checkin_airport}
                  arrivalAirport={stop.arrival_airport}
                  ticketUrl={stop.ticket_url}
                  color={colors.primary}
                  fmtFn={fmtDT}
                />
              ))}
            </View>
          ) : (
            <>
              <View style={styles.divider} />
              <View style={styles.detailsGrid}>
                {(event.travel?.flight_number || event.travel?.airline) && (
                  <View style={styles.detailItem}>
                    <Ionicons name="airplane-outline" size={12} color={colors.primary} />
                    <View>
                      <Text style={styles.detailLabel}>Flight</Text>
                      <Text style={styles.detailValue}>
                        {[event.travel?.flight_number, event.travel?.airline].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </View>
                )}
                {depTime && (
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <View>
                      <Text style={styles.detailLabel}>Check-in</Text>
                      <Text style={styles.detailValue}>{depTime ?? '--:--'}</Text>
                    </View>
                  </View>
                )}
                {origin !== '—' && (
                  <View style={styles.detailItem}>
                    <Ionicons name="navigate-outline" size={12} color={colors.primary} />
                    <View>
                      <Text style={styles.detailLabel}>Boarding</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>{origin}</Text>
                    </View>
                  </View>
                )}
                {destination !== '—' && (
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={12} color={colors.primary} />
                    <View>
                      <Text style={styles.detailLabel}>Deboarding</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>{destination}</Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

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

              <View style={styles.returnRouteRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.routeRow}>
                    <Text style={[styles.routeFrom, { color: '#059669' }]} numberOfLines={1}>{returnOrigin}</Text>
                    <Ionicons name="airplane" size={16} color="#059669" style={[styles.routeArrowIcon]} />
                    <Text style={[styles.routeTo, { color: '#059669' }]} numberOfLines={1}>{returnDest}</Text>
                  </View>
                  {retStops.length > 0 && (
                    <View style={styles.subRouteRow}>
                      {retRoute.map((p, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <Ionicons name="arrow-forward" size={9} color="#94A3B8" />}
                          <Text style={styles.subRouteText}>{p}</Text>
                        </React.Fragment>
                      ))}
                    </View>
                  )}
                </View>
                {event.travel?.return_departure_time && (
                  <View style={styles.returnDateBlock}>
                    <Text style={styles.returnDateDay}>{formatDay(event.travel.return_departure_time)}</Text>
                    <Text style={styles.returnDateMonth}>{formatMonth(event.travel.return_departure_time)}</Text>
                    <Text style={styles.returnDateYear}>{formatYear(event.travel.return_departure_time)}</Text>
                  </View>
                )}
              </View>

              {retStops.length > 0 ? (
                <View style={styles.legList}>
                  <ConnLegCard
                    legNum={1}
                    fromCity={returnOrigin}
                    toCity={retStops[0].airport || returnDest}
                    flight={[event.travel?.return_flight_number, event.travel?.return_airline].filter(Boolean).join(' · ') || undefined}
                    depTime={event.travel?.return_checkin_time}
                    arrTime={event.travel?.return_arrival_time}
                    checkinAirport={event.travel?.return_checkin_airport}
                    arrivalAirport={event.travel?.return_arrival_airport}
                    ticketUrl={event.travel?.return_ticket_pdf_url}
                    color="#059669"
                    fmtFn={fmtDT}
                  />
                  {retStops.map((stop, idx) => (
                    <ConnLegCard
                      key={idx}
                      legNum={idx + 2}
                      fromCity={stop.airport || '?'}
                      toCity={retStops[idx + 1]?.airport || returnDest}
                      flight={[stop.flight_number, stop.airline].filter(Boolean).join(' · ') || undefined}
                      depTime={stop.checkin_time}
                      arrTime={stop.arrival_time}
                      checkinAirport={stop.checkin_airport}
                      arrivalAirport={stop.arrival_airport}
                      ticketUrl={stop.ticket_url}
                      color="#059669"
                      fmtFn={fmtDT}
                    />
                  ))}
                </View>
              ) : (
                (event.travel?.return_flight_number || event.travel?.return_airline || retDepTime || event.travel?.return_boarding_point || event.travel?.return_deboarding_point) ? (
                  <View style={styles.detailsGrid}>
                    {(event.travel?.return_flight_number || event.travel?.return_airline) && (
                      <View style={styles.detailItem}>
                        <Ionicons name="airplane-outline" size={12} color="#059669" />
                        <View>
                          <Text style={styles.detailLabel}>Return flight</Text>
                          <Text style={[styles.detailValue, { color: '#059669' }]}>
                            {[event.travel?.return_flight_number, event.travel?.return_airline].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      </View>
                    )}
                    {retDepTime && (
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={12} color="#059669" />
                        <View>
                          <Text style={styles.detailLabel}>Check-in</Text>
                          <Text style={[styles.detailValue, { color: '#059669' }]}>{retDepTime}</Text>
                        </View>
                      </View>
                    )}
                    {event.travel?.return_boarding_point && (
                      <View style={styles.detailItem}>
                        <Ionicons name="navigate-outline" size={12} color="#059669" />
                        <View>
                          <Text style={styles.detailLabel}>Boarding</Text>
                          <Text style={[styles.detailValue, { color: '#059669' }]} numberOfLines={1}>{event.travel.return_boarding_point}</Text>
                        </View>
                      </View>
                    )}
                    {event.travel?.return_deboarding_point && (
                      <View style={styles.detailItem}>
                        <Ionicons name="flag-outline" size={12} color="#059669" />
                        <View>
                          <Text style={styles.detailLabel}>Deboarding</Text>
                          <Text style={[styles.detailValue, { color: '#059669' }]} numberOfLines={1}>{event.travel.return_deboarding_point}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : null
              )}
            </>
          )}

        </View>

      </View>

      {/* ── Bottom action bar ── */}
      <View style={styles.actionBar}>
        {outStops.length === 0 && (
          <View style={styles.ticketGroup}>
            {event.travel?.flight_ticket_url ? (
              <View style={styles.ticketBtnRow}>
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
                <TouchableOpacity
                  style={styles.cardWaBtn}
                  onPress={() => shareViaWhatsApp(ticketMessage('Outbound flight ticket', event.travel!.flight_ticket_url!, event.title))}
                  activeOpacity={0.82}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noTicket}>
                <Ionicons name="document-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.noTicketText}>No ticket uploaded</Text>
              </View>
            )}
            {hasReturn && event.travel?.return_ticket_pdf_url && (
              <View style={styles.ticketBtnRow}>
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
                <TouchableOpacity
                  style={[styles.cardWaBtn, { backgroundColor: '#059669' }]}
                  onPress={() => shareViaWhatsApp(ticketMessage('Return flight ticket', event.travel!.return_ticket_pdf_url!, event.title))}
                  activeOpacity={0.82}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
  safe: { flex: 1, backgroundColor: colors.primaryDarker },

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerPlane: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  filterTabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  filterTabTextActive: { color: colors.primary },

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
    padding: 16,
    paddingBottom: 40,
    justifyContent: 'flex-start',
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
  bannerEventTitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },
  bannerRouteRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  bannerRouteCity: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,255)' },
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

  viaText: { fontSize: 11, fontWeight: '600', color: '#D97706', marginTop: -2 },
  subRouteRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  subRouteText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  connToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  connToggleText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  connList: { marginTop: 8, gap: 6 },

  // Connecting leg cards
  legList: { gap: 10 },
  legCard: { borderRadius: 14, borderWidth: 1.5, backgroundColor: '#FAFCFF', overflow: 'hidden' },
  legHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  legNumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  legNumText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.6 },
  legFlightLabel: { fontSize: 12, fontWeight: '700', flex: 1 },
  legRouteRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  legCityCol: { flex: 1, gap: 3 },
  legCityName: { fontSize: 17, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  legAirportCode: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  legTimeText: { fontSize: 11, fontWeight: '600', color: '#64748B', lineHeight: 16, marginTop: 2 },
  legMid: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 0.9 },
  legDot: { width: 6, height: 6, borderRadius: 3 },
  legDash: { flex: 1, height: 1.5, borderRadius: 1 },
  legPlaneCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  legTicketBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1 },
  legTicketText: { fontSize: 12, fontWeight: '700', flex: 1 },

  // 2-column detail grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, width: '45%' },
  detailLabel: { fontSize: 9, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 1 },

  dateDuration: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dateDurationText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Return flight tag
  returnRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  returnDateBlock: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 44,
  },
  returnDateDay: { fontSize: 20, fontWeight: '900', color: '#059669', lineHeight: 22, letterSpacing: -0.5 },
  returnDateMonth: { fontSize: 9, fontWeight: '800', color: '#059669', letterSpacing: 0.8 },
  returnDateYear: { fontSize: 8, fontWeight: '600', color: '#34D399', marginTop: 1 },
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
  ticketBtnRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardWaBtn: { backgroundColor: '#25D366', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
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

  // Empty state
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

  connectingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(254,243,199,0.9)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)',
  },
  connectingBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  travelOnlyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#DB2777', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  travelOnlyBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
});

// ── Modal styles ──────────────────────────────────────────────────────────────

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // Banner
  modalBanner: { padding: 20, paddingBottom: 16, gap: 10 },
  modalBgPlane: { position: 'absolute', right: -10, top: 10 },
  modalBannerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalCity: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  modalCountry: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  modalEventTitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalDateText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  // Content
  scrollContent: { padding: 16, gap: 8, paddingBottom: 40 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 2 },
  sectionHead: {
    fontSize: 11, fontWeight: '800', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    ...shadow.xs,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeFrom: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, flexShrink: 1 },
  routeTo: { fontSize: 18, fontWeight: '800', color: colors.primary, flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border },

  // Detail rows
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  detailRowLabel: { fontSize: 10, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRowValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },

  // Leg section header
  legHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 14, paddingBottom: 4,
  },
  legBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  legBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.6 },
  legRoute: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1 },

  // Ticket button
  ticketActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 12, paddingBottom: 6,
  },
  waBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#25D366', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  waText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  ticketBtn: {},
  ticketBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  ticketBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // View event button
  viewEventBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15,
  },
  viewEventBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
