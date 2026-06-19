import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateField from '../../components/DateField';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEventById,
  createEvent,
  updateEvent,
  uploadEventPoster,
  uploadTicketPdf,
} from '../../services/events';
import { getContacts } from '../../services/contacts';
import { supabase } from '../../lib/supabase';
import { EventFormData, Contact, ConnectionStop } from '../../types';
import { colors, shadow, radius } from '../../constants/theme';
import { getLoadingVerse } from '../../constants/verses';

type RouteProps = RouteProp<RootStackParamList, 'AddEditEvent'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const REGION_OPTIONS = [
  { value: 'Kerala',       label: 'Kerala',       sub: "God's Own Country",                          icon: 'business-outline'  as const, color: '#7C3AED' },
  { value: 'South India',  label: 'South India',  sub: 'Tamil Nadu, Karnataka, Andhra Pradesh & more', icon: 'leaf-outline'      as const, color: '#16A34A' },
  { value: 'North India',  label: 'North India',  sub: 'Delhi, Rajasthan, Uttar Pradesh & more',      icon: 'compass-outline'   as const, color: '#2563EB' },
  { value: 'Middle East',  label: 'Middle East',  sub: 'Gulf Countries & beyond',                     icon: 'sunny-outline'     as const, color: '#D97706' },
  { value: 'Europe',       label: 'Europe',       sub: 'Western, Central & Eastern Europe',           icon: 'flag-outline'      as const, color: '#0891B2' },
  { value: 'Others',       label: 'Others',       sub: 'Other countries & regions',                   icon: 'earth-outline'     as const, color: '#64748B' },
];
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata',         label: 'India (IST)',          sub: 'UTC+5:30 · Asia/Kolkata',         icon: 'flag-outline'          as const, color: '#FF6B35' },
  { value: 'UTC',                  label: 'UTC',                  sub: 'Universal Coordinated Time',      icon: 'globe-outline'          as const, color: '#64748B' },
  { value: 'America/New_York',     label: 'New York (ET)',         sub: 'UTC−5/−4 · Eastern Time',         icon: 'business-outline'       as const, color: '#1D4ED8' },
  { value: 'America/Chicago',      label: 'Chicago (CT)',          sub: 'UTC−6/−5 · Central Time',         icon: 'partly-sunny-outline'   as const, color: '#0891B2' },
  { value: 'America/Los_Angeles',  label: 'Los Angeles (PT)',      sub: 'UTC−8/−7 · Pacific Time',         icon: 'sunny-outline'          as const, color: '#D97706' },
  { value: 'Europe/London',        label: 'London (GMT/BST)',      sub: 'UTC+0/+1 · Western Europe',       icon: 'umbrella-outline'       as const, color: '#6D28D9' },
  { value: 'Europe/Paris',         label: 'Paris (CET/CEST)',      sub: 'UTC+1/+2 · Central Europe',       icon: 'cafe-outline'           as const, color: '#DB2777' },
  { value: 'Asia/Dubai',           label: 'Dubai (GST)',           sub: 'UTC+4 · Gulf Standard Time',      icon: 'sunny-outline'          as const, color: '#B45309' },
  { value: 'Asia/Singapore',       label: 'Singapore (SGT)',       sub: 'UTC+8 · Asia/Singapore',          icon: 'airplane-outline'       as const, color: '#0E7490' },
  { value: 'Australia/Sydney',     label: 'Sydney (AEST/AEDT)',    sub: 'UTC+10/+11 · Eastern Australia',  icon: 'water-outline'          as const, color: '#047857' },
];
const MAX_COMPANIONS = 15;

const SECTIONS = [
  { key: 'details',    label: 'Details',    icon: 'calendar-outline' as const,                   color: colors.primary,       bgGradient: ['#EEE8FF', '#FAFAFA'] as [string, string], iconGradient: ['#7C3AED', '#9333EA'] as [string, string], subtitle: 'Help us with the basics',   emoji: '📅' },
  { key: 'venue',      label: 'Venue',      icon: 'location-outline' as const,                   color: colors.success,       bgGradient: ['#D1FAE5', '#FAFAFA'] as [string, string], iconGradient: ['#059669', '#16A34A'] as [string, string], subtitle: 'Where is your event?',      emoji: '📍' },
  { key: 'organizer',  label: 'Organizer',  icon: 'person-circle-outline' as const,              color: colors.warning,       bgGradient: ['#FEF3C7', '#FAFAFA'] as [string, string], iconGradient: ['#D97706', '#F59E0B'] as [string, string], subtitle: "Who's coordinating?",       emoji: '👤' },
  { key: 'travel',     label: 'Travel',     icon: 'airplane-outline' as const,                   color: '#7C3AED',            bgGradient: ['#EDE9FE', '#FAFAFA'] as [string, string], iconGradient: ['#7C3AED', '#6D28D9'] as [string, string], subtitle: 'Flights & transport',       emoji: '✈️' },
  { key: 'stay',       label: 'Stay',       icon: 'bed-outline' as const,                        color: '#E11D48',            bgGradient: ['#FFE4E6', '#FAFAFA'] as [string, string], iconGradient: ['#E11D48', '#BE123C'] as [string, string], subtitle: 'Where will you stay?',      emoji: '🏨' },
  { key: 'companions', label: 'Team',       icon: 'people-outline' as const,                     color: '#0D9488',            bgGradient: ['#CCFBF1', '#FAFAFA'] as [string, string], iconGradient: ['#0D9488', '#0F766E'] as [string, string], subtitle: "Who's coming along?",       emoji: '👥' },
  { key: 'poster',     label: 'Poster',     icon: 'image-outline' as const,                      color: '#16A34A',            bgGradient: ['#D1FAE5', '#FAFAFA'] as [string, string], iconGradient: ['#16A34A', '#15803D'] as [string, string], subtitle: 'Visual for your event',     emoji: '🎨' },
  { key: 'others',     label: 'Others',     icon: 'ellipsis-horizontal-circle-outline' as const, color: colors.textSecondary, bgGradient: ['#E2E8F0', '#FAFAFA'] as [string, string], iconGradient: ['#475569', '#334155'] as [string, string], subtitle: 'Extra details',             emoji: '⚙️' },
];

