import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';

type CreateEventScreenNavigationProp = NativeStackNavigationProp<EventsStackParamList, 'CreateEvent'>;

interface Props {
  navigation: CreateEventScreenNavigationProp;
}

const PREDEFINED_EVENT_TYPES = [
  'Sunday Service',
  'Conference',
  'Wedding',
  'Youth Event',
  'Retreat',
  'Bible Study',
  'Seminar',
  'Workshop',
  'Special Service',
  'Revival',
  'Custom' // This will show the custom input
];

const BOOKING_STATUSES = [
  { label: 'Not Booked', value: 'not_booked' },
  { label: 'Booked', value: 'booked' },
  { label: 'Confirmed', value: 'confirmed' },
];

export default function CreateEventScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Basic Event Info
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Sunday Service');
  const [customEventType, setCustomEventType] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata'); // Auto-detected
  const [status, setStatus] = useState<'draft' | 'confirmed'>('draft');

  // Venue Details
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [speakingTopic, setSpeakingTopic] = useState('');
  const [expectedAudience, setExpectedAudience] = useState('');

  // Additional Info
  const [eventDescription, setEventDescription] = useState('');
  const [preparationNotes, setPreparationNotes] = useState('');

  // Contact Person
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Travel Management
  const [flightRequired, setFlightRequired] = useState(false);
  const [flightStatus, setFlightStatus] = useState<'not_booked' | 'booked' | 'confirmed'>('not_booked');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [isReturnTicket, setIsReturnTicket] = useState(false);

  const [hotelRequired, setHotelRequired] = useState(false);
  const [hotelStatus, setHotelStatus] = useState<'not_booked' | 'booked' | 'confirmed'>('not_booked');
  const [hotelName, setHotelName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');

  // File uploads
  const [eventPoster, setEventPoster] = useState<string | null>(null);
  const [flightTicket, setFlightTicket] = useState<string | null>(null);
  const [hotelBooking, setHotelBooking] = useState<string | null>(null);

  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState<string>('');
  const [currentTimeField, setCurrentTimeField] = useState<string>('');

  useEffect(() => {
    // Auto-detect timezone
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone);
  }, []);

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter event title');
      return false;
    }

    if (eventType === 'Custom' && !customEventType.trim()) {
      Alert.alert('Error', 'Please enter custom event type');
      return false;
    }

    if (!startDateTime) {
      Alert.alert('Error', 'Please select start date and time');
      return false;
    }

    if (!endDateTime) {
      Alert.alert('Error', 'Please select end date and time');
      return false;
    }

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      Alert.alert('Error', 'End time must be after start time');
      return false;
    }

    return true;
  };

  const formatDateTimeForAPI = (dateTimeString: string): string => {
    try {
      console.log('Input dateTimeString:', dateTimeString);

      // If the string is already in ISO format, return as is
      if (dateTimeString.includes('T') && dateTimeString.includes('Z')) {
        return dateTimeString;
      }

      // If it's in format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM", parse it
      if (dateTimeString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)) {
        const isoString = new Date(dateTimeString).toISOString();
        console.log('Formatted from YYYY-MM-DD HH:MM:', isoString);
        return isoString;
      }

      // If it's just a date "YYYY-MM-DD", add current time
      if (dateTimeString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
        const combined = `${dateTimeString} ${timeString}`;
        const isoString = new Date(combined).toISOString();
        console.log('Formatted from date only:', isoString);
        return isoString;
      }

      // Handle DD/MM/YYYY or MM/DD/YYYY formats (localized dates)
      if (dateTimeString.includes('/')) {
        const parts = dateTimeString.split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || '12:00:00';

        // Try parsing as DD/MM/YYYY
        const dateSegments = datePart.split('/');
        if (dateSegments.length === 3) {
          const [day, month, year] = dateSegments;
          const properDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const combined = `${properDate} ${timePart}`;
          const isoString = new Date(combined).toISOString();
          console.log('Formatted from DD/MM/YYYY:', isoString);
          return isoString;
        }
      }

      // Try parsing directly if it's a recognized format
      const parsed = new Date(dateTimeString);
      if (!isNaN(parsed.getTime())) {
        const isoString = parsed.toISOString();
        console.log('Directly parsed:', isoString);
        return isoString;
      }

      // Fallback to current date if parsing fails
      console.warn('Failed to parse date, using current date:', dateTimeString);
      return new Date().toISOString();
    } catch (error) {
      console.warn('Date formatting error:', error);
      return new Date().toISOString();
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const finalEventType = eventType === 'Custom' ? customEventType : eventType;

      const eventData = {
        title: title.trim(),
        eventType: finalEventType,
        startDatetime: formatDateTimeForAPI(startDateTime),
        endDatetime: formatDateTimeForAPI(endDateTime),
        timezone,
        status,
        venueName: venueName.trim() || undefined,
        venueAddress: venueAddress.trim() || undefined,
        speakingTopic: speakingTopic.trim() || undefined,
        expectedAudience: expectedAudience ? parseInt(expectedAudience) : undefined,
        eventDescription: eventDescription.trim() || undefined,
        contactPersonName: contactName.trim() || undefined,
        contactPersonPhone: contactPhone.trim() || undefined,
        contactPersonEmail: contactEmail.trim() || undefined,
        preparationNotes: preparationNotes.trim() || undefined,
        flightBookingRequired: flightRequired,
        flightBookingStatus: flightRequired ? flightStatus : undefined,
        hotelBookingRequired: hotelRequired,
        hotelBookingStatus: hotelRequired ? hotelStatus : undefined,
        // File URLs will be added after upload implementation
      };

      await apiService.createEvent(eventData);

      Alert.alert(
        'Success',
        'Event created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const pickDate = (field: string) => {
    setCurrentDateField(field);
    setShowDatePicker(true);
  };

  const pickTime = (field: string) => {
    setCurrentTimeField(field);
    setShowTimePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && currentDateField) {
      // Format date as YYYY-MM-DD for database compatibility
      const dateString = selectedDate.toISOString().split('T')[0];
      const displayDate = selectedDate.toLocaleDateString();

      switch (currentDateField) {
        case 'Start':
          setStartDateTime(prev => {
            const time = prev.split(' ')[1] || '';
            return time ? `${dateString} ${time}` : dateString;
          });
          break;
        case 'End':
          setEndDateTime(prev => {
            const time = prev.split(' ')[1] || '';
            return time ? `${dateString} ${time}` : dateString;
          });
          break;
        case 'Departure':
          setDepartureDate(displayDate);
          break;
        case 'Return':
          setReturnDate(displayDate);
          break;
        case 'Check-in':
          setCheckInDate(displayDate);
          break;
        case 'Check-out':
          setCheckOutDate(displayDate);
          break;
      }
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && currentTimeField) {
      // Format time as HH:MM:SS for database compatibility
      const timeString = selectedTime.toTimeString().split(' ')[0];
      const displayTime = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      switch (currentTimeField) {
        case 'Start':
          setStartDateTime(prev => {
            const date = prev.split(' ')[0] || '';
            return date ? `${date} ${timeString}` : timeString;
          });
          break;
        case 'End':
          setEndDateTime(prev => {
            const date = prev.split(' ')[0] || '';
            return date ? `${date} ${timeString}` : timeString;
          });
          break;
        case 'Departure':
          setDepartureTime(displayTime);
          break;
        case 'Return':
          setReturnTime(displayTime);
          break;
        case 'Check-in':
          setCheckInTime(displayTime);
          break;
        case 'Check-out':
          setCheckOutTime(displayTime);
          break;
      }
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library permission to upload images');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setEventPoster(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async (type: 'flight' | 'hotel') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'flight') {
          setFlightTicket(result.assets[0].uri);
        } else {
          setHotelBooking(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeFile = (type: 'poster' | 'flight' | 'hotel') => {
    switch (type) {
      case 'poster':
        setEventPoster(null);
        break;
      case 'flight':
        setFlightTicket(null);
        break;
      case 'hotel':
        setHotelBooking(null);
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header with Blue Background */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Ionicons name="calendar" size={32} color="#fff" />
              </View>
              <Text style={styles.title}>Create New Event</Text>
              <Text style={styles.subtitle}>Plan your next speaking engagement</Text>
            </View>
          </View>

          <View style={styles.form}>
            {/* Basic Event Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="calendar" size={20} color="#2563eb" />
                </View>
                <Text style={styles.sectionTitle}>Event Information</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Event Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Sunday Morning Service"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Event Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={eventType}
                    onValueChange={(value) => setEventType(value)}
                    style={styles.picker}
                  >
                    {PREDEFINED_EVENT_TYPES.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              </View>

              {eventType === 'Custom' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Custom Event Type *</Text>
                  <TextInput
                    style={styles.input}
                    value={customEventType}
                    onChangeText={setCustomEventType}
                    placeholder="Enter your custom event type"
                    maxLength={50}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Start Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity style={[styles.dateButton, { flex: 1, marginRight: 8 }]} onPress={() => pickDate('Start')}>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    <Text style={styles.dateButtonText}>
                      {startDateTime.split(' ')[0] || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dateButton, { flex: 1, marginLeft: 8 }]} onPress={() => pickTime('Start')}>
                    <Ionicons name="time-outline" size={20} color="#6b7280" />
                    <Text style={styles.dateButtonText}>
                      {startDateTime.split(' ')[1] || 'Select time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>End Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity style={[styles.dateButton, { flex: 1, marginRight: 8 }]} onPress={() => pickDate('End')}>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    <Text style={styles.dateButtonText}>
                      {endDateTime.split(' ')[0] || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dateButton, { flex: 1, marginLeft: 8 }]} onPress={() => pickTime('End')}>
                    <Ionicons name="time-outline" size={20} color="#6b7280" />
                    <Text style={styles.dateButtonText}>
                      {endDateTime.split(' ')[1] || 'Select time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Event Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={eventDescription}
                  onChangeText={setEventDescription}
                  placeholder="Describe your event, theme, special notes..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Event Poster</Text>
                {eventPoster ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: eventPoster }} style={styles.imagePreview} />
                    <View style={styles.imagePreviewOverlay}>
                      <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                        <Ionicons name="pencil" size={16} color="#fff" />
                        <Text style={styles.changeImageText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.removeImageButton} onPress={() => removeFile('poster')}>
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.removeImageText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.fileButton} onPress={pickImage}>
                    <Ionicons name="image-outline" size={24} color="#2563eb" />
                    <Text style={styles.fileButtonText}>Upload Event Poster</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Venue Details */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="location" size={20} color="#2563eb" />
                </View>
                <Text style={styles.sectionTitle}>Venue Details</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Venue Name</Text>
                <TextInput
                  style={styles.input}
                  value={venueName}
                  onChangeText={setVenueName}
                  placeholder="e.g. Grace Community Church"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Venue Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={venueAddress}
                  onChangeText={setVenueAddress}
                  placeholder="Full address with city, state, country"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Speaking Topic</Text>
                <TextInput
                  style={styles.input}
                  value={speakingTopic}
                  onChangeText={setSpeakingTopic}
                  placeholder="e.g. Faith and Hope in Difficult Times"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Expected Audience Size</Text>
                <TextInput
                  style={styles.input}
                  value={expectedAudience}
                  onChangeText={setExpectedAudience}
                  placeholder="e.g. 200"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Contact Person */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="person" size={20} color="#2563eb" />
                </View>
                <Text style={styles.sectionTitle}>Contact Person</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Contact Name</Text>
                <TextInput
                  style={styles.input}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Primary contact person"
                />
              </View>

              <View style={styles.dateTimeRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="+91 XXXXX XXXXX"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    placeholder="contact@church.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            {/* Travel Management */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="airplane" size={20} color="#2563eb" />
                </View>
                <Text style={styles.sectionTitle}>Travel Management</Text>
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Flight Booking Required</Text>
                  <Switch
                    value={flightRequired}
                    onValueChange={setFlightRequired}
                    trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                    thumbColor={flightRequired ? '#2563eb' : '#9ca3af'}
                  />
                </View>
              </View>

              {flightRequired && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Flight Booking Status</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={flightStatus}
                        onValueChange={(value) => setFlightStatus(value)}
                        style={styles.picker}
                      >
                        {BOOKING_STATUSES.map((status) => (
                          <Picker.Item key={status.value} label={status.label} value={status.value} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.dateTimeRow}>
                    <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.label}>Departure Airport</Text>
                      <TextInput
                        style={styles.input}
                        value={departureAirport}
                        onChangeText={setDepartureAirport}
                        placeholder="e.g. Chennai (MAA)"
                      />
                    </View>

                    <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.label}>Arrival Airport</Text>
                      <TextInput
                        style={styles.input}
                        value={arrivalAirport}
                        onChangeText={setArrivalAirport}
                        placeholder="e.g. Mumbai (BOM)"
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Departure Date & Time</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity style={[styles.dateButton, { flex: 1, marginRight: 8 }]} onPress={() => pickDate('Departure')}>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                        <Text style={styles.dateButtonText}>
                          {departureDate || 'Select date'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.dateButton, { flex: 1, marginLeft: 8 }]} onPress={() => pickTime('Departure')}>
                        <Ionicons name="time-outline" size={20} color="#6b7280" />
                        <Text style={styles.dateButtonText}>
                          {departureTime || 'Select time'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.switchContainer}>
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Return Ticket</Text>
                      <Switch
                        value={isReturnTicket}
                        onValueChange={setIsReturnTicket}
                        trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                        thumbColor={isReturnTicket ? '#2563eb' : '#9ca3af'}
                      />
                    </View>
                  </View>

                  {isReturnTicket && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Return Date & Time</Text>
                      <View style={styles.dateTimeRow}>
                        <TouchableOpacity style={[styles.dateButton, { flex: 1, marginRight: 8 }]} onPress={() => pickDate('Return')}>
                          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                          <Text style={styles.dateButtonText}>
                            {returnDate || 'Select date'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.dateButton, { flex: 1, marginLeft: 8 }]} onPress={() => pickTime('Return')}>
                          <Ionicons name="time-outline" size={20} color="#6b7280" />
                          <Text style={styles.dateButtonText}>
                            {returnTime || 'Select time'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {(flightStatus === 'booked' || flightStatus === 'confirmed') && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Flight Ticket</Text>
                      {flightTicket ? (
                        <View style={styles.filePreviewContainer}>
                          <View style={styles.filePreview}>
                            <Ionicons name="document" size={24} color="#2563eb" />
                            <Text style={styles.filePreviewText}>Flight ticket uploaded</Text>
                            <TouchableOpacity onPress={() => removeFile('flight')}>
                              <Ionicons name="close-circle" size={20} color="#dc2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.fileButton} onPress={() => pickDocument('flight')}>
                          <Ionicons name="document-outline" size={24} color="#2563eb" />
                          <Text style={styles.fileButtonText}>Upload Flight Ticket</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}

              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Hotel Booking Required</Text>
                  <Switch
                    value={hotelRequired}
                    onValueChange={setHotelRequired}
                    trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                    thumbColor={hotelRequired ? '#2563eb' : '#9ca3af'}
                  />
                </View>
              </View>

              {hotelRequired && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Hotel Booking Status</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={hotelStatus}
                        onValueChange={(value) => setHotelStatus(value)}
                        style={styles.picker}
                      >
                        {BOOKING_STATUSES.map((status) => (
                          <Picker.Item key={status.value} label={status.label} value={status.value} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Hotel Name</Text>
                    <TextInput
                      style={styles.input}
                      value={hotelName}
                      onChangeText={setHotelName}
                      placeholder="e.g. Grand Hyatt Mumbai"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Check-in Date & Time</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity style={[styles.dateButton, { flex: 1, marginRight: 8 }]} onPress={() => pickDate('Check-in')}>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                        <Text style={styles.dateButtonText}>
                          {checkInDate || 'Select date'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.dateButton, { flex: 1, marginLeft: 8 }]} onPress={() => pickTime('Check-in')}>
                        <Ionicons name="time-outline" size={20} color="#6b7280" />
                        <Text style={styles.dateButtonText}>
                          {checkInTime || 'Select time'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Check-out Date & Time</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity style={[styles.dateButton, { flex: 1, marginRight: 8 }]} onPress={() => pickDate('Check-out')}>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                        <Text style={styles.dateButtonText}>
                          {checkOutDate || 'Select date'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.dateButton, { flex: 1, marginLeft: 8 }]} onPress={() => pickTime('Check-out')}>
                        <Ionicons name="time-outline" size={20} color="#6b7280" />
                        <Text style={styles.dateButtonText}>
                          {checkOutTime || 'Select time'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {(hotelStatus === 'booked' || hotelStatus === 'confirmed') && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Hotel Booking Confirmation</Text>
                      {hotelBooking ? (
                        <View style={styles.filePreviewContainer}>
                          <View style={styles.filePreview}>
                            <Ionicons name="document" size={24} color="#2563eb" />
                            <Text style={styles.filePreviewText}>Hotel booking uploaded</Text>
                            <TouchableOpacity onPress={() => removeFile('hotel')}>
                              <Ionicons name="close-circle" size={20} color="#dc2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.fileButton} onPress={() => pickDocument('hotel')}>
                          <Ionicons name="document-outline" size={24} color="#2563eb" />
                          <Text style={styles.fileButtonText}>Upload Hotel Booking</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Preparation Notes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="document-text" size={20} color="#2563eb" />
                </View>
                <Text style={styles.sectionTitle}>Preparation Notes</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Notes & Reminders</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={preparationNotes}
                  onChangeText={setPreparationNotes}
                  placeholder="Special requirements, preparation tasks, reminders..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Event Status */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                </View>
                <Text style={styles.sectionTitle}>Event Status</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={status}
                    onValueChange={(value) => setStatus(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Draft" value="draft" />
                    <Picker.Item label="Confirmed" value="confirmed" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Submit Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <View style={styles.submitButtonContent}>
                  {loading && (
                    <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />
                  )}
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Creating...' : 'Create Event'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginTop: -20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    minHeight: 80,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    height: 50,
    color: '#1e293b',
  },
  dateTimeRow: {
    flexDirection: 'row',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6b7280',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  fileButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  switchContainer: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
    paddingHorizontal: 4,
    gap: 16,
    alignItems: 'stretch',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonLoader: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  imagePreviewOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  filePreviewContainer: {
    marginTop: 8,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  filePreviewText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
  },
});