import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { getContacts } from '../../services/contacts';
import { Contact } from '../../types';
import { colors, shadow, radius } from '../../constants/theme';
import { getLoadingVerse } from '../../constants/verses';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Unique colors per alphabet letter so each contact has a consistent avatar color
const AVATAR_PALETTE = [
  '#1A56DB', '#7C3AED', '#E11D48', '#D97706',
  '#16A34A', '#0891B2', '#DC2626', '#9333EA',
  '#EA580C', '#0284C7', '#65A30D', '#DB2777',
];

function avatarColor(name: string) {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// Group contacts alphabetically for SectionList
function toSections(contacts: Contact[]) {
  const map = new Map<string, Contact[]>();
  for (const c of contacts) {
    const letter = c.full_name[0]?.toUpperCase() ?? '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(c);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({
      title,
      data: data.sort((a, b) => a.full_name.localeCompare(b.full_name)),
    }));
}

export default function ContactsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isAssistant = user?.role === 'assistant';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setContacts(await getContacts());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadContacts(); }, [loadContacts]));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.church_name ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q),
    );
  }, [contacts, search]);

  const sections = useMemo(() => toSections(filtered), [filtered]);

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const openWhatsApp = (wa: string) => {
    const number = wa.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${number}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Contacts</Text>
          {!loading && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filtered.length}</Text>
            </View>
          )}
        </View>
        {isAssistant && (
          <TouchableOpacity
            style={[styles.addBtn, shadow.sm]}
            onPress={() => navigation.navigate('ContactDetail', {})}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, church, city…"
            placeholderTextColor={colors.inactive}
            returnKeyType="search"
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={colors.inactive} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── LIST ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{getLoadingVerse()}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(c) => c.id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'No results found' : 'No contacts yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No contacts match "${search}"`
                  : isAssistant
                  ? 'Tap Add to create your first contact'
                  : 'No contacts have been added yet'}
              </Text>
            </View>
          }
          renderSectionHeader={({ section: { title, data } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLetter}>{title}</Text>
              <Text style={styles.sectionCount}>{data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
              onCall={item.phone ? () => callPhone(item.phone!) : undefined}
              onWhatsApp={item.whatsapp ? () => openWhatsApp(item.whatsapp!) : undefined}
            />
          )}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── ContactCard ───────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onPress,
  onCall,
  onWhatsApp,
}: {
  contact: Contact;
  onPress: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
}) {
  const color = avatarColor(contact.full_name);

  return (
    <TouchableOpacity style={[styles.card, shadow.xs]} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials(contact.full_name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{contact.full_name}</Text>
        {contact.church_name && (
          <View style={styles.cardMetaRow}>
            <Ionicons name="business-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.cardMetaText} numberOfLines={1}>{contact.church_name}</Text>
          </View>
        )}
        {contact.city && (
          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.cardMetaText}>
              {contact.city}{contact.country ? `, ${contact.country}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.cardActions}>
        {onCall && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.successLight }]}
            onPress={(e) => { e.stopPropagation(); onCall(); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="call" size={15} color={colors.success} />
          </TouchableOpacity>
        )}
        {onWhatsApp && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}
            onPress={(e) => { e.stopPropagation(); onWhatsApp(); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.inactive} />
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Search
  searchWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 60 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },

  listContent: { padding: 12, paddingBottom: 100 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  sectionLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },

  // Contact card
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: -0.3 },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
});