export default function AddEditEventScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isEdit = !!route.params?.eventId;
  const isDuplicate = !!route.params?.duplicateFromId;

  const [loading, setLoading] = useState(isEdit || isDuplicate);
  const [saving, setSaving] = useState(false);
  const handleSaveRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackground: () => (
        <LinearGradient
          colors={['#4C1D95', '#6D28D9', '#8B5CF6'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
          pointerEvents="none"
        />
      ),
      headerTitle: () => (
        <View style={{ paddingLeft: 2 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 }}>
            {isEdit ? 'Edit Event' : 'New Event'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 }}>
            {isEdit ? 'Update event details' : "Let's create something amazing ✨"}
          </Text>
        </View>
      ),
      headerTintColor: '#fff',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => { if (!saving) handleSaveRef.current(); }}
          disabled={saving}
          style={{
            backgroundColor: saving ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
            borderRadius: 14,
            width: 46,
            height: 46,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.35)',
          }}
          activeOpacity={0.7}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark" size={22} color="#fff" />
          }
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEdit, saving]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [existingEvents, setExistingEvents] = useState<{ date_start: string; id: string }[]>([]);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [ticketUri, setTicketUri] = useState<string | null>(null);
  const [returnTicketUri, setReturnTicketUri] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingReturnPdf, setUploadingReturnPdf] = useState(false);
  // Connection ticket uploads, keyed by "out-<idx>" / "ret-<idx>"
  const [connUploading, setConnUploading] = useState<Record<string, boolean>>({});
  const connTicketUris = useRef<Record<string, string>>({});

  const [activeSection, setActiveSection] = useState(0);
  const [regionModal, setRegionModal] = useState(false);
  const [timezoneModal, setTimezoneModal] = useState(false);
  const sectionYs = useRef<number[]>(new Array(SECTIONS.length).fill(0));
  const tabScrollRef = useRef<ScrollView>(null);
  const formScrollRef = useRef<ScrollView>(null);

  const defaultDateIso = route.params?.defaultDate
    ? new Date(route.params.defaultDate + 'T09:00:00').toISOString()
    : new Date().toISOString();

  const [form, setForm] = useState<EventFormData>({
    title: '',
    event_type: 'sunday_service',
    date_start: defaultDateIso,
    timezone: 'Asia/Kolkata',
    flight_booked: false,
    companions: [],
  });

  useEffect(() => {
    Promise.all([loadContacts(), loadExistingEvents()]);
    if (isEdit) loadEventData();
    else if (isDuplicate) loadDuplicateData();
  }, []);

  const loadContacts = async () => { try { setContacts(await getContacts()); } catch (_) {} };

  const loadExistingEvents = async () => {
    try {
      const { data } = await supabase.from('events').select('date_start, id');
      setExistingEvents(data ?? []);
    } catch (_) {}
  };

  const loadEventData = async () => {
    try {
      const event = await getEventById(route.params!.eventId!);
      setForm({
        title: event.title,
        event_type: event.event_type,
        date_start: event.date_start,
        date_end: event.date_end,
        timezone: event.timezone,
        speaking_topic: event.speaking_topic,
        expected_audience: event.expected_audience,
        companions: event.companions ?? [],
        venue_name: event.venue?.name,
        venue_address: event.venue?.address,
        venue_city: event.venue?.city,
        venue_country: event.venue?.country,
        venue_region: event.venue?.region,
        organizer_name: event.organizer?.name,
        organizer_phone: event.organizer?.phone,
        organizer_email: event.organizer?.email,
        contact_id: event.organizer?.contact_id,
        flight_booked: event.travel?.flight_booked ?? false,
        boarding_point: event.travel?.boarding_point,
        deboarding_point: event.travel?.deboarding_point,
        flight_number: event.travel?.flight_number,
        airline: event.travel?.airline,
        departure_time: event.travel?.departure_time,
        flight_checkin_time: event.travel?.checkin_time,
        arrival_time: event.travel?.arrival_time,
        ticket_pdf_url: event.travel?.flight_ticket_url,
        connections: event.travel?.connections ?? [],
        return_flight_booked: event.travel?.return_flight_booked ?? false,
        return_boarding_point: event.travel?.return_boarding_point,
        return_deboarding_point: event.travel?.return_deboarding_point,
        return_flight_number: event.travel?.return_flight_number,
        return_airline: event.travel?.return_airline,
        return_departure_time: event.travel?.return_departure_time,
        return_flight_checkin_time: event.travel?.return_checkin_time,
        return_arrival_time: event.travel?.return_arrival_time,
        return_ticket_pdf_url: event.travel?.return_ticket_pdf_url,
        return_connections: event.travel?.return_connections ?? [],
        hotel_name: event.accommodation?.hotel_name,
        hotel_address: event.accommodation?.address,
        check_in: event.accommodation?.check_in,
        check_out: event.accommodation?.check_out,
        poster_url: event.poster_url,
      });
      if (event.poster_url) setPosterUri(event.poster_url);
    } catch (e) {
      Alert.alert('Error', 'Could not load event data');
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicateData = async () => {
    try {
      const event = await getEventById(route.params!.duplicateFromId!);
      setForm({
        title: `Copy of ${event.title}`,
        event_type: event.event_type,
        date_start: new Date().toISOString(),
        timezone: event.timezone,
        speaking_topic: event.speaking_topic,
        expected_audience: event.expected_audience,
        companions: event.companions ?? [],
        venue_name: event.venue?.name,
        venue_address: event.venue?.address,
        venue_city: event.venue?.city,
        venue_country: event.venue?.country,
        venue_region: event.venue?.region,
        organizer_name: event.organizer?.name,
        organizer_phone: event.organizer?.phone,
        organizer_email: event.organizer?.email,
        contact_id: event.organizer?.contact_id,
        // keep route prefs, clear date-specific times and tickets
        flight_booked: event.travel?.flight_booked ?? false,
        boarding_point: event.travel?.boarding_point,
        deboarding_point: event.travel?.deboarding_point,
        airline: event.travel?.airline,
        return_flight_booked: event.travel?.return_flight_booked ?? false,
        return_boarding_point: event.travel?.return_boarding_point,
        return_deboarding_point: event.travel?.return_deboarding_point,
        return_airline: event.travel?.return_airline,
        hotel_name: event.accommodation?.hotel_name,
        hotel_address: event.accommodation?.address,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not load event data for duplication');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof EventFormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addCompanion = () => {
    if ((form.companions?.length ?? 0) >= MAX_COMPANIONS) return;
    set('companions', [...(form.companions ?? []), '']);
  };
  const updateCompanion = (idx: number, name: string) => {
    const updated = [...(form.companions ?? [])];
    updated[idx] = name;
    set('companions', updated);
  };
  const removeCompanion = (idx: number) => {
    set('companions', (form.companions ?? []).filter((_, i) => i !== idx));
  };

  const handlePickPoster = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to upload a poster'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.9,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setPosterUri(uri);
    if (route.params?.eventId) {
      try {
        setUploadingPoster(true);
        const url = await uploadEventPoster(uri, route.params.eventId);
        await updateEvent(route.params.eventId, { poster_url: url });
        set('poster_url', url);
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message ?? 'Could not upload poster');
      } finally {
        setUploadingPoster(false);
      }
    }
  };

  const handlePickTicket = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setTicketUri(asset.uri);
    if (route.params?.eventId) {
      try {
        setUploadingPdf(true);
        const url = await uploadTicketPdf(asset.uri, route.params.eventId);
        await updateEvent(route.params.eventId, { flight_booked: true, ticket_pdf_url: url } as any);
        set('ticket_pdf_url', url);
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message ?? 'Could not upload ticket');
      } finally {
        setUploadingPdf(false);
      }
    }
  };

  const handlePickReturnTicket = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setReturnTicketUri(asset.uri);
    if (route.params?.eventId) {
      try {
        setUploadingReturnPdf(true);
        const url = await uploadTicketPdf(asset.uri, route.params.eventId, 'return-ticket');
        await updateEvent(route.params.eventId, { return_flight_booked: true, return_ticket_pdf_url: url } as any);
        set('return_ticket_pdf_url', url);
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message ?? 'Could not upload return ticket');
      } finally {
        setUploadingReturnPdf(false);
      }
    }
  };

  // Pick + (in edit mode) upload a connecting-flight ticket PDF.
  // leg: 'connections' for outbound stops, 'return_connections' for return stops.
  const handlePickConnectionTicket = async (
    leg: 'connections' | 'return_connections',
    idx: number,
  ) => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const key = `${leg === 'connections' ? 'out' : 'ret'}-${idx}`;
    connTicketUris.current[key] = asset.uri;

    const setStopUrl = (url: string) => {
      const next = [...(form[leg] ?? [])];
      next[idx] = { ...next[idx], ticket_url: url };
      set(leg, next);
    };

    if (route.params?.eventId) {
      try {
        setConnUploading((m) => ({ ...m, [key]: true }));
        const url = await uploadTicketPdf(asset.uri, route.params.eventId, `${key}-ticket`);
        setStopUrl(url);
        delete connTicketUris.current[key];
        await updateEvent(route.params.eventId, { [leg]: (() => {
          const next = [...(form[leg] ?? [])];
          next[idx] = { ...next[idx], ticket_url: url };
          return next;
        })() } as any);
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message ?? 'Could not upload ticket');
      } finally {
        setConnUploading((m) => ({ ...m, [key]: false }));
      }
    } else {
      // New event: just mark as selected; uploaded after the event is created.
      setForm((f) => ({ ...f })); // force re-render to reflect pending state
    }
  };

  const checkConflict = (): boolean => {
    const newDate = new Date(form.date_start).toDateString();
    const currentEventId = route.params?.eventId;
    return existingEvents.some(
      (e) => new Date(e.date_start).toDateString() === newDate &&
        (!isEdit || e.id !== currentEventId)
    );
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.title.trim()) { Alert.alert('Required', 'Event title is required'); return; }
    if (!user) return;
    if (!isEdit && checkConflict()) {
      Alert.alert(
        'Date Conflict',
        'A confirmed event already exists on this date. Save anyway?',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Save Anyway', onPress: doSave }]
      );
      return;
    }
    doSave();
  };
  handleSaveRef.current = handleSave;

  const doSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateEvent(route.params!.eventId!, form);
      } else {
        const event = await createEvent(form, user.id);
        if (posterUri && !form.poster_url) {
          try {
            const url = await uploadEventPoster(posterUri, event.id);
            await updateEvent(event.id, { poster_url: url });
          } catch (uploadErr: any) {
            Alert.alert('Poster upload failed', uploadErr?.message ?? 'Event saved without poster.');
          }
        }
        if (ticketUri && !form.ticket_pdf_url) {
          try {
            const url = await uploadTicketPdf(ticketUri, event.id);
            await updateEvent(event.id, { flight_booked: true, ticket_pdf_url: url } as any);
          } catch (uploadErr: any) {
            Alert.alert('Ticket upload failed', uploadErr?.message ?? 'Event saved without ticket.');
          }
        }
        if (returnTicketUri && !form.return_ticket_pdf_url) {
          try {
            const url = await uploadTicketPdf(returnTicketUri, event.id, 'return-ticket');
            await updateEvent(event.id, { return_flight_booked: true, return_ticket_pdf_url: url } as any);
          } catch (uploadErr: any) {
            Alert.alert('Return ticket upload failed', uploadErr?.message ?? 'Event saved without return ticket.');
          }
        }
        // Upload any connecting-flight tickets picked before the event existed
        const pendingKeys = Object.keys(connTicketUris.current);
        if (pendingKeys.length) {
          const outbound = [...(form.connections ?? [])];
          const inbound = [...(form.return_connections ?? [])];
          for (const key of pendingKeys) {
            try {
              const url = await uploadTicketPdf(connTicketUris.current[key], event.id, `${key}-ticket`);
              const [legPrefix, idxStr] = key.split('-');
              const idx = Number(idxStr);
              if (legPrefix === 'out' && outbound[idx]) outbound[idx] = { ...outbound[idx], ticket_url: url };
              if (legPrefix === 'ret' && inbound[idx]) inbound[idx] = { ...inbound[idx], ticket_url: url };
            } catch (uploadErr: any) {
              Alert.alert('Connection ticket upload failed', uploadErr?.message ?? 'Event saved without one connection ticket.');
            }
          }
          connTicketUris.current = {};
          await updateEvent(event.id, { connections: outbound, return_connections: inbound } as any);
        }
        const { data: bossUser } = await supabase.from('users').select('id').eq('role', 'boss').single();
        if (bossUser) {
          await supabase.from('notifications').insert({
            user_id: bossUser.id,
            title: 'New Event Added',
            body: `"${form.title}" on ${new Date(form.date_start).toLocaleDateString()} — waiting for your approval`,
            event_id: event.id,
          });
        }
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', isEdit ? 'Could not update event' : 'Could not create event');
    } finally {
      setSaving(false);
    }
  };

  const pickContact = (contact: Contact) => {
    setForm((f) => ({
      ...f,
      organizer_name: contact.full_name,
      organizer_phone: contact.phone,
      organizer_email: contact.email,
      contact_id: contact.id,
    }));
  };

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y + 80;
    let next = 0;
    for (let i = sectionYs.current.length - 1; i >= 0; i--) {
      if (y >= sectionYs.current[i]) { next = i; break; }
    }
    if (next !== activeSection) {
      setActiveSection(next);
      tabScrollRef.current?.scrollTo({ x: Math.max(0, (next - 2) * 66), animated: true });
    }
  };

  if (loading) return (
    <View style={styles.loadingScreen}>
      <LinearGradient colors={[colors.primaryLight, '#DBEAFE']} style={styles.loadingGrad}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{getLoadingVerse()}</Text>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.screenWrap}>
      <LinearGradient
        colors={['#EDE9FE', '#F5F3FF', '#EEF2FF', '#F1F5F9']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.blobPurple} />
      <View style={styles.blobBlue} />
      <View style={styles.blobTeal} />
      {/* Step indicator */}
      <View style={styles.stepCard}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepRow}
          style={{ flex: 1 }}
        >
          {SECTIONS.map((s, i) => (
            <React.Fragment key={s.key}>
              <TouchableOpacity
                style={styles.stepItem}
                onPress={() => formScrollRef.current?.scrollTo({ y: sectionYs.current[i] - 10, animated: true })}
                activeOpacity={0.7}
              >
                <View style={[styles.stepCircle, { backgroundColor: i === activeSection ? s.color : '#E8EDF3' }]}>
                  <Ionicons name={s.icon} size={13} color={i === activeSection ? '#fff' : '#94A3B8'} />
                </View>
                <Text style={[styles.stepLabel, { color: i === activeSection ? s.color : '#94A3B8' }]} numberOfLines={1}>
                  {s.label}
                </Text>
              </TouchableOpacity>
              {i < SECTIONS.length - 1 && <View style={styles.stepDash} />}
            </React.Fragment>
          ))}
        </ScrollView>
        <View style={styles.stepCounterBox}>
          <Text style={styles.stepCounterNum}>{activeSection + 1}</Text>
          <Text style={styles.stepCounterOf}>/{SECTIONS.length}</Text>
        </View>
      </View>

      <ScrollView
          ref={formScrollRef}
          style={styles.formScroll}
          contentContainerStyle={styles.content}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={24}
        >
        {/* ─── 0: EVENT DETAILS ─── */}
        <View onLayout={(e) => { sectionYs.current[0] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="calendar-outline" bgGradient={SECTIONS[0].bgGradient} iconGradient={SECTIONS[0].iconGradient} title="Event Details" subtitle={SECTIONS[0].subtitle} emoji={SECTIONS[0].emoji} illustration={require('../../assets/illustrations/details.png')}>
            <Field icon="pencil-outline" iconColor={colors.primary} label="Event Title" required>
              <TextInput
                style={fld.input}
                value={form.title}
                onChangeText={(v) => set('title', v)}
                placeholder="e.g. Sunday Morning Service"
                placeholderTextColor="#9CA3AF"
              />
            </Field>
            <TwoFields
              left={
                <Field icon="calendar-outline" iconColor={colors.primary} label="Start Date & Time" noBox>
                  <DateField label="" value={form.date_start} onChange={(iso) => set('date_start', iso)} mode="datetime" placeholder="Tap to set" accentColor={colors.primary} />
                </Field>
              }
              right={
                <Field icon="calendar-outline" iconColor="#64748B" label="End Date & Time" noBox>
                  <DateField label="" value={form.date_end} onChange={(iso) => set('date_end', iso)} mode="datetime" placeholder="Optional" accentColor="#64748B" />
                </Field>
              }
            />
          </SectionCard>
        </View>

        {/* ─── 1: VENUE ─── */}
        <View onLayout={(e) => { sectionYs.current[1] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="location-outline" bgGradient={SECTIONS[1].bgGradient} iconGradient={SECTIONS[1].iconGradient} title="Venue" subtitle={SECTIONS[1].subtitle} emoji={SECTIONS[1].emoji}>
            <Field icon="business-outline" iconColor={colors.success} label="Venue Name">
              <TextInput style={fld.input} value={form.venue_name ?? ''} onChangeText={(v) => set('venue_name', v)} placeholder="Church or hall name" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field icon="home-outline" iconColor={colors.success} label="Street Address">
              <TextInput style={fld.input} value={form.venue_address ?? ''} onChangeText={(v) => set('venue_address', v)} placeholder="Street address" placeholderTextColor="#9CA3AF" />
            </Field>
            <TwoFields
              left={
                <Field icon="business-outline" iconColor={colors.success} label="City">
                  <TextInput style={fld.input} value={form.venue_city ?? ''} onChangeText={(v) => set('venue_city', v)} placeholder="City" placeholderTextColor="#9CA3AF" />
                </Field>
              }
              right={
                <Field icon="flag-outline" iconColor={colors.success} label="Country">
                  <TextInput style={fld.input} value={form.venue_country ?? ''} onChangeText={(v) => set('venue_country', v)} placeholder="Country" placeholderTextColor="#9CA3AF" />
                </Field>
              }
            />
            <Field icon="earth-outline" iconColor={colors.success} label="Region">
              <TouchableOpacity
                onPress={() => setRegionModal(true)}
                activeOpacity={0.75}
                style={fld.regionTrigger}
              >
                <Text style={[fld.regionTriggerText, !form.venue_region && { color: '#9CA3AF' }]} numberOfLines={1}>
                  {form.venue_region ?? 'Select region'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </Field>

            {/* Region picker modal */}
            <Modal transparent animationType="slide" visible={regionModal} onRequestClose={() => setRegionModal(false)} statusBarTranslucent>
              <View style={fld.regionBackdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setRegionModal(false)} />
                <View style={fld.regionSheet}>
                  <View style={fld.regionHandle} />
                  <View style={fld.regionHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={fld.regionTitle}>Select Region</Text>
                      <Text style={fld.regionSubtitle}>Choose the region where your event will take place.</Text>
                    </View>
                    <TouchableOpacity onPress={() => setRegionModal(false)} style={fld.regionCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  {REGION_OPTIONS.map((opt) => {
                    const isSelected = form.venue_region === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[fld.regionRow, isSelected && fld.regionRowSelected]}
                        onPress={() => { set('venue_region', opt.value); setRegionModal(false); }}
                        activeOpacity={0.7}
                      >
                        <View style={[fld.regionIconWrap, { backgroundColor: opt.color + '20' }]}>
                          <Ionicons name={opt.icon} size={20} color={opt.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={fld.regionRowLabel}>{opt.label}</Text>
                          <Text style={fld.regionRowSub}>{opt.sub}</Text>
                        </View>
                        {isSelected
                          ? <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />
                          : <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                        }
                      </TouchableOpacity>
                    );
                  })}
                  <View style={{ height: 24 }} />
                </View>
              </View>
            </Modal>
          </SectionCard>
        </View>

        {/* ─── 2: ORGANIZER ─── */}
        <View onLayout={(e) => { sectionYs.current[2] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="person-circle-outline" bgGradient={SECTIONS[2].bgGradient} iconGradient={SECTIONS[2].iconGradient} title="Organizer" subtitle={SECTIONS[2].subtitle} emoji={SECTIONS[2].emoji}>
            {contacts.length > 0 && (
              <View style={styles.contactsWrap}>
                <Text style={styles.quickFillHint}>Quick-fill from contacts</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactChips}>
                  {contacts.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.contactChip} onPress={() => pickContact(c)} activeOpacity={0.75}>
                      <LinearGradient colors={[colors.warning, '#B45309']} style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>{c.full_name[0]?.toUpperCase()}</Text>
                      </LinearGradient>
                      <Text style={styles.contactChipText}>{c.full_name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <Field icon="person-outline" iconColor={colors.warning} label="Full Name">
              <TextInput style={fld.input} value={form.organizer_name ?? ''} onChangeText={(v) => set('organizer_name', v)} placeholder="Organizer name" placeholderTextColor="#9CA3AF" />
            </Field>
            <TwoFields
              left={
                <Field icon="call-outline" iconColor={colors.warning} label="Phone">
                  <TextInput style={fld.input} value={form.organizer_phone ?? ''} onChangeText={(v) => set('organizer_phone', v)} keyboardType="phone-pad" placeholder="+91 XXXXX" placeholderTextColor="#9CA3AF" />
                </Field>
              }
              right={
                <Field icon="mail-outline" iconColor={colors.warning} label="Email">
                  <TextInput style={fld.input} value={form.organizer_email ?? ''} onChangeText={(v) => set('organizer_email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="email@..." placeholderTextColor="#9CA3AF" />
                </Field>
              }
            />
          </SectionCard>
        </View>

        {/* ─── 3: TRAVEL ─── */}
        <View onLayout={(e) => { sectionYs.current[3] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="airplane-outline" bgGradient={SECTIONS[3].bgGradient} iconGradient={SECTIONS[3].iconGradient} title="Travel" subtitle={SECTIONS[3].subtitle} emoji={SECTIONS[3].emoji}>
            {/* Outbound toggle */}
            <ToggleCard
              icon="ticket-outline" iconBg="#DDD6FE" iconColor="#7C3AED"
              title="Flight Booked" sub="Mark when outbound ticket is confirmed"
              value={form.flight_booked ?? false}
              onToggle={(v) => set('flight_booked', v)}
              trackOn={colors.primary}
            />
            {form.flight_booked && (
              <>
                <TwoFields
                  left={
                    <Field icon="location-outline" iconColor="#7C3AED" label="Boarding Point">
                      <TextInput style={fld.input} value={form.boarding_point ?? ''} onChangeText={(v) => set('boarding_point', v)} placeholder="e.g. Kochi" placeholderTextColor="#9CA3AF" />
                    </Field>
                  }
                  right={
                    <Field icon="location-outline" iconColor="#7C3AED" label="Deboarding Point">
                      <TextInput style={fld.input} value={form.deboarding_point ?? ''} onChangeText={(v) => set('deboarding_point', v)} placeholder="e.g. Dubai" placeholderTextColor="#9CA3AF" />
                    </Field>
                  }
                />
                <TwoFields
                  left={
                    <Field icon="barcode-outline" iconColor="#7C3AED" label="Flight No.">
                      <TextInput style={fld.input} value={form.flight_number ?? ''} onChangeText={(v) => set('flight_number', v)} placeholder="EK 123" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
                    </Field>
                  }
                  right={
                    <Field icon="airplane-outline" iconColor="#7C3AED" label="Airline">
                      <TextInput style={fld.input} value={form.airline ?? ''} onChangeText={(v) => set('airline', v)} placeholder="Emirates" placeholderTextColor="#9CA3AF" />
                    </Field>
                  }
                />
                <TwoFields
                  left={
                    <Field icon="send-outline" iconColor="#7C3AED" label="Departure" noBox>
                      <DateField label="" value={form.departure_time} onChange={(iso) => set('departure_time', iso)} mode="datetime" placeholder="Not set" accentColor="#7C3AED" />
                    </Field>
                  }
                  right={
                    <Field icon="alarm-outline" iconColor="#7C3AED" label="Check-in Time" noBox>
                      <DateField label="" value={form.flight_checkin_time} onChange={(iso) => set('flight_checkin_time', iso)} mode="datetime" placeholder="Not set" accentColor="#7C3AED" />
                    </Field>
                  }
                />
                <Field icon="flag-outline" iconColor="#7C3AED" label="Arrival Time" noBox>
                  <DateField label="" value={form.arrival_time} onChange={(iso) => set('arrival_time', iso)} mode="datetime" placeholder="Not set" accentColor="#7C3AED" />
                </Field>
                {(form.connections ?? []).map((stop, idx) => (
                  <ConnectionCard
                    key={idx}
                    index={idx}
                    stop={stop}
                    onChange={(updated) => {
                      const next = [...(form.connections ?? [])];
                      next[idx] = updated;
                      set('connections', next);
                    }}
                    onRemove={() => set('connections', (form.connections ?? []).filter((_, i) => i !== idx))}
                    accent="#7C3AED"
                    ticketPending={!!connTicketUris.current[`out-${idx}`]}
                    ticketUploading={!!connUploading[`out-${idx}`]}
                    onPickTicket={() => handlePickConnectionTicket('connections', idx)}
                  />
                ))}
                <TouchableOpacity
                  style={styles.addConnectionBtn}
                  onPress={() => set('connections', [...(form.connections ?? []), {}])}
                  activeOpacity={0.75}
                >
                  <View style={styles.addConnectionIcon}>
                    <Ionicons name="git-branch-outline" size={14} color="#D97706" />
                  </View>
                  <Text style={styles.addConnectionText}>
                    {(form.connections ?? []).length === 0 ? 'Add Connecting Flight' : 'Add Another Stop'}
                  </Text>
                  <Ionicons name="add" size={16} color="#D97706" />
                </TouchableOpacity>
                <PdfButton
                  label="Outbound Ticket PDF"
                  color="#7C3AED"
                  bg="#F5F3FF"
                  uploaded={!!form.ticket_pdf_url}
                  selected={!!ticketUri}
                  uploading={uploadingPdf}
                  onPress={handlePickTicket}
                />
              </>
            )}

            <View style={styles.sectionDivider} />

            {/* Return toggle */}
            <ToggleCard
              icon="return-down-back-outline" iconBg="#BBF7D0" iconColor={colors.success}
              title="Return Flight Booked" sub="Mark when return ticket is confirmed"
              value={form.return_flight_booked ?? false}
              onToggle={(v) => set('return_flight_booked', v)}
              trackOn={colors.success}
            />
            {form.return_flight_booked && (
              <>
                <TwoFields
                  left={
                    <Field icon="location-outline" iconColor={colors.success} label="Boarding Point">
                      <TextInput style={fld.input} value={form.return_boarding_point ?? ''} onChangeText={(v) => set('return_boarding_point', v)} placeholder="e.g. Dubai" placeholderTextColor="#9CA3AF" />
                    </Field>
                  }
                  right={
                    <Field icon="location-outline" iconColor={colors.success} label="Deboarding Point">
                      <TextInput style={fld.input} value={form.return_deboarding_point ?? ''} onChangeText={(v) => set('return_deboarding_point', v)} placeholder="e.g. Kochi" placeholderTextColor="#9CA3AF" />
                    </Field>
                  }
                />
                <TwoFields
                  left={
                    <Field icon="barcode-outline" iconColor={colors.success} label="Flight No.">
                      <TextInput style={fld.input} value={form.return_flight_number ?? ''} onChangeText={(v) => set('return_flight_number', v)} placeholder="EK 124" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
                    </Field>
                  }
                  right={
                    <Field icon="airplane-outline" iconColor={colors.success} label="Airline">
                      <TextInput style={fld.input} value={form.return_airline ?? ''} onChangeText={(v) => set('return_airline', v)} placeholder="Emirates" placeholderTextColor="#9CA3AF" />
                    </Field>
                  }
                />
                <TwoFields
                  left={
                    <Field icon="send-outline" iconColor={colors.success} label="Departure" noBox>
                      <DateField label="" value={form.return_departure_time} onChange={(iso) => set('return_departure_time', iso)} mode="datetime" placeholder="Not set" accentColor={colors.success} />
                    </Field>
                  }
                  right={
                    <Field icon="alarm-outline" iconColor={colors.success} label="Check-in Time" noBox>
                      <DateField label="" value={form.return_flight_checkin_time} onChange={(iso) => set('return_flight_checkin_time', iso)} mode="datetime" placeholder="Not set" accentColor={colors.success} />
                    </Field>
                  }
                />
                <Field icon="flag-outline" iconColor={colors.success} label="Arrival Time" noBox>
                  <DateField label="" value={form.return_arrival_time} onChange={(iso) => set('return_arrival_time', iso)} mode="datetime" placeholder="Not set" accentColor={colors.success} />
                </Field>
                {(form.return_connections ?? []).map((stop, idx) => (
                  <ConnectionCard
                    key={idx}
                    index={idx}
                    stop={stop}
                    onChange={(updated) => {
                      const next = [...(form.return_connections ?? [])];
                      next[idx] = updated;
                      set('return_connections', next);
                    }}
                    onRemove={() => set('return_connections', (form.return_connections ?? []).filter((_, i) => i !== idx))}
                    accent={colors.success}
                    ticketPending={!!connTicketUris.current[`ret-${idx}`]}
                    ticketUploading={!!connUploading[`ret-${idx}`]}
                    onPickTicket={() => handlePickConnectionTicket('return_connections', idx)}
                  />
                ))}
                <TouchableOpacity
                  style={styles.addConnectionBtn}
                  onPress={() => set('return_connections', [...(form.return_connections ?? []), {}])}
                  activeOpacity={0.75}
                >
                  <View style={styles.addConnectionIcon}>
                    <Ionicons name="git-branch-outline" size={14} color="#D97706" />
                  </View>
                  <Text style={styles.addConnectionText}>
                    {(form.return_connections ?? []).length === 0 ? 'Add Connecting Flight' : 'Add Another Stop'}
                  </Text>
                  <Ionicons name="add" size={16} color="#D97706" />
                </TouchableOpacity>
                <PdfButton
                  label="Return Ticket PDF"
                  color={colors.success}
                  bg="#F0FDF4"
                  uploaded={!!form.return_ticket_pdf_url}
                  selected={!!returnTicketUri}
                  uploading={uploadingReturnPdf}
                  onPress={handlePickReturnTicket}
                />
              </>
            )}
          </SectionCard>
        </View>

        {/* ─── 4: ACCOMMODATION ─── */}
        <View onLayout={(e) => { sectionYs.current[4] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="bed-outline" bgGradient={SECTIONS[4].bgGradient} iconGradient={SECTIONS[4].iconGradient} title="Accommodation" subtitle={SECTIONS[4].subtitle} emoji={SECTIONS[4].emoji}>
            <Field icon="business-outline" iconColor="#E11D48" label="Hotel Name">
              <TextInput style={fld.input} value={form.hotel_name ?? ''} onChangeText={(v) => set('hotel_name', v)} placeholder="Hotel name" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field icon="navigate-outline" iconColor="#E11D48" label="Hotel Address">
              <TextInput style={fld.input} value={form.hotel_address ?? ''} onChangeText={(v) => set('hotel_address', v)} placeholder="Address" placeholderTextColor="#9CA3AF" />
            </Field>
            <TwoFields
              left={
                <Field icon="log-in-outline" iconColor="#E11D48" label="Check-in" noBox>
                  <DateField label="" value={form.check_in} onChange={(iso) => set('check_in', iso)} mode="date" placeholder="Not set" accentColor="#E11D48" />
                </Field>
              }
              right={
                <Field icon="log-out-outline" iconColor="#E11D48" label="Check-out" noBox>
                  <DateField label="" value={form.check_out} onChange={(iso) => set('check_out', iso)} mode="date" placeholder="Not set" accentColor="#E11D48" />
                </Field>
              }
            />
          </SectionCard>
        </View>

        {/* ─── 5: COMPANIONS ─── */}
        <View onLayout={(e) => { sectionYs.current[5] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="people-outline" bgGradient={SECTIONS[5].bgGradient} iconGradient={SECTIONS[5].iconGradient} title="Travel Companions" subtitle={SECTIONS[5].subtitle} emoji={SECTIONS[5].emoji}>
            {(form.companions ?? []).length === 0 ? (
              <View style={styles.companionsEmpty}>
                <Ionicons name="people-outline" size={28} color="#0D9488" style={{ opacity: 0.4 }} />
                <Text style={styles.companionsEmptyText}>No companions added yet</Text>
              </View>
            ) : (
              <View style={styles.companionGrid}>
                {(form.companions ?? []).map((name, idx) => (
                  <View key={idx} style={styles.companionCard}>
                    <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.companionAvatar}>
                      <Text style={styles.companionAvatarText}>{idx + 1}</Text>
                    </LinearGradient>
                    <TextInput
                      style={styles.companionInput}
                      value={name}
                      onChangeText={(v) => updateCompanion(idx, v)}
                      placeholder="Full name"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity onPress={() => removeCompanion(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <View style={styles.companionRemove}>
                        <Ionicons name="close" size={12} color={colors.danger} />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {(form.companions?.length ?? 0) < MAX_COMPANIONS && (
              <TouchableOpacity style={styles.addCompanionBtn} onPress={addCompanion} activeOpacity={0.75}>
                <View style={styles.addCompanionIcon}>
                  <Ionicons name="add" size={16} color="#0D9488" />
                </View>
                <Text style={styles.addCompanionText}>Add Companion</Text>
                {(form.companions?.length ?? 0) > 0 && (
                  <Text style={styles.companionCount}>{form.companions?.length}/{MAX_COMPANIONS}</Text>
                )}
              </TouchableOpacity>
            )}
          </SectionCard>
        </View>

        {/* ─── 6: POSTER ─── */}
        <View onLayout={(e) => { sectionYs.current[6] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="image-outline" bgGradient={SECTIONS[6].bgGradient} iconGradient={SECTIONS[6].iconGradient} title="Event Poster" subtitle={SECTIONS[6].subtitle} emoji={SECTIONS[6].emoji}>
            <TouchableOpacity style={styles.posterBtn} onPress={handlePickPoster} activeOpacity={0.85}>
              {uploadingPoster ? (
                <ActivityIndicator color={colors.primary} />
              ) : posterUri ? (
                <>
                  <Image source={{ uri: posterUri }} style={styles.posterPreview} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.posterOverlay}>
                    <Ionicons name="pencil" size={18} color="#fff" />
                    <Text style={styles.posterOverlayText}>Change Poster</Text>
                  </LinearGradient>
                </>
              ) : (
                <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.posterEmpty}>
                  <View style={styles.posterEmptyIcon}>
                    <Ionicons name="image-outline" size={32} color="#16A34A" />
                  </View>
                  <Text style={styles.posterUploadText}>Tap to upload poster</Text>
                  <Text style={styles.posterUploadSub}>JPG or PNG · Displayed on event card</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </SectionCard>
        </View>

        {/* ─── 7: OTHERS ─── */}
        <View onLayout={(e) => { sectionYs.current[7] = e.nativeEvent.layout.y; }}>
          <SectionCard icon="ellipsis-horizontal-circle-outline" bgGradient={SECTIONS[7].bgGradient} iconGradient={SECTIONS[7].iconGradient} title="Others" subtitle={SECTIONS[7].subtitle} emoji={SECTIONS[7].emoji}>
            <Field icon="mic-outline" iconColor={colors.textSecondary} label="Speaking Topic">
              <TextInput style={fld.input} value={form.speaking_topic ?? ''} onChangeText={(v) => set('speaking_topic', v)} placeholder="Topic or sermon title" placeholderTextColor="#9CA3AF" />
            </Field>
            <TwoFields
              left={
                <Field icon="people-outline" iconColor={colors.textSecondary} label="Expected Audience">
                  <TextInput style={fld.input} value={form.expected_audience?.toString() ?? ''} onChangeText={(v) => set('expected_audience', v ? parseInt(v) : undefined)} keyboardType="numeric" placeholder="e.g. 500" placeholderTextColor="#9CA3AF" />
                </Field>
              }
              right={
                <Field icon="time-outline" iconColor={colors.textSecondary} label="Timezone">
                  <TouchableOpacity
                    onPress={() => setTimezoneModal(true)}
                    activeOpacity={0.75}
                    style={fld.regionTrigger}
                  >
                    <Text style={[fld.regionTriggerText, !form.timezone && { color: '#9CA3AF' }]} numberOfLines={1}>
                      {TIMEZONE_OPTIONS.find(t => t.value === form.timezone)?.label ?? 'Select timezone'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                </Field>
              }
            />
          </SectionCard>
        </View>

        {/* Timezone picker modal */}
        <Modal transparent animationType="slide" visible={timezoneModal} onRequestClose={() => setTimezoneModal(false)} statusBarTranslucent>
          <View style={fld.regionBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setTimezoneModal(false)} />
            <View style={[fld.regionSheet, { maxHeight: '80%' }]}>
              <View style={fld.regionHandle} />
              <View style={fld.regionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={fld.regionTitle}>Select Timezone</Text>
                  <Text style={fld.regionSubtitle}>Choose the timezone for this event.</Text>
                </View>
                <TouchableOpacity onPress={() => setTimezoneModal(false)} style={fld.regionCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {TIMEZONE_OPTIONS.map((opt) => {
                  const isSelected = form.timezone === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[fld.regionRow, isSelected && fld.regionRowSelected]}
                      onPress={() => { set('timezone', opt.value); setTimezoneModal(false); }}
                      activeOpacity={0.7}
                    >
                      <View style={[fld.regionIconWrap, { backgroundColor: opt.color + '20' }]}>
                        <Ionicons name={opt.icon} size={20} color={opt.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={fld.regionRowLabel}>{opt.label}</Text>
                        <Text style={fld.regionRowSub}>{opt.sub}</Text>
                      </View>
                      {isSelected
                        ? <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />
                        : <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      }
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── SAVE ── */}
        <TouchableOpacity
          style={[styles.saveBtnWrap, saving && { opacity: 0.65 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#2D6EE9', '#1A56DB', '#1040B2'] as const}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.saveBtn}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.saveBtnText}>Saving…</Text>
              </>
            ) : (
              <>
                <Ionicons name={isEdit ? 'checkmark-circle' : 'add-circle'} size={22} color="#fff" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Update Event' : 'Create Event'}</Text>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.65)" style={{ marginLeft: 'auto' }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Full-screen saving overlay — blocks all taps while saving */}
      {saving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.savingText}>Saving event…</Text>
            <Text style={styles.savingSubText}>Please wait</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────

function SectionCard({ icon, bgGradient, iconGradient, title, subtitle, emoji, illustration, children }: {
  icon: keyof typeof Ionicons.glyphMap;
  bgGradient: [string, string]; iconGradient: [string, string];
  title: string; subtitle: string; emoji: string;
  illustration?: any;
  children: React.ReactNode;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <View style={sc.cardShadow}>
        <View style={sc.card}>
          <LinearGradient colors={[iconGradient[0] + '55', bgGradient[0], '#3a87c6'] as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sc.header}>
            {/* Left light bloom */}
            <View pointerEvents="none" style={{ position: 'absolute', left: -22, top: -22, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.55)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 10, top: -10, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            <View style={sc.headerLeft}>
              <LinearGradient colors={iconGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sc.iconBadge}>
                <Ionicons name={icon} size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={sc.title}>{title}</Text>
                <Text style={sc.subtitle}>{subtitle}</Text>
              </View>
            </View>
          </LinearGradient>
          <View style={sc.body}>{children}</View>
        </View>
      </View>
      {illustration ? (
        <View style={sc.overlaySlot} pointerEvents="none">
          <Image source={illustration} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </View>
      ) : (
        <View style={sc.overlaySlot} pointerEvents="none">
          <View style={[sc.emojiGlow, { backgroundColor: iconGradient[0] + '30' }]} />
          <Text style={sc.emojiDecor}>{emoji}</Text>
        </View>
      )}
    </View>
  );
}

function Field({ icon, iconColor, label, required, noBox, children }: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string; label: string;
  required?: boolean; noBox?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={fld.wrap}>
      <Text style={fld.label}>
        {label}
        {required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>
      {noBox ? children : (
        <View style={fld.inputBox}>
          {icon && (
            <View style={fld.inputIconWrap}>
              <Ionicons name={icon} size={13} color={iconColor ?? '#94A3B8'} />
            </View>
          )}
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      )}
    </View>
  );
}

function TwoFields({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={styles.twoFieldRow}>
      <View style={{ flex: 1 }}>{left}</View>
      <View style={{ width: 8 }} />
      <View style={{ flex: 1 }}>{right}</View>
    </View>
  );
}

function ToggleCard({ icon, iconBg, iconColor, title, sub, value, onToggle, trackOn }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string; title: string; sub: string;
  value: boolean; onToggle: (v: boolean) => void; trackOn: string;
}) {
  return (
    <View style={[styles.toggleCard, value && { borderColor: iconColor + '40', backgroundColor: iconBg }]}>
      <View style={[styles.toggleIconWrap, { backgroundColor: value ? iconColor + '25' : '#F1F5F9' }]}>
        <Ionicons name={icon} size={18} color={value ? iconColor : colors.textTertiary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleTitle, value && { color: iconColor }]}>{title}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <View style={styles.toggleRight}>
        <Text style={[styles.toggleStatus, { color: value ? iconColor : colors.textTertiary }]}>
          {value ? 'YES' : 'NO'}
        </Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ true: trackOn, false: '#D1D5DB' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );
}

function PdfButton({ label, color, bg, uploaded, selected, uploading, onPress }: {
  label: string; color: string; bg: string;
  uploaded: boolean; selected: boolean; uploading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pdfBtn, (uploaded || selected) && { borderColor: color, borderStyle: 'solid', backgroundColor: bg }]}
      onPress={onPress} activeOpacity={0.8} disabled={uploading}
    >
      {uploading ? (
        <ActivityIndicator size="small" color={color} />
      ) : uploaded ? (
        <>
          <View style={[styles.pdfIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name="document-text" size={16} color={color} />
          </View>
          <Text style={[styles.pdfBtnText, { color }]}>Ticket uploaded</Text>
          <Ionicons name="checkmark-circle" size={18} color={color} />
        </>
      ) : selected ? (
        <>
          <View style={[styles.pdfIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name="document-text" size={16} color={color} />
          </View>
          <Text style={[styles.pdfBtnText, { color, flex: 1 }]}>PDF ready — saves with event</Text>
          <Ionicons name="pencil-outline" size={14} color={color} />
        </>
      ) : (
        <>
          <View style={[styles.pdfIcon, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="cloud-upload-outline" size={16} color={color} />
          </View>
          <Text style={[styles.pdfBtnText, { color }]}>{label}</Text>
          <Ionicons name="chevron-forward" size={14} color={color} />
        </>
      )}
    </TouchableOpacity>
  );
}

function ConnectionCard({
  index, stop, onChange, onRemove,
  accent = '#D97706', ticketPending = false, ticketUploading = false, onPickTicket,
}: {
  index: number;
  stop: ConnectionStop;
  onChange: (updated: ConnectionStop) => void;
  onRemove: () => void;
  accent?: string;
  ticketPending?: boolean;
  ticketUploading?: boolean;
  onPickTicket?: () => void;
}) {
  const upd = (key: keyof ConnectionStop, val: string | undefined) =>
    onChange({ ...stop, [key]: val });

  return (
    <View style={[conn.card, { borderColor: accent + '33' }]}>
      <View style={[conn.header, { backgroundColor: accent + '14' }]}>
        <View style={conn.headerLeft}>
          <View style={[conn.iconWrap, { backgroundColor: accent + '22' }]}>
            <Ionicons name="git-branch-outline" size={13} color={accent} />
          </View>
          <Text style={[conn.headerText, { color: accent }]}>Connection {index + 1}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={conn.removeBtn}>
            <Ionicons name="close" size={12} color={colors.danger} />
          </View>
        </TouchableOpacity>
      </View>
      <View style={conn.body}>
        <Field icon="location-outline" iconColor={accent} label="Stopover Airport">
          <TextInput
            style={fld.input}
            value={stop.airport ?? ''}
            onChangeText={(v) => upd('airport', v)}
            placeholder="e.g. Dubai / DXB"
            placeholderTextColor="#9CA3AF"
          />
        </Field>
        <TwoFields
          left={
            <Field icon="airplane-outline" iconColor={accent} label="Airline">
              <TextInput
                style={fld.input}
                value={stop.airline ?? ''}
                onChangeText={(v) => upd('airline', v)}
                placeholder="Emirates"
                placeholderTextColor="#9CA3AF"
              />
            </Field>
          }
          right={
            <Field icon="barcode-outline" iconColor={accent} label="Flight No.">
              <TextInput
                style={fld.input}
                value={stop.flight_number ?? ''}
                onChangeText={(v) => upd('flight_number', v)}
                placeholder="EK 007"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
            </Field>
          }
        />
        <TwoFields
          left={
            <Field icon="flag-outline" iconColor={accent} label="Arrives Stop" noBox>
              <DateField label="" value={stop.arrival_time} onChange={(iso) => upd('arrival_time', iso)} mode="datetime" placeholder="Not set" accentColor={accent} />
            </Field>
          }
          right={
            <Field icon="send-outline" iconColor={accent} label="Departs Stop" noBox>
              <DateField label="" value={stop.departure_time} onChange={(iso) => upd('departure_time', iso)} mode="datetime" placeholder="Not set" accentColor={accent} />
            </Field>
          }
        />
        {onPickTicket && (
          <PdfButton
            label="Connection Ticket PDF"
            color={accent}
            bg={accent + '14'}
            uploaded={!!stop.ticket_url}
            selected={ticketPending}
            uploading={ticketUploading}
            onPress={onPickTicket}
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  screenWrap: { flex: 1, backgroundColor: '#F1F5F9' },

  // Background atmosphere blobs
  blobPurple: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(124,58,237,0.1)', top: -80, right: -80 },
  blobBlue: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(26,86,219,0.07)', top: 200, left: -80 },
  blobTeal: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(13,148,136,0.06)', top: 520, right: -60 },

  // Step indicator
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)', paddingVertical: 10 },
  stepRow: { paddingHorizontal: 8, gap: 0 },
  stepItem: { alignItems: 'center', width: 66, paddingHorizontal: 3, gap: 4 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  stepDash: { width: 10, height: 2, backgroundColor: '#D1D5DB', borderRadius: 1, alignSelf: 'flex-start', marginTop: 15 },
  stepCounterBox: { paddingHorizontal: 12, paddingVertical: 4, borderLeftWidth: 1, borderLeftColor: '#E2E8F0', minWidth: 44, alignItems: 'center' },
  stepCounterNum: { fontSize: 15, fontWeight: '900', color: '#1E293B', lineHeight: 18 },
  stepCounterOf: { fontSize: 9, fontWeight: '600', color: '#94A3B8' },

  // Form scroll
  formScroll: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 32, paddingHorizontal: 14, gap: 16 },

  loadingScreen: { flex: 1 },
  loadingGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  // Two-field row
  twoFieldRow: { flexDirection: 'row' },

  // Section divider
  sectionDivider: { height: 1, backgroundColor: '#E9EDF3', marginVertical: 14, marginHorizontal: -4 },

  // Contacts
  contactsWrap: { backgroundColor: '#FFFBF5', borderRadius: radius.md, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A' },
  quickFillHint: { fontSize: 10, fontWeight: '800', color: colors.warning, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  contactChips: { gap: 8, paddingBottom: 2 },
  contactChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#FDE68A', ...shadow.xs },
  contactAvatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  contactChipText: { color: colors.warning, fontWeight: '700', fontSize: 13 },

  // Toggle
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14, shadowColor: '#1A56DB', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 2 },
  toggleIconWrap: { width: 40, height: 40, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  toggleSub: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleStatus: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Add connection button
  addConnectionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  addConnectionIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
  },
  addConnectionText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#D97706' },

  // PDF
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 14, backgroundColor: '#fff', shadowColor: '#1A56DB', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  pdfIcon: { width: 30, height: 30, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  pdfBtnText: { fontSize: 13, fontWeight: '700', flex: 1 },

  // Companions
  companionsEmpty: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  companionsEmptyText: { fontSize: 13, color: colors.textTertiary },
  companionGrid: { gap: 8, marginBottom: 4 },
  companionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDFA', borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: '#CCFBF1' },
  companionAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  companionAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  companionInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 4 },
  companionRemove: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  addCompanionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, padding: 12, borderWidth: 1.5, borderColor: '#99F6E4', borderStyle: 'dashed', borderRadius: radius.md, backgroundColor: '#F0FDFA' },
  addCompanionIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center' },
  addCompanionText: { fontSize: 13, fontWeight: '700', color: '#0D9488', flex: 1 },
  companionCount: { fontSize: 11, fontWeight: '700', color: '#0D9488', backgroundColor: '#CCFBF1', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },

  // Poster
  posterBtn: { borderRadius: radius.lg, overflow: 'hidden', minHeight: 180 },
  posterPreview: { width: '100%', height: 200 },
  posterOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  posterOverlayText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  posterEmpty: { minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 24 },
  posterEmptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(22,163,74,0.12)', justifyContent: 'center', alignItems: 'center' },
  posterUploadText: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  posterUploadSub: { fontSize: 12, color: colors.textTertiary },

  // Save
  saveBtnWrap: { marginTop: 12, borderRadius: radius.lg, overflow: 'hidden', ...shadow.lg },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  savingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  savingText: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  savingSubText: { fontSize: 13, color: colors.textSecondary },
});

// Section card styles
const sc = StyleSheet.create({
  cardShadow: {
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  card: { borderRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 20, gap: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  iconBadge: { width: 50, height: 30, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
  subtitle: { fontSize: 8, color: '#64748B', marginTop: 2 },
  overlaySlot: { position: 'absolute', right: 12, top: -18, width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  emojiGlow: { position: 'absolute', width: 90, height: 60, borderRadius: 45 },
  emojiDecor: { fontSize: 52, textAlign: 'center' },
  body: { padding: 14, gap: 12, backgroundColor: 'rgba(255,255,255,0.82)' },
});

// Field styles
const fld = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: '#334155', marginLeft: 2 },
  inputBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C4CDD8',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1A56DB',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  inputIconWrap: { marginRight: 8, opacity: 0.75 },
  input: { fontSize: 13, color: colors.textPrimary, paddingVertical: 6, minHeight: 32 },
  pickerWrap: { marginRight: -12, marginVertical: -4 },
  picker: { height: 44, color: colors.textPrimary },
  pickerItem: { fontSize: 13 },

  // Region picker
  regionTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, minHeight: 32, flex: 1,
  },
  regionTriggerText: { fontSize: 13, color: colors.textPrimary, flex: 1, marginRight: 4 },
  regionBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  regionSheet: {
    backgroundColor: '#FAFBFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 8,
  },
  regionHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1',
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  regionHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16, gap: 12,
  },
  regionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 3 },
  regionSubtitle: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  regionCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  regionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  regionRowSelected: { backgroundColor: '#F5F0FF' },
  regionIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  regionRowLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  regionRowSub: { fontSize: 12, color: '#94A3B8', lineHeight: 16 },
});

// Connection card styles
const conn = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FDE68A', justifyContent: 'center', alignItems: 'center',
  },
  headerText: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  removeBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },
  body: { padding: 12, gap: 10 },
});
