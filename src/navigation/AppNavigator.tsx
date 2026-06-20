import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, gradients } from '../constants/theme';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import FlightsScreen from '../screens/flights/FlightsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import AddEditEventScreen from '../screens/events/AddEditEventScreen';
import EventsListScreen from '../screens/events/EventsListScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ContactDetailScreen from '../screens/contacts/ContactDetailScreen';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Events: { filterToday?: boolean } | undefined;
  Flights: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  EventDetail: { eventId: string };
  AddEditEvent: { eventId?: string; defaultDate?: string; duplicateFromId?: string } | undefined;
  Notifications: undefined;
  ContactDetail: { contactId?: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { user } = useAuth();
  const isAssistant = user?.role === 'assistant';
  const { bottom: bottomInset } = useSafeAreaInsets();
  // Floor the bottom padding so labels never clip behind the system
  // nav/gesture bar in production builds, where the inset can resolve to 0.
  const tabBottomPad = Math.max(bottomInset, 10);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Settings') {
            return (
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: focused ? colors.primary : colors.primaryLight,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{
                  color: focused ? '#fff' : colors.primary,
                  fontSize: 11, fontWeight: '800',
                }}>
                  {initials(user?.full_name ?? '?')}
                </Text>
              </View>
            );
          }
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'home' : 'home-outline',
            Calendar: focused ? 'calendar' : 'calendar-outline',
            Events: focused ? 'list' : 'list-outline',
            Flights: focused ? 'airplane' : 'airplane-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'help'} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + tabBottomPad,
          paddingBottom: tabBottomPad,
          paddingTop: 8,
          backgroundColor: '#fff',
        },
        tabBarSafeAreaInsets: { bottom: 0 },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 1,
        },
      })}
    >
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen name="Calendar" component={CalendarScreen} />
      <MainTab.Screen name="Events" component={EventsListScreen} />
      <MainTab.Screen name="Flights" component={FlightsScreen} />
      <MainTab.Screen name="Settings" component={SettingsScreen} />
    </MainTab.Navigator>
  );
}

const VERSES = [
  { text: 'Go into all the world and preach the gospel to every creature.', ref: 'Mark 16:15' },
  { text: 'The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.', ref: 'Numbers 6:24–25' },
  { text: 'Blessed is the one who trusts in the Lord, whose confidence is in him.', ref: 'Jeremiah 17:7' },
  { text: 'I will bless you and you will be a blessing.', ref: 'Genesis 12:2' },
  { text: 'Blessed are the pure in heart, for they will see God.', ref: 'Matthew 5:8' },
  { text: 'The blessing of the Lord brings wealth, without painful toil for it.', ref: 'Proverbs 10:22' },
  { text: 'Blessed is the man who walks not in the counsel of the wicked.', ref: 'Psalm 1:1' },
  { text: 'How beautiful are the feet of those who bring good news!', ref: 'Romans 10:15' },
  { text: 'Blessed are those who hear the word of God and obey it.', ref: 'Luke 11:28' },
  { text: 'The Lord your God will bless you in all your work and in everything you put your hand to.', ref: 'Deuteronomy 15:10' },
];

function LoadingScreen() {
  const [index] = useState(() => Math.floor(Math.random() * VERSES.length));
  const verse = VERSES[index];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 8, bounciness: 2, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={gradients.headerFade}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={loadingStyles.container}
    >
      <View style={loadingStyles.orb1} />
      <View style={loadingStyles.orb2} />

      <Animated.View style={[loadingStyles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={loadingStyles.appName}>GraceLink</Text>

        <View style={loadingStyles.verseCard}>
          <Text style={loadingStyles.quoteChar}>"</Text>
          <Text style={loadingStyles.verseText}>{verse.text}</Text>
          <Text style={loadingStyles.verseRef}>{verse.ref}</Text>
        </View>

        <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={{ marginTop: 40 }} />
      </Animated.View>
    </LinearGradient>
  );
}

const loadingStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  orb1: {
    position: 'absolute', top: -80, right: -100,
    width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(199,210,254,0.16)',
  },
  orb2: {
    position: 'absolute', bottom: -60, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(165,180,252,0.12)',
  },
  content: { alignItems: 'center', paddingHorizontal: 36 },
  appName: {
    fontSize: 36, fontWeight: '900', color: '#fff',
    letterSpacing: -1, marginBottom: 48,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    gap: 12,
  },
  quoteChar: {
    fontSize: 52, fontWeight: '900', color: 'rgba(255,255,255,0.25)',
    lineHeight: 44, alignSelf: 'flex-start', marginBottom: -8,
  },
  verseText: {
    fontSize: 16, fontWeight: '500', color: '#fff',
    textAlign: 'center', lineHeight: 26,
    letterSpacing: 0.1,
  },
  verseRef: {
    fontSize: 13, fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5, marginTop: 4,
  },
});

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAssistant = user?.role === 'assistant';

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="Main" component={MainNavigator} />
            <RootStack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{ headerShown: true, title: 'Event', headerBackTitle: 'Back' }}
            />
            <RootStack.Screen
              name="AddEditEvent"
              component={AddEditEventScreen}
              options={{ headerShown: true, title: 'Event', headerBackTitle: 'Back', presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: true, title: 'Notifications', headerBackTitle: 'Back' }}
            />
            <RootStack.Screen
              name="ContactDetail"
              component={ContactDetailScreen}
              options={{ headerShown: true, title: 'Contact', headerBackTitle: 'Back', presentation: 'modal' }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
