import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { EventsStackParamList } from '../../navigation/AppNavigator';
import { apiService } from '../../services/api';
import { Event } from '../../services/api';

type EventDetailRouteProp = RouteProp<EventsStackParamList, 'EventDetail'>;

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const route = useRoute<EventDetailRouteProp>();
  const navigation = useNavigation();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [route.params?.eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getEvent(route.params.eventId);
      setEvent(response.event);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load event details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'draft': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      case 'completed': return '#6366f1';
      default: return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const startTime = formatDate(event.startDatetime);
  const endTime = formatDate(event.endDatetime);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Poster */}
        {event.eventDescription && (
          <View style={styles.posterContainer}>
            <View style={styles.posterPlaceholder}>
              <Ionicons name="image" size={48} color="#64748b" />
              <Text style={styles.posterText}>Event Poster</Text>
              <Text style={styles.posterSubtext}>Coming Soon</Text>
            </View>
          </View>
        )}

        {/* Event Header */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
              <Text style={styles.statusText}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.eventType}>{event.eventType}</Text>
        </View>

        {/* Two-Column Info Layout */}
        <View style={styles.infoGrid}>
          {/* Date & Time Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="calendar" size={20} color="#2563eb" />
              <Text style={styles.infoTitle}>Date & Time</Text>
            </View>
            <Text style={styles.infoText}>{startTime.date}</Text>
            <Text style={styles.infoSubtext}>
              {startTime.time} - {endTime.time}
            </Text>
            <Text style={styles.timezoneText}>Timezone: {event.timezone}</Text>
          </View>

          {/* Venue Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="location" size={20} color="#2563eb" />
              <Text style={styles.infoTitle}>Venue</Text>
            </View>
            <Text style={styles.infoText}>{event.venueName || 'TBD'}</Text>
            <Text style={styles.infoSubtext}>{event.venueAddress || 'Address TBD'}</Text>
            {event.expectedAudience && (
              <Text style={styles.audienceText}>~{event.expectedAudience} people</Text>
            )}
          </View>

          {/* Speaking Topic Card */}
          {event.speakingTopic && (
            <View style={[styles.infoCard, styles.fullWidth]}>
              <View style={styles.infoHeader}>
                <Ionicons name="mic" size={20} color="#2563eb" />
                <Text style={styles.infoTitle}>Speaking Topic</Text>
              </View>
              <Text style={styles.infoText}>{event.speakingTopic}</Text>
            </View>
          )}

          {/* Description Card */}
          {event.eventDescription && (
            <View style={[styles.infoCard, styles.fullWidth]}>
              <View style={styles.infoHeader}>
                <Ionicons name="document-text" size={20} color="#2563eb" />
                <Text style={styles.infoTitle}>Description</Text>
              </View>
              <Text style={styles.infoText}>{event.eventDescription}</Text>
            </View>
          )}

          {/* Contact Person Card */}
          {(event.contactPersonName || event.contactPersonPhone || event.contactPersonEmail) && (
            <View style={[styles.infoCard, styles.fullWidth]}>
              <View style={styles.infoHeader}>
                <Ionicons name="person" size={20} color="#2563eb" />
                <Text style={styles.infoTitle}>Contact Person</Text>
              </View>
              {event.contactPersonName && (
                <Text style={styles.infoText}>{event.contactPersonName}</Text>
              )}
              {event.contactPersonPhone && (
                <Text style={styles.infoSubtext}>{event.contactPersonPhone}</Text>
              )}
              {event.contactPersonEmail && (
                <Text style={styles.infoSubtext}>{event.contactPersonEmail}</Text>
              )}
            </View>
          )}

          {/* Travel Management */}
          {(event.flightBookingRequired || event.hotelBookingRequired) && (
            <View style={[styles.infoCard, styles.fullWidth]}>
              <View style={styles.infoHeader}>
                <Ionicons name="airplane" size={20} color="#2563eb" />
                <Text style={styles.infoTitle}>Travel & Accommodation</Text>
              </View>

              {event.flightBookingRequired && (
                <View style={styles.travelItem}>
                  <Text style={styles.travelLabel}>Flight Booking:</Text>
                  <View style={[styles.travelStatus, { backgroundColor:
                    event.flightBookingStatus === 'confirmed' ? '#dcfce7' :
                    event.flightBookingStatus === 'booked' ? '#fef3c7' : '#fee2e2'
                  }]}>
                    <Text style={[styles.travelStatusText, { color:
                      event.flightBookingStatus === 'confirmed' ? '#16a34a' :
                      event.flightBookingStatus === 'booked' ? '#d97706' : '#dc2626'
                    }]}>
                      {event.flightBookingStatus || 'Not booked'}
                    </Text>
                  </View>
                </View>
              )}

              {event.hotelBookingRequired && (
                <View style={styles.travelItem}>
                  <Text style={styles.travelLabel}>Hotel Booking:</Text>
                  <View style={[styles.travelStatus, { backgroundColor:
                    event.hotelBookingStatus === 'confirmed' ? '#dcfce7' :
                    event.hotelBookingStatus === 'booked' ? '#fef3c7' : '#fee2e2'
                  }]}>
                    <Text style={[styles.travelStatusText, { color:
                      event.hotelBookingStatus === 'confirmed' ? '#16a34a' :
                      event.hotelBookingStatus === 'booked' ? '#d97706' : '#dc2626'
                    }]}>
                      {event.hotelBookingStatus || 'Not booked'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Preparation Notes */}
          {event.preparationNotes && (
            <View style={[styles.infoCard, styles.fullWidth]}>
              <View style={styles.infoHeader}>
                <Ionicons name="clipboard" size={20} color="#2563eb" />
                <Text style={styles.infoTitle}>Preparation Notes</Text>
              </View>
              <Text style={styles.infoText}>{event.preparationNotes}</Text>
            </View>
          )}
        </View>

        {/* Edit Button */}
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit Event</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  posterContainer: {
    height: 200,
    marginBottom: 16,
  },
  posterPlaceholder: {
    height: 200,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  posterText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
  },
  posterSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 16,
  },
  eventType: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: (width - 48) / 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fullWidth: {
    width: width - 40,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  timezoneText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  audienceText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
    marginTop: 4,
  },
  travelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  travelLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  travelStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  travelStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});