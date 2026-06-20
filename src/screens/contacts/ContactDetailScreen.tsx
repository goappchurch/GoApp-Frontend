import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { showAlert } from '../../utils/alert';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { getContacts, createContact, updateContact, deleteContact } from '../../services/contacts';
import { Contact } from '../../types';
import { colors, shadow, radius } from '../../constants/theme';

type RouteProps = RouteProp<RootStackParamList, 'ContactDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ContactDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isAssistant = user?.role === 'assistant';
  const isEdit = !!route.params?.contactId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(!isEdit);

  const [form, setForm] = useState<Partial<Contact>>({
    full_name: '',
    church_name: '',
    phone: '',
    email: '',
    whatsapp: '',
    city: '',
    country: '',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) loadContact();
  }, []);

  const loadContact = async () => {
    try {
      const all = await getContacts();
      const c = all.find((x) => x.id === route.params!.contactId);
      if (c) setForm(c);
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof Contact, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.full_name?.trim()) { showAlert('Required', 'Name is required'); return; }
    if (!user) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateContact(route.params!.contactId!, form as Partial<Contact>);
      } else {
        await createContact(form as Omit<Contact, 'id' | 'created_at' | 'created_by'>, user.id);
      }
      navigation.goBack();
    } catch (e) {
      showAlert('Error', 'Could not save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    showAlert('Delete Contact', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteContact(route.params!.contactId!);
          navigation.goBack();
        }
      },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />;

  if (!isEditing && isEdit) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, shadow.sm]}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {(form.full_name ?? '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.viewName}>{form.full_name}</Text>
          {form.church_name && <Text style={styles.viewChurch}>{form.church_name}</Text>}

          {form.phone && (
            <TouchableOpacity style={styles.actionRow} onPress={() => Linking.openURL(`tel:${form.phone}`)}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={styles.actionText}>{form.phone}</Text>
            </TouchableOpacity>
          )}
          {form.whatsapp && (
            <TouchableOpacity style={styles.actionRow} onPress={() => Linking.openURL(`whatsapp://send?phone=${form.whatsapp}`)}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.actionText}>{form.whatsapp}</Text>
            </TouchableOpacity>
          )}
          {form.email && (
            <TouchableOpacity style={styles.actionRow} onPress={() => Linking.openURL(`mailto:${form.email}`)}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={styles.actionText}>{form.email}</Text>
            </TouchableOpacity>
          )}
          {(form.city || form.country) && (
            <View style={styles.actionRow}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionText}>{[form.city, form.country].filter(Boolean).join(', ')}</Text>
            </View>
          )}
          {form.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{form.notes}</Text>
            </View>
          )}
        </View>

        {isAssistant && (
          <View style={styles.btnsRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {([
        { key: 'full_name', label: 'Full Name *', kbType: 'default' },
        { key: 'church_name', label: 'Church / Organization', kbType: 'default' },
        { key: 'phone', label: 'Phone', kbType: 'phone-pad' },
        { key: 'email', label: 'Email', kbType: 'email-address' },
        { key: 'whatsapp', label: 'WhatsApp Number', kbType: 'phone-pad' },
        { key: 'city', label: 'City', kbType: 'default' },
        { key: 'country', label: 'Country', kbType: 'default' },
      ] as { key: keyof Contact; label: string; kbType: string }[]).map(({ key, label, kbType }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={styles.input}
            value={(form[key] as string) ?? ''}
            onChangeText={(v) => set(key, v)}
            placeholder={label.replace(' *', '')}
            placeholderTextColor={colors.inactive}
            keyboardType={kbType as any}
            autoCapitalize={kbType === 'email-address' ? 'none' : 'words'}
          />
        </View>
      ))}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={form.notes ?? ''}
          onChangeText={(v) => set('notes', v)}
          placeholder="Notes..."
          placeholderTextColor={colors.inactive}
          multiline
        />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Update Contact' : 'Save Contact'}</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 20, alignItems: 'center', gap: 8, marginBottom: 4 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarLargeText: { color: '#fff', fontWeight: '700', fontSize: 28 },
  viewName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  viewChurch: { fontSize: 15, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, width: '100%' },
  actionText: { fontSize: 15, color: colors.textPrimary },
  notesBox: { width: '100%', backgroundColor: colors.primaryLight, borderRadius: radius.sm, padding: 12, marginTop: 4 },
  notesLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  notesText: { fontSize: 14, color: colors.textPrimary },
  btnsRow: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.danger },
  deleteBtnText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  field: { marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 11, fontSize: 15, color: colors.textPrimary, backgroundColor: '#fff' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
