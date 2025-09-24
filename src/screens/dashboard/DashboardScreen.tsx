import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, EventsStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, Event } from '../../services/api';

type DashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<EventsStackParamList>
>;

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<DashboardNavigationProp>();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    travel: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [upcomingResponse, allEventsResponse] = await Promise.all([
        apiService.getUpcomingEvents(2),
        apiService.getEvents({ limit: 50 })
      ]);

      console.log('Dashboard - Upcoming events count:', upcomingResponse.events?.length || 0);
      console.log('Dashboard - All events count:', allEventsResponse.events?.length || 0);
      console.log('Dashboard - Upcoming events data:', JSON.stringify(upcomingResponse.events, null, 2));
      console.log('Dashboard - First 3 all events:', JSON.stringify(allEventsResponse.events?.slice(0, 3), null, 2));

      // Check poster URLs
      upcomingResponse.events?.forEach((event, index) => {
        console.log(`Dashboard - Event ${index + 1} poster URL:`, event.eventPosterUrl);
      });

      setUpcomingEvents(upcomingResponse.events);

      // If no upcoming events, show recent events as fallback
      if (upcomingResponse.events.length === 0) {
        const sortedRecentEvents = allEventsResponse.events
          .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime())
          .slice(0, 3);
        setRecentEvents(sortedRecentEvents);
        console.log('Dashboard - Using recent events as fallback:', sortedRecentEvents.length);
      } else {
        setRecentEvents([]);
      }

      // Calculate stats
      const completedCount = allEventsResponse.events.filter(e => e.status === 'completed').length;
      const travelCount = allEventsResponse.events.filter(e => e.venueName && !e.venueName.toLowerCase().includes('local')).length;

      setStats({
        upcoming: upcomingResponse.events.length,
        completed: completedCount,
        travel: travelCount
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = () => {
    // Navigate to Events tab first, then to CreateEvent screen
    // @ts-ignore - Navigation to nested screen in tab navigator
    navigation.navigate('Events', {
      screen: 'CreateEvent'
    });
  };

  const handleViewEvent = (eventId: string) => {
    // Navigate to Events tab first, then to EventDetail screen
    // @ts-ignore - Navigation to nested screen in tab navigator
    navigation.navigate('Events', {
      screen: 'EventDetail',
      params: { eventId }
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString('en-US', { month: 'short' })
    };
  };

  const formatEventTime = (startDateTime: string, endDateTime: string) => {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return styles.statusConfirmed;
      case 'draft':
        return styles.statusDraft;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDraft;
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</Text>
          <Text style={styles.roleText}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color="#2563eb" />
            </View>
            <Text style={styles.statNumber}>{isLoading ? '-' : stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming Events</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
            </View>
            <Text style={styles.statNumber}>{isLoading ? '-' : stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <TouchableOpacity
            style={[styles.statCard, styles.createEventCard]}
            onPress={handleCreateEvent}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="add-circle" size={24} color="#fff" />
            </View>
            <Text style={[styles.statNumber, styles.createEventNumber]}>+</Text>
            <Text style={[styles.statLabel, styles.createEventLabel]}>Create Event</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="document-text" size={28} color="#fff" />
                <Text style={styles.actionText}>Add Document</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="mic" size={28} color="#fff" />
                <Text style={styles.actionText}>Voice Note</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="airplane" size={28} color="#fff" />
                <Text style={styles.actionText}>Travel Plans</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Next Upcoming Events - Most Important Section */}
        <View style={[styles.section, styles.featuredSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.featuredSectionTitle}>
              {upcomingEvents.length > 0 ? '🗓️ Next Upcoming Events' : '📅 Recent Events'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {upcomingEvents.length > 0
                ? 'Your most important upcoming commitments'
                : 'Your recent events (no upcoming events scheduled)'}
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading your events...</Text>
            </View>
          ) : upcomingEvents.length > 0 || recentEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {(upcomingEvents.length > 0 ? upcomingEvents : recentEvents).map((event, index) => {
                const eventDate = formatEventDate(event.startDatetime);
                const isUpcoming = upcomingEvents.length > 0;
                const venueName = event.venueName || 'Venue TBD';
                const venueAddress = event.venueAddress || '';
                const fullVenue = `${venueName}${venueAddress ? ', ' + venueAddress : ''}`;

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.newEventItem,
                      isUpcoming && index === 0 && styles.nextEventHighlight
                    ]}
                    onPress={() => handleViewEvent(event.id)}
                  >
                    {/* Event Poster */}
                    <TouchableOpacity
                      style={styles.posterContainer}
                      onPress={() => setSelectedPoster(event.eventPosterUrl || null)}
                    >
                      {event.eventPosterUrl ? (
                        <Image
                          source={{ uri: event.eventPosterUrl }}
                          style={styles.posterImage}
                          resizeMode="cover"
                          onError={(error) => console.log('Dashboard - Image load error:', error)}
                          onLoad={() => console.log('Dashboard - Image loaded successfully:', event.eventPosterUrl)}
                        />
                      ) : (
                        <View style={styles.posterPlaceholder}>
                          <Ionicons name="image" size={24} color="#94a3b8" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Event Details */}
                    <View style={styles.newEventDetails}>
                      <View style={styles.eventHeader}>
                        <Text style={[
                          styles.newEventTitle,
                          isUpcoming && index === 0 && styles.nextEventTitle
                        ]}>{event.title}</Text>
                        <View style={[styles.statusBadge, getStatusStyle(event.status)]}>
                          <Text style={styles.statusText}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.eventInfoRow}>
                        <Ionicons name="location" size={14} color="#64748b" />
                        <Text style={styles.eventInfoText}>{fullVenue}</Text>
                      </View>

                      <View style={styles.eventInfoRow}>
                        <Ionicons name="calendar" size={14} color="#64748b" />
                        <Text style={styles.eventInfoText}>
                          {eventDate.day} {eventDate.month} • {formatEventTime(event.startDatetime, event.endDatetime)}
                        </Text>
                      </View>

                      {event.speakingTopic && (
                        <View style={styles.eventInfoRow}>
                          <Ionicons name="mic" size={14} color="#64748b" />
                          <Text style={styles.eventInfoText}>{event.speakingTopic}</Text>
                        </View>
                      )}

                      {/* Travel Status */}
                      <View style={styles.travelStatusContainer}>
                        {event.flightBookingRequired && (
                          <View style={styles.travelStatusItem}>
                            <Ionicons name="airplane" size={12} color="#2563eb" />
                            <Text style={[
                              styles.travelStatusText,
                              { color: event.flightBookingStatus === 'confirmed' ? '#059669' : '#f59e0b' }
                            ]}>
                              Flight: {event.flightBookingStatus || 'Not booked'}
                            </Text>
                          </View>
                        )}

                        {event.hotelBookingRequired && (
                          <View style={styles.travelStatusItem}>
                            <Ionicons name="bed" size={12} color="#2563eb" />
                            <Text style={[
                              styles.travelStatusText,
                              { color: event.hotelBookingStatus === 'confirmed' ? '#059669' : '#f59e0b' }
                            ]}>
                              Hotel: {event.hotelBookingStatus || 'Not booked'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {isUpcoming && index === 0 && (
                        <View style={styles.nextEventBadge}>
                          <Text style={styles.nextEventLabel}>NEXT EVENT</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No upcoming events</Text>
              <Text style={styles.emptyStateSubtext}>Create your first event to get started</Text>
            </View>
          )}
        </View>

        {/* Travel Updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Updates</Text>
          <View style={styles.travelCard}>
            <Ionicons name="airplane" size={24} color="#2563eb" />
            <View style={styles.travelInfo}>
              <Text style={styles.travelTitle}>Upcoming Trip to Bangalore</Text>
              <Text style={styles.travelDetails}>Flight: AI 234 • Jan 21, 2:30 PM</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Poster Modal */}
      <Modal
        visible={selectedPoster !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPoster(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setSelectedPoster(null)}
          >
            <View style={styles.modalContent}>
              {selectedPoster ? (
                <Image
                  source={{ uri: selectedPoster }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.modalPlaceholder}>
                  <Ionicons name="image" size={64} color="#94a3b8" />
                  <Text style={styles.modalPlaceholderText}>No poster available</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedPoster(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickActionsContainer: {
    backgroundColor: '#2563eb',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  eventsList: {
    paddingHorizontal: 0,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventDate: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    marginRight: 16,
  },
  eventDateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  eventDateMonth: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  eventStatus: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConfirmed: {
    backgroundColor: '#d1fae5',
  },
  statusDraft: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  featuredSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  featuredSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  nextEventHighlight: {
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  nextEventDateDay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  nextEventDateMonth: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  nextEventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  nextEventLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 4,
    textAlign: 'center',
  },
  eventTopic: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  createEventCard: {
    backgroundColor: '#2563eb',
  },
  createEventNumber: {
    color: '#fff',
  },
  createEventLabel: {
    color: '#fff',
  },
  featuredActionButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  featuredActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  featuredActionText: {
    flex: 1,
    marginLeft: 16,
  },
  featuredActionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  featuredActionSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    opacity: 0.9,
  },
  travelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  travelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  travelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  travelDetails: {
    fontSize: 14,
    color: '#64748b',
  },
  // New event item styles
  newEventItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  posterContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newEventDetails: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventInfoText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
    flex: 1,
  },
  travelStatusContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  travelStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  travelStatusText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  nextEventBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  modalPlaceholderText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});