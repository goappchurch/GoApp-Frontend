import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';

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
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ContactDetailScreen from '../screens/contacts/ContactDetailScreen';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Flights: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EventDetail: { eventId: string };
  AddEditEvent: { eventId?: string } | undefined;
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
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen name="Calendar" component={CalendarScreen} />
      <MainTab.Screen name="Flights" component={FlightsScreen} />
      <MainTab.Screen name="Settings" component={SettingsScreen} />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAssistant = user?.role === 'assistant';

  if (isLoading) return null;

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
