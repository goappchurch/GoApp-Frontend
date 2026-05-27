import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, shadow, radius } from '../../constants/theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const isBoss = user?.role === 'boss';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={[styles.profileCard, shadow.md]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user?.full_name ?? '?')}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name ?? 'Unknown'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <View style={[styles.roleBadge, isBoss ? styles.roleBoss : styles.roleAssistant]}>
            <Text style={[styles.roleText, isBoss ? styles.roleTextBoss : styles.roleTextAssistant]}>
              {isBoss ? 'Boss' : 'Assistant'}
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Preferences</Text>
          <View style={[styles.card, shadow.xs]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="notifications" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Push Notifications</Text>
                  <Text style={styles.rowSub}>Get alerts for new events & approvals</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>About</Text>
          <View style={[styles.card, shadow.xs]}>
            {[
              { icon: 'information-circle', color: '#EFF6FF', iconColor: colors.primary, label: 'App Version', value: '1.0.0' },
              { icon: 'server', color: '#F0FDF4', iconColor: colors.success, label: 'Backend', value: 'Supabase' },
              { icon: 'globe', color: '#FFF7ED', iconColor: colors.warning, label: 'Platform', value: 'GoAppChurch' },
            ].map((item, i, arr) => (
              <View key={item.label} style={[styles.row, i < arr.length - 1 && styles.rowBorder]}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                  </View>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                </View>
                <Text style={styles.rowValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={[styles.logoutBtn, shadow.sm]} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  content: { padding: 16, gap: 8, paddingBottom: 40 },

  profileCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  roleBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  roleBoss: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleAssistant: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleText: { fontSize: 12, fontWeight: '700' },
  roleTextBoss: { color: '#fff' },
  roleTextAssistant: { color: '#fff' },

  group: { marginBottom: 4 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  rowValue: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 15,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.dangerLight,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
