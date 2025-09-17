export type UserRole = 'speaker' | 'assistant';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  timezone: string;
  status: 'draft' | 'confirmed' | 'cancelled' | 'completed';
  venue_name?: string;
  venue_address?: string;
  venue_contact?: Record<string, any>;
  speaking_topic?: string;
  expected_audience?: number;
  preparation_status: number;
  financial_details?: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TravelSegment {
  id: string;
  event_id: string;
  segment_type: 'flight' | 'hotel' | 'transport';
  direction?: 'outbound' | 'return' | 'local';
  details: Record<string, any>;
  booking_status: 'pending' | 'booked' | 'confirmed' | 'cancelled';
  booking_reference?: string;
  created_at: string;
}

export interface VoiceNote {
  id: string;
  event_id: string;
  title?: string;
  audio_url: string;
  duration_seconds?: number;
  transcript?: string;
  ai_summary?: string;
  location?: string;
  created_by: string;
  created_at: string;
}

export interface Document {
  id: string;
  event_id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  category: 'travel' | 'event' | 'identity' | 'financial' | 'other';
  ocr_text?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_by: string;
  created_at: string;
  completed_at?: string;
}

export interface Expense {
  id: string;
  event_id: string;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  receipt_url?: string;
  expense_date: string;
  reimbursement_status: 'pending' | 'approved' | 'reimbursed';
  created_by: string;
  created_at: string;
}