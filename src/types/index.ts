export type UserRole = 'boss' | 'assistant' | 'viewer';

export type EventType =
  | 'sunday_service'
  | 'youth_conference'
  | 'workshop'
  | 'wedding'
  | 'special_event';

export type NoteType = 'text' | 'voice';

export type DocumentCategory =
  | 'flight_ticket'
  | 'hotel_booking'
  | 'invitation'
  | 'visa'
  | 'other';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Contact {
  id: string;
  full_name: string;
  church_name?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  city?: string;
  country?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  event_type: EventType;
  date_start: string;
  date_end?: string;
  timezone: string;
  speaking_topic?: string;
  expected_audience?: number;
  companions?: string[];
  poster_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  venue?: Venue;
  organizer?: EventOrganizer;
  travel?: Travel;
  accommodation?: Accommodation;
}

export interface Venue {
  id: string;
  event_id: string;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  region?: string;
  lat?: number;
  lng?: number;
}

export interface EventOrganizer {
  id: string;
  event_id: string;
  contact_id?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface Travel {
  id: string;
  event_id: string;
  flight_booked: boolean;
  boarding_point?: string;
  deboarding_point?: string;
  flight_number?: string;
  airline?: string;
  departure_time?: string;
  checkin_time?: string;
  arrival_time?: string;
  flight_ticket_url?: string;
  return_flight_booked?: boolean;
  return_boarding_point?: string;
  return_deboarding_point?: string;
  return_flight_number?: string;
  return_airline?: string;
  return_departure_time?: string;
  return_checkin_time?: string;
  return_arrival_time?: string;
  return_ticket_pdf_url?: string;
}

export interface Accommodation {
  id: string;
  event_id: string;
  hotel_name?: string;
  address?: string;
  check_in?: string;
  check_out?: string;
  booking_url?: string;
}

export interface Note {
  id: string;
  event_id?: string;
  author_id: string;
  type: NoteType;
  content?: string;
  voice_url?: string;
  duration_seconds?: number;
  created_at: string;
  author?: User;
}

export interface Document {
  id: string;
  event_id: string;
  uploaded_by: string;
  category: DocumentCategory;
  file_url: string;
  file_name?: string;
  created_at: string;
}

export interface Task {
  id: string;
  event_id: string;
  title: string;
  completed: boolean;
  due_date?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  event_id?: string;
  read: boolean;
  created_at: string;
}

export interface EventFormData {
  title: string;
  event_type: EventType;
  date_start: string;
  date_end?: string;
  timezone: string;
  speaking_topic?: string;
  expected_audience?: number;
  companions?: string[];
  poster_url?: string;
  // venue
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_country?: string;
  venue_region?: string;
  // organizer
  organizer_name?: string;
  organizer_phone?: string;
  organizer_email?: string;
  contact_id?: string;
  // travel (outbound)
  flight_booked?: boolean;
  boarding_point?: string;
  deboarding_point?: string;
  flight_number?: string;
  airline?: string;
  departure_time?: string;
  flight_checkin_time?: string;
  arrival_time?: string;
  ticket_pdf_url?: string;
  // travel (return)
  return_flight_booked?: boolean;
  return_boarding_point?: string;
  return_deboarding_point?: string;
  return_flight_number?: string;
  return_airline?: string;
  return_departure_time?: string;
  return_flight_checkin_time?: string;
  return_arrival_time?: string;
  return_ticket_pdf_url?: string;
  // accommodation
  hotel_name?: string;
  hotel_address?: string;
  check_in?: string;
  check_out?: string;
}
