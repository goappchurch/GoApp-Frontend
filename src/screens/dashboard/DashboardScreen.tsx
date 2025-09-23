import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.roleText}>Speaker</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color="#2563eb" />
            </View>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Upcoming Events</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
            </View>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="airplane" size={24} color="#dc2626" />
            </View>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Travel Plans</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="add-circle" size={32} color="#2563eb" />
              <Text style={styles.actionText}>New Event</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="document-text" size={32} color="#2563eb" />
              <Text style={styles.actionText}>Add Document</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="mic" size={32} color="#2563eb" />
              <Text style={styles.actionText}>Voice Note</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="list" size={32} color="#2563eb" />
              <Text style={styles.actionText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Events</Text>
          <View style={styles.eventsList}>
            <View style={styles.eventItem}>
              <View style={styles.eventDate}>
                <Text style={styles.eventDateDay}>15</Text>
                <Text style={styles.eventDateMonth}>Jan</Text>
              </View>
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>Sunday Morning Service</Text>
                <Text style={styles.eventVenue}>Local Church, Chennai</Text>
                <Text style={styles.eventTime}>9:00 AM - 11:00 AM</Text>
              </View>
              <View style={styles.eventStatus}>
                <View style={[styles.statusBadge, styles.statusConfirmed]}>
                  <Text style={styles.statusText}>Confirmed</Text>
                </View>
              </View>
            </View>

            <View style={styles.eventItem}>
              <View style={styles.eventDate}>
                <Text style={styles.eventDateDay}>22</Text>
                <Text style={styles.eventDateMonth}>Jan</Text>
              </View>
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>Youth Conference</Text>
                <Text style={styles.eventVenue}>City Hall, Bangalore</Text>
                <Text style={styles.eventTime}>6:00 PM - 9:00 PM</Text>
              </View>
              <View style={styles.eventStatus}>
                <View style={[styles.statusBadge, styles.statusDraft]}>
                  <Text style={styles.statusText}>Draft</Text>
                </View>
              </View>
            </View>
          </View>
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
    marginBottom: 24,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  eventsList: {
    paddingHorizontal: 20,
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
});