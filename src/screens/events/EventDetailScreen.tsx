import React, { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
  Animated,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEventById,
  deleteEvent,
  getNotes,
  addNote,
  getTasks,
  createTask,
  toggleTask,
} from '../../services/events';
import { Event, Note, Task } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadow, radius, eventTypeLabels } from '../../constants/theme';
import { getLoadingVerse } from '../../constants/verses';

type RouteProps = RouteProp<RootStackParamList, 'EventDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function EventDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isAssistant = user?.role === 'assistant';

  const [event, setEvent] = useState<Event | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showPoster, setShowPoster] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formScrollRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const sectionYsMap = useRef<Record<string, number>>({});
  const animatedViewOffsetY = useRef(0);
  const sectionsRef = useRef<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[]>([]);

  const handleDetailScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y + 80;
    let nextIdx = 0;
    sectionsRef.current.forEach((s, i) => {
      if (y >= (sectionYsMap.current[s.key] ?? 0)) nextIdx = i;
    });
    setActiveSection(prev => {
      if (nextIdx !== prev) {
        tabScrollRef.current?.scrollTo({ x: Math.max(0, (nextIdx - 2) * 72), animated: true });
      }
      return nextIdx;
    });
  }, []);

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
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 }} numberOfLines={1}>
            {event?.title ?? 'Event Details'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 }}>
            {event ? eventTypeLabels[event.event_type] : 'Loading…'}
          </Text>
        </View>
      ),
      headerTintColor: '#fff',
      headerRight: isAssistant && event ? () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AddEditEvent', { eventId: event.id })}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 14,
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 6,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.35)',
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [navigation, event, isAssistant]);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const [ev, n, t] = await Promise.all([
        getEventById(route.params.eventId),
        getNotes(route.params.eventId),
        getTasks(route.params.eventId),
      ]);
      setEvent(ev);
      setNotes(n);
      setTasks(t);
    } catch (e) {
      Alert.alert('Error', 'Could not load event');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [route.params.eventId]);

  useFocusEffect(useCallback(() => { loadEvent(); }, [loadEvent]));

  useEffect(() => {
    if (!loading && event) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 3, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, event]);

  const handleDelete = async () => {
    const doDelete = async () => {
      try {
        await deleteEvent(event!.id);
        navigation.goBack();
      } catch (e: any) {
        if (Platform.OS === 'web') {
          window.alert(e?.message ?? 'Could not delete event');
        } else {
          Alert.alert('Error', e?.message ?? 'Could not delete event');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${event?.title}"? This cannot be undone.`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Event',
        `Are you sure you want to delete "${event?.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !user) return;
    await addNote(event?.id, user.id, 'text', noteText.trim());
    setNoteText('');
    const updated = await getNotes(route.params.eventId);
    setNotes(updated);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !event) return;
    await createTask(event.id, newTaskTitle.trim());
    setNewTaskTitle('');
    setTasks(await getTasks(event.id));
  };

  const handleToggleTask = async (task: Task) => {
    await toggleTask(task.id, !task.completed);
    setTasks(await getTasks(event!.id));
  };

  const handleWhatsAppShare = () => {
    if (!event) return;
    const v = event.venue;
    const t = event.travel;
    const a = event.accommodation;
    const o = event.organizer;
    const msg = [
      `📅 *${event.title}*`,
      `🗓 Date: ${fmt(event.date_start)}`,
      v ? `📍 Venue: ${v.name ?? ''}, ${v.city ?? ''}, ${v.country ?? ''}` : null,
      t?.flight_booked && t.flight_number ? `✈️ Flight: ${t.flight_number} | ${t.airline ?? ''}` : null,
      t?.departure_time ? `   Departure: ${fmt(t.departure_time)} → Arrival: ${fmt(t.arrival_time ?? '')}` : null,
      a?.hotel_name ? `🏨 Hotel: ${a.hotel_name}` : null,
      a?.check_in ? `   Check-in: ${a.check_in} | Check-out: ${a.check_out ?? ''}` : null,
      o?.name ? `👤 Organizer: ${o.name}` : null,
      o?.phone ? `   📞 ${o.phone}` : null,
      event.speaking_topic ? `📖 Topic: ${event.speaking_topic}` : null,
    ].filter(Boolean).join('\n');
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };


  if (loading || !event) {
    return (
      <View style={styles.loadingWrap}>
        <LinearGradient colors={['#EDE9FE', '#F5F3FF']} style={styles.loadingGrad}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{getLoadingVerse()}</Text>
        </LinearGradient>
      </View>
    );
  }

  const fmt = (iso: string) => iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '';

  const t = event.travel;
  const v = event.venue;
  const a = event.accommodation;
  const o = event.organizer;

  const sections = [
    { key: 'details',   label: 'Details',   icon: 'calendar-outline' as const,                   color: '#7C3AED' },
    ...(v && (v.name || v.city)                                  ? [{ key: 'venue',      label: 'Venue',     icon: 'location-outline' as const,                   color: '#059669' }] : []),
    ...(o?.name                                                  ? [{ key: 'organizer',  label: 'Organizer', icon: 'person-circle-outline' as const,              color: '#D97706' }] : []),
    { key: 'travel',    label: 'Travel',    icon: 'airplane-outline' as const,                   color: '#7C3AED' },
    ...(a?.hotel_name                                            ? [{ key: 'stay',       label: 'Stay',      icon: 'bed-outline' as const,                        color: '#E11D48' }] : []),
    ...((event.companions ?? []).length > 0                      ? [{ key: 'companions', label: 'Team',      icon: 'people-outline' as const,                     color: '#0D9488' }] : []),
    ...((event.speaking_topic || event.expected_audience || event.timezone) ? [{ key: 'others', label: 'Others', icon: 'ellipsis-horizontal-circle-outline' as const, color: '#475569' }] : []),
    { key: 'notes',     label: 'Notes',     icon: 'document-text-outline' as const,              color: '#7C3AED' },
    ...(isAssistant                                              ? [{ key: 'tasks',      label: 'Tasks',     icon: 'checkmark-circle-outline' as const,           color: '#059669' }] : []),
  ];
  sectionsRef.current = sections;

  const trackY = (key: string) => (e: any) => {
    sectionYsMap.current[key] = animatedViewOffsetY.current + e.nativeEvent.layout.y;
  };

  return (
    <View style={styles.screen}>
      {/* Soft gradient background */}
      <LinearGradient
        colors={['#EDE9FE', '#F5F3FF', '#F0F4FF', '#F6F3FF']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Decorative orb blobs */}
      <View pointerEvents="none" style={styles.orbTop} />
      <View pointerEvents="none" style={styles.orbMid} />

      {/* ── Section tab bar — sticky above scroll ── */}
      <View style={styles.sectionTabCard}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionTabRow}
          style={{ flex: 1 }}
        >
          {sections.map((s, i) => (
            <React.Fragment key={s.key}>
              <TouchableOpacity
                style={styles.sectionTabItem}
                onPress={() => {
                  const y = sectionYsMap.current[s.key];
                  if (y !== undefined) formScrollRef.current?.scrollTo({ y: y - 10, animated: true });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionTabCircle, { backgroundColor: i === activeSection ? s.color : '#E8EDF3' }]}>
                  <Ionicons name={s.icon} size={13} color={i === activeSection ? '#fff' : '#94A3B8'} />
                </View>
                <Text style={[styles.sectionTabLabel, { color: i === activeSection ? s.color : '#94A3B8' }]} numberOfLines={1}>
                  {s.label}
                </Text>
              </TouchableOpacity>
              {i < sections.length - 1 && <View style={styles.sectionTabDash} />}
            </React.Fragment>
          ))}
        </ScrollView>
        <View style={styles.sectionTabCounter}>
          <Text style={styles.sectionTabCounterNum}>{activeSection + 1}</Text>
          <Text style={styles.sectionTabCounterOf}>/{sections.length}</Text>
        </View>
      </View>

      <ScrollView ref={formScrollRef} style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={handleDetailScroll} scrollEventThrottle={24}>

        {/* ── Hero poster ── */}
        <TouchableOpacity
          style={styles.heroWrap}
          activeOpacity={0.96}
          onPress={() => event.poster_url && setShowPoster(true)}
        >
          {event.poster_url ? (
            <Image source={{ uri: event.poster_url }} style={styles.poster} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#5B21B6', '#7C3AED', '#8B5CF6']}
              style={styles.poster}
              start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.82)']}
            style={styles.posterOverlay}
          >
            <View style={styles.heroBottom}>
              <Text style={[styles.heroTitle, { flex: 1 }]} numberOfLines={3}>{event.title}</Text>
              <TouchableOpacity style={styles.heroShareBtn} onPress={handleWhatsAppShare} activeOpacity={0.85}>
                <Ionicons name="logo-whatsapp" size={15} color="#fff" />
                <Text style={styles.heroShareText}>Share</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Quick-facts chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFacts}>
          <View style={[styles.factChip, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
            <Ionicons name="calendar-outline" size={13} color="#7C3AED" />
            <Text style={[styles.factChipText, { color: '#7C3AED' }]}>{fmtDate(event.date_start)}</Text>
          </View>
          {event.venue?.city && (
            <View style={[styles.factChip, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
              <Ionicons name="location-outline" size={13} color="#059669" />
              <Text style={[styles.factChipText, { color: '#059669' }]}>{event.venue.city}</Text>
            </View>
          )}
          {(event.companions ?? []).length > 0 && (
            <View style={[styles.factChip, { backgroundColor: '#CCFBF1', borderColor: '#5EEAD4' }]}>
              <Ionicons name="people-outline" size={13} color="#0D9488" />
              <Text style={[styles.factChipText, { color: '#0D9488' }]}>{event.companions!.length} companions</Text>
            </View>
          )}
          {event.travel?.flight_booked && (
            <View style={[styles.factChip, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
              <Ionicons name="airplane-outline" size={13} color="#7C3AED" />
              <Text style={[styles.factChipText, { color: '#7C3AED' }]}>Flight booked</Text>
            </View>
          )}
        </ScrollView>

        <Animated.View
          onLayout={(e) => { animatedViewOffsetY.current = e.nativeEvent.layout.y; }}
          style={[styles.innerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >


          {/* ── Event Details ── */}
          <View onLayout={trackY('details')}>
            <EventDetailsCard
              dateStart={event.date_start}
              dateEnd={event.date_end}
              delay={60}
            />
          </View>

          {/* ── Venue ── */}
          {v && (v.name || v.city) && (
            <View onLayout={trackY('venue')}>
              <Section icon="location-outline" bgGradient={['#D1FAE5', '#FAFAFA']} iconGradient={['#059669', '#16A34A']} emoji="📍" title="Venue" delay={100}>
                {/* Row 1: Venue Name | City */}
                <InfoRow2
                  left={{ label: 'Venue Name', value: v.name ?? '—', icon: 'business-outline', iconColor: '#059669' }}
                  right={{ label: 'City', value: `${v.city ?? '—'}${v.country ? ', ' + v.country : ''}`, icon: 'globe-outline', iconColor: '#059669' }}
                />
                {/* Row 2: Full-width address */}
                {v.address && <InfoRow label="Address" value={v.address} icon="navigate-outline" iconColor="#059669" last={!v.region} />}
                {v.region && <InfoRow label="Region" value={v.region} icon="map-outline" iconColor="#059669" last />}
              </Section>
            </View>
          )}

          {/* ── Organizer ── */}
          {o?.name && (
            <View onLayout={trackY('organizer')}>
            <Section icon="person-circle-outline" bgGradient={['#FEF3C7', '#FAFAFA']} iconGradient={['#D97706', '#F59E0B']} emoji="👤" title="Organizer" delay={140}>
              <View style={styles.organizerRow}>
                <LinearGradient colors={['#FEF9C3', '#FDE68A']} style={styles.organizerAvatar}>
                  <Text style={styles.organizerAvatarText}>{o.name[0]?.toUpperCase() ?? '?'}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.organizerName}>{o.name}</Text>
                  {o.phone && <Text style={styles.organizerContact}>{o.phone}</Text>}
                  {o.email && <Text style={styles.organizerContact}>{o.email}</Text>}
                </View>
              </View>
              {o.phone && (
                <View style={styles.contactBtns}>
                  <TouchableOpacity
                    style={[styles.contactBtn, { borderColor: '#FDE68A' }]}
                    onPress={() => Linking.openURL(`tel:${o.phone}`)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={styles.contactBtnInner}>
                      <Ionicons name="call-outline" size={12} color="#D97706" />
                      <Text style={[styles.contactBtnText, { color: '#D97706' }]}>Call</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, { borderColor: '#86EFAC' }]}
                    onPress={() => Linking.openURL(`whatsapp://send?phone=${o.phone}`)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.contactBtnInner}>
                      <Ionicons name="logo-whatsapp" size={12} color="#16A34A" />
                      <Text style={[styles.contactBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </Section>
            </View>
          )}

          {/* ── Travel ── */}
          <View onLayout={trackY('travel')}>
          <Section icon="airplane-outline" bgGradient={['#EDE9FE', '#FAFAFA']} iconGradient={['#7C3AED', '#6D28D9']} emoji="✈️" title="Travel" delay={180}>
            <Text style={styles.travelSubLabel}>Outbound Flight</Text>
            {t?.flight_booked ? (
              <FlightCard
                color1="#7C3AED"
                color2="#6D28D9"
                status="Ticket Confirmed"
                airline={t.airline}
                flightNumber={t.flight_number}
                from={t.boarding_point}
                to={t.deboarding_point}
                departure={t.departure_time ? fmt(t.departure_time) : undefined}
                checkin={t.checkin_time ? fmt(t.checkin_time) : undefined}
                arrival={t.arrival_time ? fmt(t.arrival_time) : undefined}
                pdfUrl={t.flight_ticket_url ?? undefined}
                pdfColor="#7C3AED"
              />
            ) : (
              <NotBooked label="Flight not booked yet" />
            )}
            <View style={styles.travelDivider} />
            <Text style={styles.travelSubLabel}>Return Flight</Text>
            {t?.return_flight_booked ? (
              <FlightCard
                color1="#059669"
                color2="#16A34A"
                status="Ticket Confirmed"
                airline={t.return_airline}
                flightNumber={t.return_flight_number}
                from={t.return_boarding_point}
                to={t.return_deboarding_point}
                departure={t.return_departure_time ? fmt(t.return_departure_time) : undefined}
                checkin={t.return_checkin_time ? fmt(t.return_checkin_time) : undefined}
                arrival={t.return_arrival_time ? fmt(t.return_arrival_time) : undefined}
                pdfUrl={t.return_ticket_pdf_url ?? undefined}
                pdfColor="#059669"
                pdfLabel="View Return Ticket PDF"
              />
            ) : (
              <NotBooked label="Return flight not booked yet" />
            )}
          </Section>
          </View>

          {/* ── Accommodation ── */}
          {a?.hotel_name && (
            <View onLayout={trackY('stay')}>
            <Section icon="bed-outline" bgGradient={['#FFE4E6', '#FAFAFA']} iconGradient={['#E11D48', '#BE123C']} emoji="🏨" title="Accommodation" delay={260}>
              <InfoRow label="Hotel Name" value={a.hotel_name} icon="bed-outline" iconColor="#E11D48" last={!a.address && !a.check_in} />
              {a.address && <InfoRow label="Address" value={a.address} icon="location-outline" iconColor="#E11D48" last={!a.check_in} />}
              {(a.check_in || a.check_out) && (
                <InfoRow2
                  left={{ label: 'Check-in Date', value: fmtDate(a.check_in ?? ''), icon: 'log-in-outline', iconColor: '#E11D48' }}
                  right={a.check_out ? { label: 'Check-out Date', value: fmtDate(a.check_out), icon: 'log-out-outline', iconColor: '#E11D48' } : undefined}
                />
              )}
            </Section>
            </View>
          )}

          {/* ── Travel Companions ── */}
          {(event.companions ?? []).length > 0 && (
            <View onLayout={trackY('companions')}>
            <Section icon="people-outline" bgGradient={['#CCFBF1', '#FAFAFA']} iconGradient={['#0D9488', '#0F766E']} emoji="👥" title="Travel Companions" delay={300}>
              <View style={styles.companionList}>
                {(event.companions ?? []).map((name, i) => (
                  <View key={i} style={styles.companionChip}>
                    <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.companionAvatar}>
                      <Text style={styles.companionAvatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
                    </LinearGradient>
                    <Text style={styles.companionName}>{name}</Text>
                  </View>
                ))}
              </View>
            </Section>
            </View>
          )}

          {/* ── Others ── */}
          {(event.speaking_topic || event.expected_audience || event.timezone) && (
            <View onLayout={trackY('others')}>
            <Section icon="ellipsis-horizontal-circle-outline" bgGradient={['#E2E8F0', '#FAFAFA']} iconGradient={['#475569', '#334155']} emoji="⚙️" title="Others" delay={300}>
              {event.speaking_topic && (
                <InfoRow
                  label="Speaking Topic"
                  value={event.speaking_topic}
                  icon="mic-outline"
                  iconColor="#475569"
                  last={!event.expected_audience && !event.timezone}
                />
              )}
              {(event.expected_audience || event.timezone) && (
                <InfoRow2
                  left={event.expected_audience
                    ? { label: 'Expected Audience', value: `~${event.expected_audience} people`, icon: 'people-outline', iconColor: '#475569' }
                    : { label: 'Timezone', value: event.timezone ?? '', icon: 'time-outline', iconColor: '#475569' }}
                  right={event.expected_audience && event.timezone
                    ? { label: 'Timezone', value: event.timezone, icon: 'time-outline', iconColor: '#475569' }
                    : undefined}
                />
              )}
            </Section>
            </View>
          )}

          {/* ── Notes ── */}
          <View onLayout={trackY('notes')}>
          <Section icon="document-text-outline" bgGradient={['#EEE8FF', '#FAFAFA']} iconGradient={['#7C3AED', '#9333EA']} emoji="📝" title="Notes" delay={380}>
            {notes.length === 0 && <Text style={styles.emptyText}>No notes yet</Text>}
            {notes.filter(n => n.type === 'text').map((note) => (
              <View key={note.id} style={styles.noteItem}>
                <Text style={styles.noteContent}>{note.content}</Text>
                <Text style={styles.noteMeta}>{new Date(note.created_at).toLocaleString()}</Text>
              </View>
            ))}
            {isAssistant && (
            <View style={styles.noteInput}>
              <Text style={styles.inputLabel}>Add note</Text>
              <View style={styles.noteRow}>
                <View style={styles.textInputWrap}>
                  <NoteTextInput value={noteText} onChange={setNoteText} />
                </View>
                <TouchableOpacity style={styles.sendBtn} onPress={handleAddNote} activeOpacity={0.85}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.sendBtnGrad}>
                    <Ionicons name="send" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
            )}
          </Section>
          </View>

          {/* ── Tasks ── */}
          {isAssistant && (
            <View onLayout={trackY('tasks')}>
            <Section icon="checkmark-circle-outline" bgGradient={['#D1FAE5', '#FAFAFA']} iconGradient={['#059669', '#16A34A']} emoji="✅" title="Tasks" delay={460}>
              {tasks.map((task) => (
                <TouchableOpacity key={task.id} style={styles.taskItem} onPress={() => handleToggleTask(task)} activeOpacity={0.75}>
                  <Ionicons
                    name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={task.completed ? colors.success : colors.inactive}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, task.completed && styles.taskCompleted]}>{task.title}</Text>
                    {task.due_date && <Text style={styles.taskDue}>{fmtDate(task.due_date)}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
              <View style={[styles.noteRow, { marginTop: 10 }]}>
                <View style={styles.textInputWrap}>
                  <NoteTextInput value={newTaskTitle} onChange={setNewTaskTitle} placeholder="Add new task…" />
                </View>
                <TouchableOpacity style={styles.sendBtn} onPress={handleAddTask} activeOpacity={0.85}>
                  <LinearGradient colors={[colors.success, '#15803D']} style={styles.sendBtnGrad}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Section>
            </View>
          )}

          {isAssistant && (
            <TouchableOpacity style={styles.deleteBottomBtn} onPress={handleDelete} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteBottomText}>Delete Event</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* ── Full-screen poster viewer ── */}
      {event.poster_url && (
        <Modal visible={showPoster} transparent animationType="fade" onRequestClose={() => setShowPoster(false)}>
          <TouchableOpacity
            style={styles.posterModal}
            activeOpacity={1}
            onPress={() => setShowPoster(false)}
          >
            <Image source={{ uri: event.poster_url }} style={styles.posterFull} resizeMode="contain" />
            <View style={styles.posterModalClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

// ── Section card — matches EventDetailsCard layout ──
function Section({
  icon, bgGradient, iconGradient, emoji, title, delay = 0, children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  bgGradient: [string, string];
  iconGradient: [string, string];
  emoji: string;
  title: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[edc.shadow, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
      <LinearGradient
        colors={['#F8F8FC', bgGradient[0]] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={edc.card}
      >
        <View style={edc.headerRow}>
          <LinearGradient colors={iconGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={edc.iconCircle}>
            <Ionicons name={icon} size={15} color="#fff" />
          </LinearGradient>
          <LinearGradient
            colors={iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={edc.titlePill}
          >
            <Text style={edc.titlePillText}>{title}</Text>
          </LinearGradient>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        <View>{children}</View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Premium Event Details card ──
function EventDetailsCard({
  dateStart, dateEnd, delay = 0,
}: {
  dateStart: string; dateEnd?: string | null; delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, []);

  const split = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  };

  const start = split(dateStart);
  const end = dateEnd ? split(dateEnd) : null;

  return (
    <Animated.View style={[edc.shadow, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
      <LinearGradient colors={['#F8F8FC', '#EFEFFC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={edc.card}>
        {/* Header row */}
        <View style={edc.headerRow}>
          <LinearGradient colors={['#7B2FF7', '#5D0EFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={edc.iconCircle}>
            <Ionicons name="calendar-outline" size={15} color="#fff" />
          </LinearGradient>
          <LinearGradient
            colors={['#7B2FF7', '#5D0EFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={edc.titlePill}
          >
            <Text style={edc.titlePillText}>Event & Details</Text>
          </LinearGradient>
          <EventDateBadge iso={dateStart} />
        </View>

        <View style={edc.colsRow}>
          <View style={edc.col}>
            <View style={edc.colHeaderRow}>
              <View style={edc.colIconWrap}>
                <Ionicons name="play-circle-outline" size={10} color="#7B2FF7" />
              </View>
              <Text style={edc.colLabel}>Event Start Date</Text>
            </View>
            <Text style={edc.colDate}>{start.date}</Text>
            <Text style={edc.colTime}>{start.time}</Text>
          </View>
          <View style={edc.vDivider} />
          {end ? (
            <View style={edc.col}>
              <View style={edc.colHeaderRow}>
                <View style={edc.colIconWrap}>
                  <Ionicons name="stop-circle-outline" size={10} color="#7B2FF7" />
                </View>
                <Text style={edc.colLabel}>Event End Date</Text>
              </View>
              <Text style={edc.colDate}>{end.date}</Text>
              <Text style={edc.colTime}>{end.time}</Text>
            </View>
          ) : (
            <View style={[edc.col, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={[edc.colLabel, { textAlign: 'center', marginBottom: 6 }]}>End Date</Text>
              <Text style={{ fontSize: 14, color: '#D1D5DB', fontWeight: '700' }}>—</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Event date badge (orange/red gradient) ──
function EventDateBadge({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <View style={edb.wrap}>
      <LinearGradient colors={['#FB923C', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={edb.top}>
        <Text style={edb.month}>{d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
      </LinearGradient>
      <Text style={edb.day}>{d.getDate()}</Text>
    </View>
  );
}

const edc = StyleSheet.create({
  shadow: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  card: { borderRadius: 20, padding: 14, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconCircle: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7B2FF7', shadowOpacity: 0.28, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  title: { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1 },
  titlePill: {
    flex: 1, borderRadius: 18, justifyContent: 'center',
    paddingHorizontal: 12, height: 34,
  },
  titlePillText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.1 },
  colsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  col: { flex: 1, gap: 3 },
  colLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  colDate: { fontSize: 15, fontWeight: '800', color: '#111827', lineHeight: 20, letterSpacing: -0.3 },
  colTime: { fontSize: 13, fontWeight: '700', color: '#7B2FF7', marginTop: 1 },
  vDivider: { width: 1, height: 46, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  topicRow: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(229,231,235,0.8)',
  },
  colHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  colIconWrap: {
    width: 20, height: 20, borderRadius: 6,
    backgroundColor: '#7B2FF722',
    justifyContent: 'center', alignItems: 'center',
  },
  topicLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  topicLabel: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.7,
  },
  topicValue: { fontSize: 12, fontWeight: '600', color: '#111827', lineHeight: 17 },
});

const edb = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', width: 34,
    shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  top: { alignItems: 'center', paddingVertical: 3 },
  month: { color: '#fff', fontSize: 7, fontWeight: '800', letterSpacing: 1.0 },
  day: { fontSize: 20, fontWeight: '900', color: '#111827', textAlign: 'center', paddingVertical: 4 },
});

// ── Premium flight card ──
function FlightCard({
  color1, color2, status, airline, flightNumber,
  from, to, departure, checkin, arrival, pdfUrl, pdfColor, pdfLabel,
}: {
  color1: string; color2: string; status: string;
  airline?: string | null; flightNumber?: string | null;
  from?: string | null; to?: string | null;
  departure?: string; checkin?: string; arrival?: string;
  pdfUrl?: string; pdfColor: string; pdfLabel?: string;
}) {
  return (
    <View style={fc.ticket}>
      <LinearGradient colors={[color1, color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fc.header}>
        <View style={fc.headerTop}>
          <View style={fc.statusPill}>
            <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={fc.statusText}>{status}</Text>
          </View>
          {(airline || flightNumber) && (
            <Text style={fc.flightNum}>{[airline, flightNumber].filter(Boolean).join(' · ')}</Text>
          )}
        </View>
        {(from || to) && (
          <View style={fc.headerRoute}>
            <Text style={fc.headerFrom}>{from ?? '—'}</Text>
            <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={fc.headerTo}>{to ?? '—'}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={fc.body}>
        {/* Route row */}
        <View style={fc.route}>
          <View style={fc.airport}>
            <Text style={fc.code}>{from ?? '—'}</Text>
            <Text style={fc.codeLabel}>From</Text>
          </View>
          <View style={fc.routeMid}>
            <View style={fc.dot} />
            <View style={fc.dash} />
            <Ionicons name="airplane" size={20} color={color1} />
            <View style={fc.dash} />
            <View style={fc.dot} />
          </View>
          <View style={[fc.airport, { alignItems: 'flex-end' }]}>
            <Text style={fc.code}>{to ?? '—'}</Text>
            <Text style={fc.codeLabel}>To</Text>
          </View>
        </View>

        {/* Time rows */}
        {(departure || checkin || arrival) && (
          <View style={fc.times}>
            {departure && (
              <View style={fc.timeRow}>
                <View style={fc.timeLabelRow}>
                  <View style={[fc.timeIconWrap, { backgroundColor: color1 + '22' }]}>
                    <Ionicons name="send-outline" size={8} color={color1} />
                  </View>
                  <Text style={fc.timeLabel}>Departure</Text>
                </View>
                <Text style={fc.timeValue}>{departure}</Text>
              </View>
            )}
            {checkin && (
              <View style={fc.timeRow}>
                <View style={fc.timeLabelRow}>
                  <View style={[fc.timeIconWrap, { backgroundColor: color1 + '22' }]}>
                    <Ionicons name="time-outline" size={8} color={color1} />
                  </View>
                  <Text style={fc.timeLabel}>Check-in</Text>
                </View>
                <Text style={fc.timeValue}>{checkin}</Text>
              </View>
            )}
            {arrival && (
              <View style={fc.timeRow}>
                <View style={fc.timeLabelRow}>
                  <View style={[fc.timeIconWrap, { backgroundColor: color1 + '22' }]}>
                    <Ionicons name="flag-outline" size={8} color={color1} />
                  </View>
                  <Text style={fc.timeLabel}>Arrival</Text>
                </View>
                <Text style={fc.timeValue}>{arrival}</Text>
              </View>
            )}
          </View>
        )}

        {pdfUrl && (
          <TouchableOpacity style={fc.pdfBtn} onPress={() => Linking.openURL(pdfUrl!)} activeOpacity={0.85}>
            <Ionicons name="document-text-outline" size={15} color={pdfColor} />
            <Text style={[fc.pdfText, { color: pdfColor }]}>{pdfLabel ?? 'View Ticket PDF'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const fc = StyleSheet.create({
  ticket: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EDE9FE' },
  header: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRow: { gap: 4 },
  headerRoute: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerFrom: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerTo: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700' },
  flightNum: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  body: { backgroundColor: '#fff', padding: 12, gap: 10 },
  route: { flexDirection: 'row', alignItems: 'center' },
  airport: { flex: 1, alignItems: 'flex-start' },
  code: { fontSize: 19, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  codeLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  routeMid: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DDD6FE' },
  dash: { flex: 1, height: 1.5, backgroundColor: '#DDD6FE' },
  times: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, gap: 6, borderWidth: 1, borderColor: '#E9ECF1' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeIconWrap: { width: 16, height: 16, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  timeLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  timeValue: { fontSize: 13, color: '#111827', fontWeight: '800' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  pdfText: { fontWeight: '600', fontSize: 13 },
});

// ── Not booked placeholder ──
function NotBooked({ label }: { label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="time-outline" size={26} color="#D97706" />
      </View>
      <Text style={{ fontSize: 15, color: '#D97706', fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ── Vertical info row ──
function InfoRow({ label, value, valueStyle, last, icon, iconColor }: {
  label: string; value: string; valueStyle?: object; last?: boolean;
  icon?: keyof typeof Ionicons.glyphMap; iconColor?: string;
}) {
  return (
    <View style={[inf.row, last && { borderBottomWidth: 0, paddingBottom: 4 }]}>
      <View style={inf.rowInner}>
        {icon && (
          <View style={[inf.iconWrap, { backgroundColor: (iconColor ?? '#94A3B8') + '22' }]}>
            <Ionicons name={icon} size={11} color={iconColor ?? '#94A3B8'} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={inf.label}>{label}</Text>
          <Text style={[inf.value, valueStyle]}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Two-column info row ──
function InfoRow2({ left, right }: {
  left: { label: string; value: string; valueStyle?: object; icon?: keyof typeof Ionicons.glyphMap; iconColor?: string };
  right?: { label: string; value: string; valueStyle?: object; icon?: keyof typeof Ionicons.glyphMap; iconColor?: string } | null;
}) {
  return (
    <View style={inf.twoRow}>
      <View style={inf.twoCard}>
        <View style={inf.cardHeader}>
          {left.icon && (
            <View style={[inf.iconWrap, { backgroundColor: (left.iconColor ?? '#94A3B8') + '22' }]}>
              <Ionicons name={left.icon} size={11} color={left.iconColor ?? '#94A3B8'} />
            </View>
          )}
          <Text style={inf.label}>{left.label}</Text>
        </View>
        <Text style={[inf.value, left.valueStyle]}>{left.value}</Text>
      </View>
      {right ? (
        <View style={inf.twoCard}>
          <View style={inf.cardHeader}>
            {right.icon && (
              <View style={[inf.iconWrap, { backgroundColor: (right.iconColor ?? '#94A3B8') + '22' }]}>
                <Ionicons name={right.icon} size={11} color={right.iconColor ?? '#94A3B8'} />
              </View>
            )}
            <Text style={inf.label}>{right.label}</Text>
          </View>
          <Text style={[inf.value, right.valueStyle]}>{right.value}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );
}

function NoteTextInput({ value, onChange, placeholder }: {
  value: string; onChange: (s: string) => void; placeholder?: string;
}) {
  return (
    <TextInput
      style={noteInputStyle.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? 'Write a note…'}
      placeholderTextColor={colors.inactive}
      multiline
    />
  );
}

// ── StyleSheets ──

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F3FF' },
  container: { flex: 1 },
  content: { paddingBottom: 32 },

  loadingWrap: { flex: 1 },
  loadingGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  orbTop: { position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: '#7C3AED14' },
  orbMid: { position: 'absolute', top: 380, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: '#8B5CF610' },

  // Hero
  heroWrap: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
  },
  poster: { width: '100%', height: 260 },
  posterOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 18, paddingBottom: 18,
  },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.4, lineHeight: 32 },
  heroShareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(37,211,102,0.92)',
    borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8,
    flexShrink: 0,
  },
  heroShareText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  posterModal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center', alignItems: 'center',
  },
  posterFull: { width: '100%', height: '85%' },
  posterModalClose: {
    position: 'absolute', top: 54, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick-facts
  quickFacts: { flexDirection: 'row', gap: 9, paddingHorizontal: 16, paddingVertical: 14 },
  factChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: radius.full, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  factChipText: { fontSize: 13, fontWeight: '700' },

  innerContent: { paddingHorizontal: 16, paddingBottom: 4, gap: 16 },

  // Approve / reject
  approvalBtns: { flexDirection: 'row', gap: 12 },
  approveBtn: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', ...shadow.md },
  rejectBtn: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', ...shadow.md },
  actionGrad: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 16 },
  approveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  rejectBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  resubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: 14,
    borderWidth: 1.5, borderColor: colors.primary + '55',
  },
  resubmitText: { color: colors.primary, fontWeight: '700', fontSize: 15 },

  // Venue map button

  // Organizer
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  organizerAvatar: { width: 66, height: 66, borderRadius: 33, justifyContent: 'center', alignItems: 'center' },
  organizerAvatarText: { fontSize: 28, fontWeight: '900', color: '#92400E' },
  organizerName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  organizerContact: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginTop: 3 },
  contactBtns: { flexDirection: 'row', gap: 8 },
  contactBtn: { flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  contactBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7 },
  contactBtnText: { fontSize: 11, fontWeight: '700' },

  // Companions
  companionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  companionChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDFA', borderRadius: radius.full, paddingRight: 14, paddingVertical: 5, borderWidth: 1, borderColor: '#CCFBF1' },
  companionAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  companionAvatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  companionName: { fontSize: 14, fontWeight: '600', color: '#0D9488' },

  // Delete button
  deleteBottomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.danger + '60', borderRadius: radius.lg,
    padding: 16, marginTop: 4, backgroundColor: '#FFF5F5',
  },
  deleteBottomText: { fontSize: 15, fontWeight: '700', color: colors.danger },

  emptyText: { color: colors.textTertiary, fontSize: 14, fontStyle: 'italic', paddingVertical: 8, textAlign: 'center' },

  // Notes
  noteItem: { backgroundColor: '#F8FAFF', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E0E9FF' },
  noteContent: { fontSize: 15, color: '#111827', lineHeight: 22 },
  noteMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 6 },
  voiceNote: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  voiceLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  voiceDuration: { fontSize: 12, color: colors.textTertiary },
  noteInput: { marginTop: 12, gap: 10 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 },
  noteRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  textInputWrap: { flex: 1 },
  sendBtn: { borderRadius: 21, overflow: 'hidden' },
  sendBtnGrad: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  recordBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary + '66', borderRadius: radius.lg, padding: 12, justifyContent: 'center' },
  recordBtnActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  recordBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  // Documents
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFF', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E0E9FF' },
  docIconWrap: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  docMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },

  // Travel
  travelSubLabel: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  travelDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },

  // Section tab bar
  sectionTabCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)', paddingVertical: 10, marginBottom: 4 },
  sectionTabRow: { paddingHorizontal: 8, gap: 0 },
  sectionTabItem: { alignItems: 'center', width: 66, paddingHorizontal: 3, gap: 4 },
  sectionTabCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  sectionTabLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  sectionTabDash: { width: 10, height: 2, backgroundColor: '#D1D5DB', borderRadius: 1, alignSelf: 'flex-start', marginTop: 15 },
  sectionTabCounter: { paddingHorizontal: 12, paddingVertical: 4, borderLeftWidth: 1, borderLeftColor: '#E2E8F0', minWidth: 44, alignItems: 'center' },
  sectionTabCounterNum: { fontSize: 15, fontWeight: '900', color: '#1E293B', lineHeight: 18 },
  sectionTabCounterOf: { fontSize: 9, fontWeight: '600', color: '#94A3B8' },

  // Tasks
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  taskTitle: { fontSize: 15, color: '#111827', fontWeight: '500' },
  taskCompleted: { textDecorationLine: 'line-through', color: colors.inactive },
  taskDue: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
});


const inf = StyleSheet.create({
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 26, height: 26, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  twoRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  twoCard: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: '#E9ECEF',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3,
  },
  value: { fontSize: 14, color: '#111827', fontWeight: '700', lineHeight: 20 },
});

const noteInputStyle = StyleSheet.create({
  input: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 12,
    fontSize: 14, color: colors.textPrimary,
    backgroundColor: '#FAFAFA', minHeight: 44,
  },
});
