import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/events';
import { useNotificationStore } from '../../store/notificationStore';
import { Notification } from '../../types';
import { colors, shadow, radius } from '../../constants/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { notifications, setNotifications, markRead, markAllRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) return;
    getNotifications(user.id)
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [user]);

  const handleMarkRead = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      markRead(n.id);
    }
    if (n.event_id) {
      navigation.navigate('EventDetail', { eventId: n.event_id });
    }
  };

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    markAllRead();
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {notifications.some((n) => !n.read) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, { paddingBottom: 12 + insets.bottom }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.inactive} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, shadow.sm, !item.read && styles.itemUnread]}
            onPress={() => handleMarkRead(item)}
          >
            <View style={[styles.dot, item.read && styles.dotRead]} />
            <View style={styles.itemBody}>
              <Text style={[styles.itemTitle, item.read && styles.itemTitleRead]}>{item.title}</Text>
              <Text style={styles.itemBody2}>{item.body}</Text>
              <Text style={styles.itemTime}>
                {new Date(item.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </View>
            {item.event_id && <Ionicons name="chevron-forward" size={16} color={colors.inactive} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  markAllBtn: { padding: 12, alignItems: 'flex-end', paddingHorizontal: 16 },
  markAllText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  list: { padding: 12, paddingTop: 4, gap: 8 },
  item: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemUnread: { backgroundColor: colors.primaryLight, borderLeftWidth: 3, borderLeftColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, alignSelf: 'flex-start', marginTop: 5 },
  dotRead: { backgroundColor: colors.inactive },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  itemTitleRead: { fontWeight: '500', color: colors.textSecondary },
  itemBody2: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  itemTime: { fontSize: 11, color: colors.inactive },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
